import pytest
from django.urls import reverse
from rest_framework import status
from apps.messaging.models import Thread, Message
from apps.messaging.tests.factories import ThreadFactory, UserFactory, PatientFactory

@pytest.fixture
def medecin(db):
    return UserFactory(role='MEDECIN')

@pytest.fixture
def patient_obj(db):
    return PatientFactory()

@pytest.fixture
def thread(db, medecin, patient_obj):
    return ThreadFactory(doctor=medecin, patient=patient_obj)

@pytest.mark.django_db
class TestMessaging:
    def test_list_threads(self, api_client, medecin, thread):
        api_client.force_authenticate(user=medecin)
        url = '/api/messaging/threads/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        results = response.data.get('results', response.data)
        assert len(results) >= 1

    def test_reply_to_thread(self, api_client, medecin, thread):
        api_client.force_authenticate(user=medecin)
        url = f'/api/messaging/threads/{thread.id}/reply/'
        data = {'content': 'Hello from doctor'}
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Message.objects.filter(thread=thread).count() == 1

    def test_close_thread(self, api_client, medecin, thread):
        api_client.force_authenticate(user=medecin)
        url = f'/api/messaging/threads/{thread.id}/close/'
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        thread.refresh_from_db()
        assert thread.is_closed is True
