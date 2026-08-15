import pytest
import uuid
from rest_framework import status
from django.urls import reverse
import factory
from factory.django import DjangoModelFactory

from apps.prescriptions.models import Prescription, MedicationLine
from apps.consultations.models import Consultation
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f'medecin_rx{n}@medera.com')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    role = 'MEDECIN'
    first_name = "Doc"
    last_name = "Rx"

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    id = factory.LazyFunction(uuid.uuid4)
    first_name = "Patient"
    last_name = "RX"
    birth_date = "1990-01-01"
    gender = 'M'

class ConsultationFactory(DjangoModelFactory):
    class Meta:
        model = Consultation
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory)
    status = 'FINALIZED'

class PrescriptionFactory(DjangoModelFactory):
    class Meta:
        model = Prescription
    id = factory.LazyFunction(uuid.uuid4)
    consultation = factory.SubFactory(ConsultationFactory)
    patient = factory.SelfAttribute('consultation.patient')
    doctor = factory.SelfAttribute('consultation.doctor')

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def medecin_user():
    return UserFactory(role='MEDECIN')

@pytest.fixture
def secretaire_user():
    return UserFactory(role='SECRETAIRE')

@pytest.mark.django_db
class TestPrescriptionAPI:
    
    def test_create_prescription_from_finalized_consultation(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(doctor=medecin_user, status='FINALIZED')
        url = reverse('prescription-list')
        data = {
            "consultation": str(consultation.id),
            "medication_lines": [
                {"drug_name": "Doliprane", "dosage": "1000mg", "dosology": "1 tab x 3/day"}
            ]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['medication_lines']) == 1

    def test_create_prescription_from_draft_consultation_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(doctor=medecin_user, status='DRAFT')
        url = reverse('prescription-list')
        data = {
            "consultation": str(consultation.id),
            "medication_lines": [{"drug_name": "X", "dosage": "1mg", "dosology": "1/day"}]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "uniquement depuis consultation finalisée" in str(response.data)

    def test_secretary_cannot_create_prescription_returns_403(self, api_client, secretaire_user):
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('prescription-list')
        response = api_client.post(url, {})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cancel_prescription_sets_is_cancelled_true(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        prescription = PrescriptionFactory(doctor=medecin_user)
        url = reverse('prescription-cancel', args=[prescription.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        prescription.refresh_from_db()
        assert prescription.is_cancelled is True

    def test_cancel_already_cancelled_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        prescription = PrescriptionFactory(doctor=medecin_user, is_cancelled=True)
        url = reverse('prescription-cancel', args=[prescription.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_prescription_belongs_to_correct_patient(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(doctor=medecin_user, status='FINALIZED')
        url = reverse('prescription-list')
        data = {
            "consultation": str(consultation.id),
            "medication_lines": []
        }
        response = api_client.post(url, data, format='json')
        assert str(response.data['patient']) == str(consultation.patient.id)

    def test_medication_lines_are_created_with_prescription(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(doctor=medecin_user, status='FINALIZED')
        url = reverse('prescription-list')
        data = {
            "consultation": str(consultation.id),
            "medication_lines": [
                {"drug_name": "A", "dosage": "1", "dosology": "1"},
                {"drug_name": "B", "dosage": "2", "dosology": "2"},
                {"drug_name": "C", "dosage": "3", "dosology": "3"}
            ]
        }
        resp = api_client.post(url, data, format='json')
        presc_id = resp.data['id']
        assert MedicationLine.objects.filter(prescription_id=presc_id).count() == 3

    def test_prescription_immutable_no_patch(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        prescription = PrescriptionFactory(doctor=medecin_user)
        url = reverse('prescription-detail', args=[prescription.id])
        response = api_client.patch(url, {"general_instructions": "Changed"})
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
