"""
Patient portal: prescription read-only views + PDF download.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.authentication.permissions import IsPatient
from drf_spectacular.utils import extend_schema, OpenApiResponse
from drf_spectacular.types import OpenApiTypes
from apps.patients.models import Patient
from .models import Prescription
from .serializers import PrescriptionSerializer

class PatientOwnPrescriptionsView(generics.ListAPIView):
    """
    UC-PATIENT-04: PATIENT sees their own prescriptions.
    GET /api/patient-portal/prescriptions/
    Read-only. Both active and cancelled visible.
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = PrescriptionSerializer
    
    def get_queryset(self):
        try:
            patient = Patient.objects.get(
                email=self.request.user.email,
                is_archived=False
            )
            return Prescription.objects.filter(
                patient=patient
            ).select_related(
                'doctor', 'patient'
            ).prefetch_related(
                'medication_lines'
            ).order_by('-issued_at')
        except Patient.DoesNotExist:
            return Prescription.objects.none()

class PatientPrescriptionPDFView(generics.RetrieveAPIView):
    """
    UC-PATIENT-06: PATIENT downloads their own prescription PDF.
    GET /api/patient-portal/prescriptions/{id}/pdf/
    Only accessible for prescriptions belonging to this patient.
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = PrescriptionSerializer
    
    @extend_schema(
        tags=['patient-portal'],
        summary='Download own prescription as PDF',
        responses={
            200: OpenApiResponse(
                description='PDF file',
                response=OpenApiTypes.BINARY,
            ),
            404: OpenApiResponse(description='Prescription not found'),
        },
    )
    def get(self, request, pk):
        from django.http import HttpResponse
        from .pdf_generator import generate_prescription_pdf
        
        # Strict ownership check — no data leakage
        try:
            patient = Patient.objects.get(
                email=request.user.email,
                is_archived=False
            )
        except Patient.DoesNotExist:
            return Response(
                {'detail': 'Aucun dossier patient associé.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            prescription = Prescription.objects.get(id=pk, patient=patient)
        except Prescription.DoesNotExist:
            # Return 404, not 403 — don't confirm other prescriptions exist (RG-AUTH-05)
            return Response(
                {'detail': 'Ordonnance introuvable.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            pdf_bytes = generate_prescription_pdf(
                prescription,
                cancelled=prescription.is_cancelled
            )
        except Exception as e:
            return Response(
                {'detail': f'Erreur PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="ordonnance_{prescription.id}.pdf"'
        return response
