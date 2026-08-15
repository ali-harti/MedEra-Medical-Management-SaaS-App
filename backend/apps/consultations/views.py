from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from apps.authentication.permissions import IsMedicalStaff
from .models import Consultation
from .serializers import ConsultationSerializer, ConsultationListSerializer

class ConsultationViewSet(viewsets.ModelViewSet):
    """
    Gestion des consultations médicales.
    RG-CONS-02: Scoped to doctors only. 
    Finalized consultations are immutable (except corrective notes).
    """
    queryset = Consultation.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ConsultationListSerializer
        return ConsultationSerializer

    def get_queryset(self):
        # Scoping: Doctors see their own consultations, Secretaries see their employer's
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
            
        if hasattr(user, 'patient_record'):
            qs = self.queryset.filter(patient=user.patient_record)
        else:
            cabinet_doctor = user.get_cabinet_doctor()
            if cabinet_doctor:
                qs = self.queryset.filter(doctor=cabinet_doctor)
            else:
                qs = self.queryset.none()
            
        qs = qs.order_by('-created_at')
        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',')]
            qs = qs.filter(status__in=statuses)
            
        patient_param = self.request.query_params.get('patient')
        if patient_param:
            qs = qs.filter(patient_id=patient_param)
            
        appointment_param = self.request.query_params.get('appointment')
        if appointment_param:
            qs = qs.filter(appointment_id=appointment_param)

        # RG-PRES-01 / RG-BILL-01: Filter consultations that have at least one prescription
        has_prescription_param = self.request.query_params.get('has_prescription')
        if has_prescription_param is not None:
            if has_prescription_param.lower() in ('true', '1'):
                qs = qs.filter(prescriptions__isnull=False).distinct()
            elif has_prescription_param.lower() in ('false', '0'):
                qs = qs.filter(prescriptions__isnull=True)

        has_billing_param = self.request.query_params.get('has_billing')
        if has_billing_param is not None:
            if has_billing_param.lower() in ('true', '1'):
                qs = qs.filter(billing__isnull=False).distinct()
            elif has_billing_param.lower() in ('false', '0'):
                qs = qs.filter(billing__isnull=True)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        doctor = user.get_cabinet_doctor()
        serializer.save(doctor=doctor)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        """
        Passage d'une consultation en état FINALIZED.
        RG-BILL-01: Automatically generate a billing record when a consultation is finalized.
        """
        consultation = self.get_object()
        if consultation.status == 'FINALIZED':
            return Response({'detail': 'Déjà finalisée.'}, status=400)
        
        # Optional amount from request, default to 300 MAD
        amount = request.data.get('amount', 300.00)
        
        # Call the model's finalize method which handles PDF generation and WhatsApp delivery
        consultation.finalize()
        
        from django.utils import timezone
        now = timezone.now()

        # Update patient's last_visit date
        patient = consultation.patient
        patient.last_visit = now.date()
        patient.save(update_fields=['last_visit'])

        # Check if billing already exists to avoid duplicates
        from apps.billing.models import Billing
        if not Billing.objects.filter(consultation=consultation).exists():
            Billing.objects.create(
                patient=consultation.patient,
                doctor=consultation.doctor,
                consultation=consultation,
                amount_total=amount,
                items=[{
                    'description': f'Consultation — {consultation.diagnosis or "Générale"}',
                    'price': float(amount)
                }],
                status='PENDING'
            )
            
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """
        Transition a consultation from DRAFT to IN_PROGRESS.
        Called when the doctor clicks 'Start' on an appointment card.
        """
        consultation = self.get_object()
        if consultation.status == 'CANCELLED':
            return Response({'detail': 'Cannot start a cancelled consultation.'}, status=status.HTTP_400_BAD_REQUEST)
        if consultation.status == 'FINALIZED':
            return Response({'detail': 'Consultation already finalized.'}, status=status.HTTP_400_BAD_REQUEST)
        if consultation.status == 'IN_PROGRESS':
            # Already started — idempotent, just return it
            return Response(ConsultationSerializer(consultation).data)
        
        consultation.status = 'IN_PROGRESS'
        consultation.save(update_fields=['status'])
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Passage d'une consultation en état CANCELLED."""
        consultation = self.get_object()
        if consultation.status in ['FINALIZED', 'CANCELLED']:
            return Response({'detail': f'Cannot cancel from {consultation.status}.'}, status=status.HTTP_400_BAD_REQUEST)
        
        consultation.status = 'CANCELLED'
        consultation.save(update_fields=['status'])
        return Response(ConsultationSerializer(consultation).data)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Append-only corrective notes for finalized consultations (RG-CONS-02)."""
        consultation = self.get_object()
        note_text = request.data.get('note')
        if not note_text:
            return Response({'detail': 'Note content required.'}, status=400)
        
        if consultation.status != 'FINALIZED':
            return Response({'detail': 'Uniquement pour consultation finalisée.'}, status=400)
            
        # Append note with metadata
        from django.utils import timezone
        new_note = {
            'note': note_text,
            'author': request.user.get_full_name(),
            'timestamp': timezone.now().isoformat()
        }
        
        if not consultation.corrective_notes:
            consultation.corrective_notes = []
        
        consultation.corrective_notes.append(new_note)
        consultation.save(update_fields=['corrective_notes'])
        return Response(new_note, status=200)

    @extend_schema(
        tags=['consultations'],
        summary='AI Differential Diagnosis',
        description='''
Sends the consultation symptoms to the Flask AI microservice and returns
a ranked differential diagnosis in French or English.

Requires minimum 2 symptoms on the consultation record.
Sets `ai_used = True` on the consultation after successful analysis.

The AI service covers 445 diseases with bilingual FR/EN symptom resolution.
    ''',
        responses={
            200: OpenApiResponse(description='Predictions returned with coverage ratio and disclaimer'),
            400: OpenApiResponse(description='Minimum 2 symptoms required'),
            403: OpenApiResponse(description='Consultation belongs to another doctor'),
            503: OpenApiResponse(description='AI service unavailable — degraded mode'),
        },
    )
    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        """
        Génère une analyse IA via le microservice Flask.
        RG-CONS-04: Requires at least 2 symptoms.
        v3.0.0: Optimized payload and multi-lingual support.
        """
        consultation = self.get_object()
        
        # Read symptoms from request or fallback to existing
        symptoms = request.data.get('symptoms')
        if symptoms is not None:
            consultation.symptoms = symptoms
            consultation.save(update_fields=['symptoms'])
            
        if not consultation.symptoms or len(consultation.symptoms) < 2:
            return Response(
                {'detail': 'Analyse IA requiert au moins 2 symptômes.'}, 
                status=400
            )

        # Integration with Flask AI Service (v3.0.0)
        import requests
        from django.conf import settings
        
        # Detect language from request headers or default to French for Moroccan context
        lang = request.headers.get('Accept-Language', 'fr')[:2]
        if lang not in ('fr', 'en'):
            lang = 'fr'

        # Pass all necessary context to AI service, including min_confidence = 0.05
        payload = {
            'symptoms': consultation.symptoms,
            'lang': lang,
            'min_confidence': 0.05,
            'free_text': request.data.get('free_text', ''),
            'age': request.data.get('age', 30),
            'sex': request.data.get('sex', 'M'),
            'travel_tropical': request.data.get('travel_tropical', False),
            'history_diabetes': request.data.get('history_diabetes', False),
            'history_smoking': request.data.get('history_smoking', False),
        }

        try:
            import logging
            logger = logging.getLogger('django.request')
            logger.warning(f"DEBUG PAYLOAD: {payload}")
            response = requests.post(
                f"{settings.AI_SERVICE_URL}/api/predict",
                json=payload,
                headers={'X-Internal-Token': settings.AI_INTERNAL_TOKEN},
                timeout=settings.AI_SERVICE_TIMEOUT # RG-CONS-05
            )
            
            if response.status_code == 200:
                data = response.json()
                predictions = data.get('predictions', [])
                
                # Persistence of the analysis v3.0.0
                consultation.ai_suggestions = predictions
                consultation.ai_used = True # RG-CONS-03 (Fix 3)
                
                # Store clinical metadata for audit and diagnostic transparency
                # Verified: metadata field exists on model (Fix 2)
                metadata = consultation.metadata or {}
                metadata['ai_analysis_v'] = data.get('version', '3.0.0')
                metadata['known_symptoms'] = data.get('known_symptoms', [])
                metadata['unknown_symptoms'] = data.get('unknown_symptoms', [])
                metadata['coverage'] = data.get('coverage', {})
                metadata['clinical_note'] = data.get('clinical_note', '')
                metadata['degraded_reason'] = data.get('degraded_reason', '')
                consultation.metadata = metadata
                
                consultation.save(update_fields=['ai_suggestions', 'ai_used', 'metadata'])
                
                return Response({
                    'predictions': predictions,
                    'known_symptoms': data.get('known_symptoms', []),
                    'unknown_symptoms': data.get('unknown_symptoms', []),
                    'coverage': data.get('coverage', {}),
                    'degraded': data.get('degraded', False),
                    'disclaimer': data.get('disclaimer', ''),
                    'clinical_note': data.get('clinical_note', ''),
                    'version': data.get('version', '3.0.0')
                })
            else:
                return Response(
                    {
                        'predictions': [], 
                        'degraded': True, 
                        'error': f'AI Service error: {response.status_code}',
                        'details': response.text[:200]
                    },
                    status=200
                )
        except requests.exceptions.Timeout:
            return Response(
                {'predictions': [], 'degraded': True, 'error': 'AI Service timeout (slow inference)'},
                status=200
            )
        except Exception as e:
            # Graceful degradation (RG-CONS-05)
            return Response(
                {'predictions': [], 'degraded': True, 'error': str(e)},
                status=200
            )

    @action(detail=True, methods=['post'])
    def schedule_followup(self, request, pk=None):
        """
        UC-MEDECIN-12: Schedule a follow-up appointment from a consultation. 
        Creates a new Appointment pre-filled with:
        - patient from the consultation
        - doctor = request.user
        - appointment_type = 'FOLLOW_UP'
        - motive pre-filled with "Suivi — {consultation.diagnosis}"
        """
        from apps.appointments.models import Appointment
        from apps.appointments.serializers import AppointmentSerializer
        
        consultation = self.get_object()
        
        start_dt = request.data.get('start_datetime')
        if not start_dt:
            return Response({'detail': 'start_datetime requis.'}, status=400)
        
        from django.utils.dateparse import parse_datetime
        from datetime import timedelta
        
        start = parse_datetime(start_dt)
        if not start:
            return Response(
                {'detail': 'Format start_datetime invalide. Utiliser ISO 8601.'},
                status=400
            )
        
        end_dt = request.data.get('end_datetime')
        end = parse_datetime(end_dt) if end_dt else (start + timedelta(minutes=30))
        
        appt_data = {
            'patient': str(consultation.patient.id),
            'doctor': str(request.user.id),
            'start_datetime': start.isoformat(),
            'end_datetime': end.isoformat(),
            'appointment_type': 'FOLLOW_UP',
            'motive': (f"Suivi — {consultation.diagnosis}" if consultation.diagnosis else "Consultation de suivi"),
            'status': 'PLANNED',
        }
        
        serializer = AppointmentSerializer(data=appt_data, context={'request': request})
        
        if serializer.is_valid():
            appointment = serializer.save(created_by=request.user, doctor=request.user)
            return Response(AppointmentSerializer(appointment).data, status=201)
        
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def start_video(self, request, pk=None):
        """Starts a video session for the consultation"""
        from django.utils import timezone
        import uuid
        
        consultation = self.get_object()
        
        # In a real app, integrate with Zoom/Twilio/Daily.co API here
        # For MVP, we generate a mock unique URL
        room_id = str(uuid.uuid4())[:8]
        meeting_url = f"https://meet.medera.app/video/{room_id}"
        
        consultation.video_session_active = True
        consultation.video_patient_url = meeting_url
        consultation.video_started_at = timezone.now()
        consultation.save(update_fields=['video_session_active', 'video_patient_url', 'video_started_at'])
        
        return Response({
            'status': 'started',
            'url': meeting_url,
            'consultation_id': consultation.id
        })

    @action(detail=True, methods=['post'])
    def end_video(self, request, pk=None):
        """Ends a video session and records duration"""
        from django.utils import timezone
        
        consultation = self.get_object()
        
        if consultation.video_session_active and consultation.video_started_at:
            duration = (timezone.now() - consultation.video_started_at).total_seconds()
            consultation.video_duration = int(duration)
        
        consultation.video_session_active = False
        consultation.save(update_fields=['video_session_active', 'video_duration'])
        
        return Response({
            'status': 'ended',
            'duration_seconds': consultation.video_duration,
            'consultation_id': consultation.id
        })
