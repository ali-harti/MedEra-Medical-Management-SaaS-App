import pytest
import uuid
from datetime import date, timedelta
from django.utils import timezone
from rest_framework import status
from django.urls import reverse
import factory
from factory.django import DjangoModelFactory

from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Sequence(lambda n: f'user{n}@medera.com')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    role = 'MEDECIN'

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    id = factory.LazyFunction(uuid.uuid4)
    first_name = factory.Faker('first_name', locale='fr_FR')
    last_name = factory.Faker('last_name', locale='fr_FR')
    birth_date = factory.Faker('date_of_birth', minimum_age=1, maximum_age=95)
    gender = 'M'
    phone = factory.Faker('phone_number', locale='fr_FR')
    created_by = factory.SubFactory(UserFactory)

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

@pytest.fixture
def patient_user():
    return UserFactory(role='PATIENT')

@pytest.mark.django_db
class TestPatientAPI:
    
    def test_create_patient_generates_internal_id(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        url = reverse('patient-list')
        data = {
            "first_name": "Jean",
            "last_name": "Dupont",
            "birth_date": "1980-01-01",
            "gender": "M"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert "internal_id" in response.data or "patient" in response.data
        internal_id = response.data.get('internal_id') or response.data['patient']['internal_id']
        assert internal_id.startswith(f"PAT-{date.today().strftime('%Y%m%d')}-")

    def test_internal_id_is_unique_same_day(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        url = reverse('patient-list')
        data1 = {"first_name": "P1", "last_name": "Last", "birth_date": "1990-01-01", "gender": "M"}
        data2 = {"first_name": "P2", "last_name": "Last", "birth_date": "1990-01-02", "gender": "F"}
        
        r1 = api_client.post(url, data1)
        r2 = api_client.post(url, data2)
        
        id1 = r1.data.get('internal_id') or r1.data['patient']['internal_id']
        id2 = r2.data.get('internal_id') or r2.data['patient']['internal_id']
        
        assert id1 != id2
        # Use regex or just check they are different and end with digits
        assert id1[-4:].isdigit()
        assert id2[-4:].isdigit()
        assert int(id2[-4:]) == int(id1[-4:]) + 1

    def test_patient_role_cannot_create_record(self, api_client, patient_user):
        api_client.force_authenticate(user=patient_user)
        url = reverse('patient-list')
        data = {"first_name": "X", "last_name": "Y", "birth_date": "1990-01-01", "gender": "M"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_secretary_can_create_patient(self, api_client, secretaire_user):
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('patient-list')
        data = {"first_name": "Sec", "last_name": "Test", "birth_date": "1990-01-01", "gender": "F"}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_destroy_returns_405(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        patient = PatientFactory()
        url = reverse('patient-detail', args=[patient.id])
        response = api_client.delete(url)
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_duplicate_detection_returns_warning(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        existing = PatientFactory(first_name="Marc", last_name="Sartre", birth_date="1950-05-05")
        
        url = reverse('patient-list')
        data = {
            "first_name": "Marc",
            "last_name": "Sartre",
            "birth_date": "1950-05-05",
            "gender": "M"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['warning'] == "Doublon potentiel détecté"
        assert len(response.data['duplicates']) == 1

    def test_archive_patient_without_future_appointments(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        patient = PatientFactory()
        url = reverse('patient-archive', args=[patient.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        patient.refresh_from_db()
        assert patient.is_archived is True

    def test_archive_patient_with_future_appointment_returns_400(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        patient = PatientFactory()
        # Mocking appt check logic here as we haven't built appointments model yet in this script loop
        # We'll assume the model logic works as intended via the validator
        # In a real test, we'd create the appointment here.
        # Since I'm writing all files, I'll assume the appointment app will exist.
        
        from apps.appointments.models import Appointment
        Appointment.objects.create(
            patient=patient,
            doctor=medecin_user,
            start_datetime=timezone.now() + timedelta(days=1),
            end_datetime=timezone.now() + timedelta(days=1, minutes=30),
            status='PLANNED'
        )
        
        url = reverse('patient-archive', args=[patient.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "RDV futur planifié" in response.data['detail']

    def test_patient_list_is_paginated(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        PatientFactory.create_batch(25)
        url = reverse('patient-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'count' in response.data
        assert 'next' in response.data
        assert len(response.data['results']) == 20

    def test_search_by_name_filters_results(self, api_client, medecin_user):
        api_client.force_authenticate(user=medecin_user)
        PatientFactory(first_name="Amine", last_name="Benali")
        PatientFactory(first_name="John", last_name="Doe")
        
        url = reverse('patient-list') + "?search=Benali"
        response = api_client.get(url)
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['last_name'] == "Benali"
