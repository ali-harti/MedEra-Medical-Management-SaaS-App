import pytest
import uuid
from django.utils import timezone
from rest_framework import status
from django.urls import reverse
import factory
from factory.django import DjangoModelFactory
from django.conf import settings

from apps.consultations.models import Consultation
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f'doc{n}@medera.com')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    role = 'MEDECIN'
    first_name = "Doctor"
    last_name = "Who"

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    id = factory.LazyFunction(uuid.uuid4)
    first_name = "Test"
    last_name = "Patient"
    birth_date = "1990-01-01"
    gender = 'M'

class ConsultationFactory(DjangoModelFactory):
    class Meta:
        model = Consultation
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory)
    status = 'DRAFT'

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
class TestConsultationAPI:
    
    def test_create_consultation_as_medecin_returns_201(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        patient = PatientFactory()
        url = reverse('consultation-list')
        data = {
            "patient": str(patient.id),
            "motive": "General consultation",
            "symptoms": ["fever"]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'DRAFT'

    def test_create_consultation_as_secretaire_returns_403(self, api_client, secretaire_user):
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('consultation-list')
        data = {"patient": str(PatientFactory().id), "motive": "X"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_finalize_draft_consultation(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(doctor=medecin_user)
        url = reverse('consultation-finalize', args=[consultation.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'FINALIZED'
        assert response.data['finalized_at'] is not None

    def test_update_finalized_consultation_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(status='FINALIZED', doctor=medecin_user)
        url = reverse('consultation-detail', args=[consultation.id])
        response = api_client.patch(url, {"motive": "Updated"}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "modification interdite" in str(response.data)

    def test_add_corrective_note_to_finalized(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(status='FINALIZED', doctor=medecin_user)
        url = reverse('consultation-add-note', args=[consultation.id])
        response = api_client.post(url, {"note": "This is a fix."})
        assert response.status_code == status.HTTP_200_OK
        consultation.refresh_from_db()
        assert len(consultation.corrective_notes) == 1
        assert consultation.corrective_notes[0]['note'] == "This is a fix."

    def test_add_corrective_note_to_draft_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(status='DRAFT', doctor=medecin_user)
        url = reverse('consultation-add-note', args=[consultation.id])
        response = api_client.post(url, {"note": "Broken"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_analyze_with_one_symptom_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(symptoms=["fever"], doctor=medecin_user)
        url = reverse('consultation-analyze', args=[consultation.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_analyze_with_two_symptoms_calls_flask(self, api_client, medecin_user, requests_mock):
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(symptoms=["fever", "cough"], doctor=medecin_user)
        
        # Mock flask service
        requests_mock.post(
            f"{settings.AI_SERVICE_URL}/api/predict",
            json={"predictions": [{"disease": "Flu", "confidence": 0.9}]},
            status_code=200
        )
        
        url = reverse('consultation-analyze', args=[consultation.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['predictions'][0]['disease'] == "Flu"
        
        consultation.refresh_from_db()
        assert consultation.ai_suggestions[0]['disease'] == "Flu"

    def test_analyze_flask_timeout_returns_degraded_response(self, api_client, medecin_user, requests_mock):
        import requests
        api_client.force_authenticate(user=medecin_user)
        consultation = ConsultationFactory(symptoms=["fever", "cough"], doctor=medecin_user)
        
        requests_mock.post(f"{settings.AI_SERVICE_URL}/api/predict", exc=requests.exceptions.Timeout)
        
        url = reverse('consultation-analyze', args=[consultation.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['degraded'] is True
        assert response.data['predictions'] == []

    def test_appointment_nullable_on_consultation(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        url = reverse('consultation-list')
        data = {
            "patient": str(PatientFactory().id),
            "motive": "Direct consultation",
            "appointment": None
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['appointment'] is None
