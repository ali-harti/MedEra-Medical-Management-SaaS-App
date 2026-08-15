import pytest
from django.urls import reverse
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from apps.consultations.tests.factories import ConsultationFactory

@pytest.mark.django_db
class TestFollowup:
    """Tests for UC-MEDECIN-12: Schedule follow-up from consultation."""

    def test_medecin_can_schedule_followup_from_consultation(self, api_client):
        """POST /api/consultations/{id}/schedule_followup/ creates a FOLLOW_UP appointment."""
        consultation = ConsultationFactory(status='FINALIZED', diagnosis="Gripe A")
        doctor = consultation.doctor
        api_client.force_authenticate(user=doctor)
        
        url = reverse('consultation-schedule-followup', args=[consultation.id])
        next_week = timezone.now() + timedelta(days=14)
        data = {"start_datetime": next_week.isoformat()}
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['appointment_type'] == 'FOLLOW_UP'
        assert "Gripe A" in response.data['motive']

    def test_followup_appointment_links_correct_patient(self, api_client):
        """The created follow-up appointment has the same patient as consultation."""
        consultation = ConsultationFactory(status='FINALIZED')
        api_client.force_authenticate(user=consultation.doctor)
        
        url = reverse('consultation-schedule-followup', args=[consultation.id])
        data = {"start_datetime": (timezone.now() + timedelta(days=15)).isoformat()}
        
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert str(response.data['patient']) == str(consultation.patient.id)

    def test_followup_without_start_datetime_returns_400(self, api_client):
        """POST /api/consultations/{id}/schedule_followup/ without start_datetime returns 400."""
        consultation = ConsultationFactory()
        api_client.force_authenticate(user=consultation.doctor)
        
        url = reverse('consultation-schedule-followup', args=[consultation.id])
        response = api_client.post(url, {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
