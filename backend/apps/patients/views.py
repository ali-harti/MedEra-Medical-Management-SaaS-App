from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from .models import Patient, DoctorReview
from .serializers import PatientSerializer, PatientListSerializer, TimelineEventSerializer, DoctorReviewSerializer
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation
from apps.billing.models import Billing

from apps.authentication.permissions import IsMedecinOrSecretaire

class PatientPagination(PageNumberPagination):
    page_size = 20

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    pagination_class = PatientPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gender', 'is_archived', 'blood_type', 'created_at']
    search_fields = ['first_name', 'last_name', 'internal_id', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at', 'birth_date']

    def get_queryset(self):
        qs = Patient.objects.all()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
            
        cabinet_doctor = user.get_cabinet_doctor()
        if cabinet_doctor:
            return qs.filter(cabinet=cabinet_doctor)
        return qs.none()

    def get_permissions(self):
        if self.action == 'destroy':
            return []  # We handle this in destroy() to return 405
        return [IsMedecinOrSecretaire()]

    def get_serializer_class(self):
        if self.action == 'list':
            return PatientListSerializer
        return PatientSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        duplicates = serializer.validated_data.get('_duplicates')
        instance = serializer.save(
            created_by=request.user,
            cabinet=request.user.get_cabinet_doctor()
        )
        
        # Automatically create user and send welcome email
        if not instance.user:
            import os
            import secrets
            from django.contrib.auth import get_user_model
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            from django.core.mail import send_mail
            from django.conf import settings
            from django.template.loader import render_to_string
            from django.utils.html import strip_tags
            import logging
            
            logger = logging.getLogger(__name__)
            User = get_user_model()
            
            email = instance.email or f"patient_{instance.id}@medera.ma"
            existing_user = User.objects.filter(email=email).first()
            if not existing_user:
                patient_user = User.objects.create_user(
                    email=email,
                    password=secrets.token_hex(16),
                    first_name=instance.first_name,
                    last_name=instance.last_name,
                    role='PATIENT',
                    phone=instance.phone
                )
                instance.user = patient_user
                instance.save(update_fields=['user'])
            else:
                instance.user = existing_user
                instance.save(update_fields=['user'])
                patient_user = existing_user

            uid = urlsafe_base64_encode(force_bytes(patient_user.pk))
            token = default_token_generator.make_token(patient_user)
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            setup_link = f"{frontend_url}/reset-password/{uid}/{token}/"

            # Send the welcome email
            if instance.email:
                try:
                    context = {
                        'first_name': instance.first_name,
                        'portal_url': setup_link
                    }
                    html_message = render_to_string('emails/patient_welcome.html', context)
                    plain_message = strip_tags(html_message)
                    
                    send_mail(
                        subject="Bienvenue chez MedEra",
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[patient_user.email],
                        html_message=html_message,
                        fail_silently=True,
                    )
                except Exception as email_err:
                    logger.error(f"Failed to send welcome email on creation: {email_err}")

        if duplicates:
            return Response({
                "patient": PatientSerializer(instance).data,
                "warning": "Doublon potentiel détecté",
                "duplicates": duplicates
            }, status=status.HTTP_201_CREATED)
            
        return Response(PatientSerializer(instance).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Suppression interdite. Utilisez l\'archivage.'}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        patient = self.get_object()
        try:
            patient.archive()
            return Response({'detail': 'Patient archivé.'}, status=status.HTTP_200_OK)
        except ValidationError as e:
            error_msg = ' '.join(e.messages) if hasattr(e, 'messages') else str(e)
            return Response({'detail': error_msg}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def unarchive(self, request, pk=None):
        patient = self.get_object()
        patient.is_archived = False
        patient.save()
        return Response({'detail': 'Patient réactivé.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Gathers a chronological view of all events for this patient.
        """
        patient = self.get_object()
        events = []

        # 1. Appointments
        appointments = Appointment.objects.filter(patient=patient)
        for appt in appointments:
            events.append({
                'id': appt.id,
                'event_type': 'APPOINTMENT',
                'date': appt.start_datetime,
                'title': f"Rendez-vous {appt.get_appointment_type_display()}",
                'description': appt.motive or "Sans motif précis",
                'status': appt.status,
                'reference_id': appt.id,
                'metadata': {
                    'doctor': appt.doctor.get_full_name(),
                }
            })

        # 2. Consultations
        consultations = Consultation.objects.filter(patient=patient, status='FINALIZED')
        for cons in consultations:
            events.append({
                'id': cons.id,
                'event_type': 'CONSULTATION',
                'date': cons.finalized_at or cons.created_at,
                'title': "Consultation médicale",
                'description': cons.diagnosis or "Pas de diagnostic saisi",
                'status': 'FINALIZED',
                'reference_id': cons.id,
                'metadata': {
                    'doctor': cons.doctor.get_full_name(),
                    'motive': cons.motive,
                }
            })

        # 3. Billing
        bills = Billing.objects.filter(patient=patient)
        for bill in bills:
            events.append({
                'id': bill.id,
                'event_type': 'BILLING',
                'date': bill.created_at,
                'title': f"Facture {bill.invoice_number}",
                'description': f"Montant total: {bill.amount_total} MAD",
                'status': bill.status,
                'reference_id': bill.id,
                'metadata': {
                    'amount': str(bill.amount_total),
                    'payment_method': bill.get_payment_method_display(),
                }
            })

        # Sort by date descending
        events.sort(key=lambda x: x['date'], reverse=True)

        serializer = TimelineEventSerializer(events, many=True)
        return Response(serializer.data)


class DoctorReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly accessible read-only viewset for doctor reviews.
    """
    serializer_class = DoctorReviewSerializer
    permission_classes = [] # Publicly accessible

    def get_queryset(self):
        doctor_id = self.kwargs.get('doctor_id')
        return DoctorReview.objects.filter(doctor_id=doctor_id, is_verified=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
