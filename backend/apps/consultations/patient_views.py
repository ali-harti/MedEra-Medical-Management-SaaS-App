"""
Patient portal: consultation history read-only views.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import IsPatient
from apps.patients.models import Patient
from .models import Consultation
from .serializers import ConsultationListSerializer

class PatientOwnConsultationsView(generics.ListAPIView):
    """
    UC-PATIENT-07: PATIENT sees their consultation history.
    GET /api/patient-portal/consultations/
    Read-only. Only FINALIZED consultations visible.
    DRAFT consultations hidden from patient view.
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = ConsultationListSerializer
    
    def get_queryset(self):
        try:
            patient = Patient.objects.get(
                email=self.request.user.email,
                is_archived=False
            )
            return Consultation.objects.filter(
                patient=patient,
                status='FINALIZED'
            ).select_related(
                'doctor', 'patient'
            ).order_by('-finalized_at')
        except Patient.DoesNotExist:
            return Consultation.objects.none()
