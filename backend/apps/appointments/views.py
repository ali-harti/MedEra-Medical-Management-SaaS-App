from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from .models import Appointment
from .serializers import (
    AppointmentSerializer, 
    AppointmentListSerializer, 
    AppointmentStatusSerializer
)

from apps.authentication.permissions import IsMedicalStaff

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().select_related('patient', 'doctor')
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['appointment_type', 'doctor', 'patient']
    ordering_fields = ['start_datetime', 'created_at']
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset().order_by('-start_datetime')
        user = self.request.user

        if not user.is_authenticated:
            return qs.none()

        if hasattr(user, 'patient_record'):
            qs = qs.filter(patient=user.patient_record)
        else:
            cabinet_doctor = user.get_cabinet_doctor()
            if cabinet_doctor:
                qs = qs.filter(doctor=cabinet_doctor)
            else:
                qs = qs.none()
            
        date_param = self.request.query_params.get('date')
        if date_param:
            qs = qs.filter(start_datetime__date=date_param)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(start_datetime__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(start_datetime__date__lte=date_to)

        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = status_param.split(',')
            qs = qs.filter(status__in=statuses)

        return qs


    def get_serializer_class(self):
        if self.action == 'list':
            return AppointmentListSerializer
        return AppointmentSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Check for conflict code in errors
            # DRF ValidationError might have detail as a dict
            if hasattr(e, 'detail') and isinstance(e.detail, dict) and e.detail.get('code') == ['conflict']:
                return Response(e.detail, status=status.HTTP_409_CONFLICT)
            raise
            
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'patient_record'):
            appointment = serializer.save(
                created_by=user,
                patient=user.patient_record
            )
            doctor = appointment.doctor
        else:
            doctor = user.get_cabinet_doctor()
            appointment = serializer.save(
                created_by=user,
                doctor=doctor
            )

        # Real-time broadcast to the whole cabinet
        try:
            from apps.core.broadcast import create_and_broadcast_notification
            patient_name = f"{appointment.patient.first_name} {appointment.patient.last_name}" if appointment.patient else 'Unknown'
            create_and_broadcast_notification(
                recipient=doctor,
                cabinet_doctor=doctor,
                notif_type='APPOINTMENT',
                title='New Appointment Booked',
                message=f'{patient_name} — {appointment.start_datetime.strftime("%d/%m/%Y at %H:%M")}',
                action_url='/doctor/appointments',
            )
        except Exception:
            pass

    @action(detail=False, methods=['get'], url_path='available-slots')
    def available_slots(self, request):
        """
        Calculates available slots for a doctor on a specific date.
        Query params: doctor_id, date (YYYY-MM-DD), duration (mins)
        """
        from datetime import datetime, date as date_obj, time, timedelta
        from django.utils import timezone
        from apps.availability.models import DoctorAvailability
        
        doctor_id = request.query_params.get('doctor_id')
        target_date_str = request.query_params.get('date')
        duration = int(request.query_params.get('duration', 30))
        
        if not doctor_id or not target_date_str:
            return Response(
                {'detail': 'doctor_id and date are required.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get doctor's availability for that day
        day_of_week = target_date.weekday()
        availability = DoctorAvailability.objects.filter(
            doctor_id=doctor_id, 
            day_of_week=day_of_week, 
            is_active=True
        ).first()
        
        if not availability:
            return Response([])

        # Generate candidates
        slots = []
        current_time = datetime.combine(target_date, availability.start_time)
        end_limit = datetime.combine(target_date, availability.end_time)
        
        now_plus_slack = timezone.now() + timedelta(minutes=15)
        naive_now = now_plus_slack.replace(tzinfo=None)
        
        # Get existing appointments to check overlaps
        existing_appointments = Appointment.objects.filter(
            doctor_id=doctor_id,
            start_datetime__date=target_date,
            status__in=['REQUESTED', 'PLANNED', 'CONFIRMED']
        ).values('start_datetime', 'end_datetime')

        while current_time + timedelta(minutes=duration) <= end_limit:
            slot_start = current_time
            slot_end = current_time + timedelta(minutes=duration)
            
            # Intersection check
            overlap = False
            for appt in existing_appointments:
                appt_start = appt['start_datetime'].replace(tzinfo=None)
                appt_end = appt['end_datetime'].replace(tzinfo=None)
                if slot_start < appt_end and slot_end > appt_start:
                    overlap = True
                    break
            
            # Past check
            is_past = False
            if target_date == timezone.now().date():
                if slot_start < naive_now:
                    is_past = True
            
            is_available = not overlap and not is_past

            slots.append({
                'start_datetime': slot_start.isoformat(),
                'end_datetime': slot_end.isoformat(),
                'is_available': is_available
            })
            
            # Step by duration for granularity
            current_time += timedelta(minutes=duration)
            
        return Response(slots)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        appointment.transition_to('CONFIRMED')
        try:
            from apps.core.broadcast import broadcast_to_cabinet, create_and_broadcast_notification
            broadcast_to_cabinet(
                str(appointment.doctor_id),
                'APPOINTMENT_UPDATED',
                {'id': str(appointment.id), 'status': 'CONFIRMED'}
            )
            # Notify patient
            if appointment.patient and appointment.patient.user:
                create_and_broadcast_notification(
                    recipient=appointment.patient.user,
                    cabinet_doctor=None,
                    notif_type='APPOINTMENT',
                    title='Rendez-vous confirmé',
                    message=f'Votre rendez-vous avec Dr. {appointment.doctor.last_name} a été confirmé pour le {appointment.start_datetime.strftime("%d/%m/%Y à %H:%M")}.',
                    action_url='/patient/appointments'
                )
        except Exception:
            pass
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        reason = request.data.get('reason')
        if not reason:
            return Response({'detail': 'Raison requise.'}, status=status.HTTP_400_BAD_REQUEST)
        appointment = self.get_object()
        appointment.transition_to('CANCELLED', reason=reason)
        try:
            from apps.core.broadcast import broadcast_to_cabinet, create_and_broadcast_notification
            broadcast_to_cabinet(
                str(appointment.doctor_id),
                'APPOINTMENT_UPDATED',
                {'id': str(appointment.id), 'status': 'CANCELLED'}
            )
            # Notify patient if cancelled by doctor/secretary
            if appointment.patient and appointment.patient.user and request.user.role != 'PATIENT':
                create_and_broadcast_notification(
                    recipient=appointment.patient.user,
                    cabinet_doctor=None,
                    notif_type='APPOINTMENT',
                    title='Rendez-vous annulé',
                    message=f'Votre rendez-vous avec Dr. {appointment.doctor.last_name} du {appointment.start_datetime.strftime("%d/%m/%Y")} a été annulé.',
                    action_url='/patient/appointments'
                )
        except Exception:
            pass
        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        appointment = self.get_object()
        serializer = AppointmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            appointment.transition_to(
                serializer.validated_data['status'],
                reason=serializer.validated_data.get('cancellation_reason')
            )
            return Response(AppointmentSerializer(appointment).data)
        except ValidationError as e:
            return Response({'detail': list(e.messages)[0]}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='accept-demand')
    def accept_demand(self, request, pk=None):
        """
        Secretary accepts a REQUESTED appointment → moves to PLANNED.
        Sends a WhatsApp confirmation message to the patient.
        """
        import requests as http_requests
        appointment = self.get_object()
        if appointment.status != 'REQUESTED':
            return Response({'detail': 'Ce rendez-vous n\'est pas en attente.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            appointment.transition_to('PLANNED')
        except ValidationError as e:
            return Response({'detail': list(e.messages)[0]}, status=status.HTTP_400_BAD_REQUEST)

        # Send WhatsApp confirmation
        try:
            from django.conf import settings
            patient = appointment.patient
            doctor = appointment.doctor
            if patient.phone:
                whatsapp_url = f"{getattr(settings, 'WHATSAPP_AGENT_URL', 'http://whatsapp_agent:8001')}/send-notification"
                payload = {
                    "whatsapp_number": patient.phone,
                    "event": "appointment_confirmed",
                    "appointment_datetime": appointment.start_datetime.strftime('%d/%m/%Y à %H:%M'),
                    "doctor_name": f"Dr. {doctor.last_name}"
                }
                http_requests.post(whatsapp_url, json=payload, timeout=10)
        except Exception as e:
            print(f"WhatsApp notification failed: {e}")
            pass  # Do not block response if WhatsApp fails

        try:
            from apps.core.broadcast import broadcast_to_cabinet, create_and_broadcast_notification
            broadcast_to_cabinet(str(appointment.doctor_id), 'APPOINTMENT_UPDATED', {'id': str(appointment.id), 'status': 'PLANNED'})
            
            # Notify patient
            if appointment.patient and appointment.patient.user:
                create_and_broadcast_notification(
                    recipient=appointment.patient.user,
                    cabinet_doctor=None,
                    notif_type='APPOINTMENT',
                    title='Demande acceptée',
                    message=f'Votre demande de rendez-vous avec Dr. {appointment.doctor.last_name} pour le {appointment.start_datetime.strftime("%d/%m/%Y à %H:%M")} a été acceptée.',
                    action_url='/patient/appointments'
                )
        except Exception as e:
            print(f"Broadcast or DB notification failed: {e}")
            pass

        return Response(AppointmentSerializer(appointment).data)

    @action(detail=True, methods=['post'], url_path='reject-demand')
    def reject_demand(self, request, pk=None):
        """
        Secretary rejects a REQUESTED appointment.
        Requires a 'reason' in the request body.
        Sends a WhatsApp refusal message to the patient with the reason.
        """
        import requests as http_requests
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response({'detail': 'Une raison de refus est requise.'}, status=status.HTTP_400_BAD_REQUEST)
        
        appointment = self.get_object()
        if appointment.status != 'REQUESTED':
            return Response({'detail': 'Ce rendez-vous n\'est pas en attente.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment.transition_to('REJECTED', reason=reason)
        except ValidationError as e:
            return Response({'detail': list(e.messages)[0]}, status=status.HTTP_400_BAD_REQUEST)

        # Send WhatsApp refusal with reason
        try:
            from django.conf import settings
            patient = appointment.patient
            doctor = appointment.doctor
            if patient.phone:
                whatsapp_url = f"{getattr(settings, 'WHATSAPP_AGENT_URL', 'http://whatsapp_agent:8001')}/send-notification"
                payload = {
                    "whatsapp_number": patient.phone,
                    "event": "appointment_rejected",
                    "appointment_datetime": appointment.start_datetime.strftime('%d/%m/%Y à %H:%M'),
                    "doctor_name": f"Dr. {doctor.last_name}",
                    "rejection_reason": reason
                }
                http_requests.post(whatsapp_url, json=payload, timeout=10)
        except Exception:
            pass  # Do not block response if WhatsApp fails

        try:
            from apps.core.broadcast import create_and_broadcast_notification
            if appointment.patient and appointment.patient.user:
                create_and_broadcast_notification(
                    recipient=appointment.patient.user,
                    cabinet_doctor=None,
                    notif_type='APPOINTMENT',
                    title='Demande refusée',
                    message=f'Votre demande de rendez-vous avec Dr. {appointment.doctor.last_name} du {appointment.start_datetime.strftime("%d/%m/%Y")} a été refusée. Motif: {reason}',
                    action_url='/patient/appointments'
                )
        except Exception:
            pass

        return Response(AppointmentSerializer(appointment).data)

