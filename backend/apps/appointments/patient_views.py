"""
Patient portal: appointment read-only views.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.authentication.permissions import IsPatient
from apps.patients.models import Patient
from .models import Appointment
from .serializers import AppointmentListSerializer, AppointmentSerializer

class PatientOwnAppointmentsView(generics.ListCreateAPIView):
    """
    UC-PATIENT-03: PATIENT sees their own appointments.
    GET /api/patient-portal/appointments/   — List all own appointments.
    POST /api/patient-portal/appointments/  — Request a new appointment (status=REQUESTED).
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = AppointmentListSerializer
    
    def get_queryset(self):
        try:
            patient = Patient.objects.get(
                email=self.request.user.email,
                is_archived=False
            )
            return Appointment.objects.filter(
                patient=patient
            ).select_related(
                'doctor', 'patient'
            ).order_by('-start_datetime')
        except Patient.DoesNotExist:
            return Appointment.objects.none()

    def create(self, request, *args, **kwargs):
        try:
            patient = Patient.objects.get(email=request.user.email, is_archived=False)
        except Patient.DoesNotExist:
            return Response({'detail': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data['patient'] = patient.id
        # Force REQUESTED status — secretary must approve
        data['status'] = 'REQUESTED'
        
        serializer = AppointmentSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

