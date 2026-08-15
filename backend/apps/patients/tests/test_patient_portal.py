import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from apps.patients.tests.factories import PatientFactory
from apps.authentication.tests.factories import UserFactory
from apps.appointments.tests.factories import AppointmentFactory
from apps.prescriptions.tests.factories import PrescriptionFactory
from apps.consultations.tests.factories import ConsultationFactory

@pytest.fixture(autouse=True)
def mock_weasyprint():
    with patch('apps.prescriptions.pdf_generator.WEASYPRINT_AVAILABLE', False):
        yield

@pytest.mark.django_db
class TestPatientPortal:
    """Tests for Patient Portal (UC-PATIENT-01 to 07)."""

    @pytest.fixture
    def patient_account(self):
        # User email must match Patient email for the portal lookup
        email = "patient@portal.com"
        user = UserFactory(email=email, role='PATIENT')
        patient = PatientFactory(email=email)
        return user, patient

    def test_patient_can_view_own_dossier(self, api_client, patient_account):
        """GET /api/patient-portal/dossier/ returns their own record."""
        user, patient = patient_account
        api_client.force_authenticate(user=user)
        url = reverse('patient-own-record')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    def test_patient_cannot_view_other_patient_dossier(self, api_client, patient_account):
        """A PATIENT cannot access another patient's record."""
        user, _ = patient_account
        # Create another patient record
        other_patient = PatientFactory(email="other@test.com")
        api_client.force_authenticate(user=user)
        
        # There is no ID-based detail view for patients in the portal, 
        # so data leakage is prevented via the identity-based lookup in get_object.
        url = reverse('patient-own-record')
        response = api_client.get(url)
        assert response.data['id'] != str(other_patient.id)

    def test_patient_can_view_own_appointments(self, api_client, patient_account):
        """GET /api/patient-portal/appointments/ returns only own appointments."""
        user, patient = patient_account
        AppointmentFactory(patient=patient) # Own
        AppointmentFactory() # Other
        
        api_client.force_authenticate(user=user)
        url = reverse('patient-own-appointments')
        response = api_client.get(url)
        assert len(response.data['results']) == 1

    def test_patient_can_view_own_prescriptions(self, api_client, patient_account):
        """GET /api/patient-portal/prescriptions/ returns only own prescriptions."""
        user, patient = patient_account
        PrescriptionFactory(patient=patient)
        
        api_client.force_authenticate(user=user)
        url = reverse('patient-own-prescriptions')
        response = api_client.get(url)
        assert len(response.data['results']) == 1

    def test_patient_can_download_own_prescription_pdf(self, api_client, patient_account):
        """GET /api/patient-portal/prescriptions/{id}/pdf/ returns PDF bytes."""
        user, patient = patient_account
        rx = PrescriptionFactory(patient=patient)
        api_client.force_authenticate(user=user)
        
        url = reverse('patient-prescription-pdf', args=[rx.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'

    def test_patient_cannot_download_other_patient_pdf(self, api_client, patient_account):
        """GET /api/patient-portal/prescriptions/{other_id}/pdf/ returns 404."""
        user, _ = patient_account
        other_rx = PrescriptionFactory()
        api_client.force_authenticate(user=user)
        
        url = reverse('patient-prescription-pdf', args=[other_rx.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patient_can_view_finalized_consultations_only(self, api_client, patient_account):
        """GET /api/patient-portal/consultations/ returns only FINALIZED consultations."""
        user, patient = patient_account
        ConsultationFactory(patient=patient, status='FINALIZED')
        ConsultationFactory(patient=patient, status='DRAFT')
        
        api_client.force_authenticate(user=user)
        url = reverse('patient-own-consultations')
        response = api_client.get(url)
        assert len(response.data['results']) == 1
