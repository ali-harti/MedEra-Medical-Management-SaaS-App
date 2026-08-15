import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestRBAC:
    """Explicit RBAC enforcement tests for Consultations and Prescriptions."""

    def test_secretaire_cannot_list_consultations(self, api_client, secretaire_user):
        """GET /api/consultations/ as SECRETAIRE returns 403."""
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('consultation-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_secretaire_cannot_create_consultation(self, api_client, secretaire_user):
        """POST /api/consultations/ as SECRETAIRE returns 403."""
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('consultation-list')
        response = api_client.post(url, {})
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_secretaire_cannot_access_prescriptions(self, api_client, secretaire_user):
        """GET /api/prescriptions/ as SECRETAIRE returns 403."""
        api_client.force_authenticate(user=secretaire_user)
        url = reverse('prescription-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_patient_role_cannot_access_consultations(self, api_client, patient_user):
        """GET /api/consultations/ as PATIENT returns 403."""
        api_client.force_authenticate(user=patient_user)
        url = reverse('consultation-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
