import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from apps.authentication.tests.factories import UserFactory
from apps.patients.tests.factories import PatientFactory

@pytest.mark.django_db
class TestAdminBypass:
    """Tests for ADMIN bypass of business rules (past dates)."""

    def test_admin_can_create_appointment_in_past(self, api_client):
        """POST /api/appointments/ as ADMIN with start_datetime in the past returns 201."""
        admin = UserFactory(role='ADMIN', is_staff=True)
        patient = PatientFactory()
        api_client.force_authenticate(user=admin)
        
        past_time = timezone.now() - timedelta(days=5)
        url = reverse('appointment-list')
        data = {
            "patient": str(patient.id),
            "doctor": str(admin.id),
            "start_datetime": past_time.isoformat(),
            "end_datetime": (past_time + timedelta(minutes=30)).isoformat(),
            "appointment_type": "FIRST",
            "status": "PLANNED",
            "motive": "Contrôle annuel"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_medecin_cannot_create_appointment_in_past(self, api_client):
        """POST /api/appointments/ as MEDECIN with start_datetime in the past returns 400."""
        doctor = UserFactory(role='MEDECIN')
        patient = PatientFactory()
        api_client.force_authenticate(user=doctor)
        
        past_time = timezone.now() - timedelta(days=1)
        url = reverse('appointment-list')
        data = {
            "patient": str(patient.id),
            "doctor": str(doctor.id),
            "start_datetime": past_time.isoformat(),
            "end_datetime": (past_time + timedelta(minutes=30)).isoformat(),
            "appointment_type": "FIRST",
            "motive": "Douleur dos"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "futur" in str(response.data)

    def test_secretaire_cannot_create_appointment_in_past(self, api_client):
        """POST /api/appointments/ as SECRETAIRE with start_datetime in the past returns 400."""
        staff = UserFactory(role='SECRETAIRE')
        doctor = UserFactory(role='MEDECIN')
        patient = PatientFactory()
        api_client.force_authenticate(user=staff)
        
        past_time = timezone.now() - timedelta(hours=2)
        url = reverse('appointment-list')
        data = {
            "patient": str(patient.id),
            "doctor": str(doctor.id),
            "start_datetime": past_time.isoformat(),
            "end_datetime": (past_time + timedelta(minutes=30)).isoformat(),
            "appointment_type": "FIRST",
            "motive": "Vaccination"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
