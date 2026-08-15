"""
Patient portal views — read-only, own data only (RG-AUTH-05).
PATIENT role can only see their own records.
These views are separate from the main ViewSets to keep RBAC logic clean and explicit.
"""
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from apps.authentication.permissions import IsPatient
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription
from apps.billing.models import Billing
from django.contrib.auth import get_user_model

User = get_user_model()


class PatientOwnRecordView(generics.RetrieveAPIView):
    """
    UC-PATIENT-02: PATIENT views their own dossier.
    GET /api/patient-portal/dossier/
    Returns the Patient record associated with this user's email.
    RG-AUTH-05: only own data, read-only.
    """
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = 'apps.patients.serializers.PatientSerializer'

    def get_object(self):
        """
        Find the Patient record that matches this user's email.
        A patient user's email matches their Patient.email field.
        """
        from apps.patients.models import Patient
        from rest_framework.exceptions import NotFound
        try:
            return Patient.objects.get(
                email=self.request.user.email,
                is_archived=False
            )
        except Patient.DoesNotExist:
            raise NotFound("Aucun dossier patient associé à ce compte.")


class PatientDashboardKPIView(APIView):
    """
    UC-PATIENT-XX: PATIENT views their dashboard KPIs.
    GET /api/patient-portal/dashboard/kpis/
    Returns counts for upcoming appointments, total consultations,
    active prescriptions, and pending invoices.
    RG-AUTH-05: only own data, read-only.
    """
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        now = timezone.now()
        user = request.user

        # upcoming_appointments: patient.user = request.user, status NOT IN ['DONE', 'CANCELLED'], start_datetime >= now
        upcoming_appointments = Appointment.objects.filter(
            patient__user=user,
            start_datetime__gte=now
        ).exclude(
            status__in=['DONE', 'CANCELLED']
        ).count()

        # total_consultations: appointment__patient__user = request.user, status = 'FINALIZED'
        total_consultations = Consultation.objects.filter(
            appointment__patient__user=user,
            status='FINALIZED'
        ).count()

        # active_prescriptions: consultation__appointment__patient__user = request.user, is_cancelled=False
        # Prescription model uses is_cancelled boolean, not status field
        active_prescriptions = Prescription.objects.filter(
            consultation__appointment__patient__user=user,
            is_cancelled=False
        ).count()

        # pending_invoices: patient__user = request.user, status = 'PENDING'
        pending_invoices = Billing.objects.filter(
            patient__user=user,
            status='PENDING'
        ).count()

        from django.db.models import Sum, F
        pending_amount = Billing.objects.filter(
            patient__user=user,
            status='PENDING'
        ).aggregate(
            total_due=Sum(F('amount_total') - F('amount_paid'))
        )['total_due'] or 0.0

        return Response({
            'upcoming_appointments': upcoming_appointments,
            'total_consultations': total_consultations,
            'active_prescriptions': active_prescriptions,
            'pending_invoices': pending_invoices,
            'pending_amount': float(pending_amount)
        })


class PatientContactsView(APIView):
    """
    UC-PATIENT-XX: PATIENT views their contacts (doctors and secretaries).
    GET /api/patient-portal/contacts/
    Returns distinct staff members linked to this patient via appointments.
    RG-AUTH-05: only own data, read-only.
    """
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        contacts = []

        doctors = User.objects.filter(role='MEDECIN')
        for doc in doctors:
            contacts.append({
                'id': str(doc.id),
                'name': f"Dr. {doc.get_full_name()}",
                'role': 'DOCTOR'
            })

        secretaries = User.objects.filter(role='SECRETAIRE')
        for sec in secretaries:
            contacts.append({
                'id': str(sec.id),
                'name': f"Secretary of Dr. Karim Benali ({sec.get_full_name()})",
                'role': 'SECRETARY'
            })

        return Response(contacts)

