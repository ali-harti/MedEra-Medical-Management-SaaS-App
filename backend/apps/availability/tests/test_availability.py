import pytest
from django.urls import reverse
from rest_framework import status
from apps.availability.models import DoctorAvailability
import factory

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = factory.django.get_model('authentication', 'User')
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'MEDECIN'
    is_active = True

class AvailabilityFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DoctorAvailability
    doctor = factory.SubFactory(UserFactory)
    day_of_week = 0 # Monday
    start_time = '09:00:00'
    end_time = '17:00:00'
    consultation_types = ['PRESENTIEL']
    is_active = True

@pytest.fixture
def medecin(db):
    return UserFactory(role='MEDECIN')

@pytest.fixture
def availability(db, medecin):
    return AvailabilityFactory(doctor=medecin)

@pytest.mark.django_db
class TestAvailability:
    def test_manage_availability(self, api_client, medecin):
        api_client.force_authenticate(user=medecin)
        url = '/api/availability/settings/'
        data = {
            'day_of_week': 1,
            'start_time': '10:00:00',
            'end_time': '18:00:00',
            'consultation_types': ['PRESENTIEL']
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert DoctorAvailability.objects.filter(doctor=medecin).count() == 1

    def test_public_directory(self, api_client, availability):
        url = '/api/availability/directory/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Handle pagination
        results = response.data.get('results', response.data)
        assert len(results) >= 1
        assert results[0]['full_name'] is not None
