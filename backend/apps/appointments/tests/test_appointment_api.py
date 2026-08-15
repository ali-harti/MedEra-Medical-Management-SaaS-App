import pytest
import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from django.urls import reverse
import factory
from factory.django import DjangoModelFactory

from apps.appointments.models import Appointment
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f'medecin{n}@medera.com')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    role = 'MEDECIN'
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    id = factory.LazyFunction(uuid.uuid4)
    first_name = "Test"
    last_name = "Patient"
    birth_date = "1990-01-01"
    gender = 'M'
    email = "patient@test.com"

class AppointmentFactory(DjangoModelFactory):
    class Meta:
        model = Appointment
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory)
    start_datetime = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1))
    end_datetime = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1, minutes=30))
    status = 'PLANNED'
    motive = "Consultation"

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
class TestAppointmentAPI:
    
    def test_create_appointment_without_conflict_returns_201(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        patient = PatientFactory()
        url = reverse('appointment-list')
        data = {
            "patient": str(patient.id),
            "doctor": str(medecin_user.id),
            "start_datetime": (timezone.now() + timedelta(days=2)).isoformat(),
            "end_datetime": (timezone.now() + timedelta(days=2, minutes=30)).isoformat(),
            "motive": "Global checkup"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_appointment_with_conflict_returns_409(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        existing_appt = AppointmentFactory(doctor=medecin_user)
        
        url = reverse('appointment-list')
        data = {
            "patient": str(PatientFactory().id),
            "doctor": str(medecin_user.id),
            "start_datetime": existing_appt.start_datetime.isoformat(),
            "end_datetime": existing_appt.end_datetime.isoformat(),
            "motive": "Conflicting checkup"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.data['code'] == ['conflict']
        assert len(response.data['alternatives']) == 3

    def test_alternatives_are_in_the_future(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        existing = AppointmentFactory(doctor=medecin_user)
        url = reverse('appointment-list')
        data = {
            "patient": str(PatientFactory().id),
            "doctor": str(medecin_user.id),
            "start_datetime": existing.start_datetime.isoformat(),
            "end_datetime": existing.end_datetime.isoformat(),
            "motive": "Conflict"
        }
        response = api_client.post(url, data)
        for alt in response.data['alternatives']:
            assert alt > timezone.now().isoformat()

    def test_transition_planned_to_confirmed(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        appt = AppointmentFactory(status='PLANNED')
        url = reverse('appointment-transition', args=[appt.id])
        response = api_client.post(url, {"status": "CONFIRMED"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'CONFIRMED'

    def test_transition_done_is_terminal(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        appt = AppointmentFactory(status='DONE')
        url = reverse('appointment-transition', args=[appt.id])
        response = api_client.post(url, {"status": "CANCELLED", "cancellation_reason": "Too late"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_transition_cancelled_requires_reason(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        appt = AppointmentFactory(status='PLANNED')
        url = reverse('appointment-transition', args=[appt.id])
        response = api_client.post(url, {"status": "CANCELLED"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Raison d'annulation requise" in response.data['detail']

    def test_transition_to_done_creates_draft_consultation(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        appt = AppointmentFactory(status='IN_PROGRESS', doctor=medecin_user)
        url = reverse('appointment-transition', args=[appt.id])
        
        from apps.consultations.models import Consultation
        assert Consultation.objects.filter(appointment=appt).count() == 0
        
        response = api_client.post(url, {"status": "DONE"})
        assert response.status_code == status.HTTP_200_OK
        assert Consultation.objects.filter(appointment=appt, status='DRAFT').exists()

    def test_secretary_cannot_create_appointment_in_past(self, api_client, secretaire_user):
        api_client.force_authenticate(user=secretaire_user)
        patient = PatientFactory()
        url = reverse('appointment-list')
        data = {
            "patient": str(patient.id),
            "doctor": str(UserFactory(role='MEDECIN').id),
            "start_datetime": (timezone.now() - timedelta(hours=2)).isoformat(),
            "end_datetime": (timezone.now() - timedelta(hours=1)).isoformat(),
            "motive": "Past RDV"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error_msg = str(response.data)
        assert "passé interdit" in error_msg

    def test_reminder_not_sent_for_non_confirmed(self, api_client, medecin_user):
        from apps.appointments.tasks import send_appointment_reminder_task
        appt = AppointmentFactory(status='PLANNED')
        result = send_appointment_reminder_task(appt.id, "24h")
        assert "Skipped" in result

    def test_appointment_list_filtered_by_status(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        AppointmentFactory(status='CONFIRMED')
        AppointmentFactory(status='PLANNED')
        
        url = reverse('appointment-list') + "?status=CONFIRMED"
        response = api_client.get(url)
        # Assuming we only have these 2 from the test
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'CONFIRMED'
