import pytest
from django.urls import reverse
from rest_framework import status
from apps.authentication.models import User

@pytest.mark.django_db
class TestAdminAPI:
    """Tests for Admin User Management API."""

    def test_admin_can_list_users(self, api_client, admin_user):
        """GET /api/auth/admin/users/ as ADMIN returns 200 with list of all users."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Should contain at least the admin user
        assert len(response.data['results']) >= 1

    def test_non_admin_cannot_list_users(self, api_client, medecin_user):
        """GET /api/auth/admin/users/ as MEDECIN returns 403."""
        api_client.force_authenticate(user=medecin_user)
        url = reverse('authentication:admin-user-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_create_medecin_account(self, api_client, admin_user):
        """POST /api/auth/admin/users/ with role=MEDECIN creates a new user and returns 201."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-list')
        data = {
            "email": "new_doc@medera.com",
            "first_name": "New",
            "last_name": "Doctor",
            "role": "MEDECIN",
            "password": "Password123!"
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(email="new_doc@medera.com").exists()

    def test_admin_can_activate_deactivated_account(self, api_client, admin_user):
        """POST /api/auth/admin/users/{id}/activate/ sets is_active=True and returns 200."""
        user = User.objects.create_user(email="inactive@test.com", password="pwd", is_active=False)
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-activate', args=[user.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_active is True

    def test_admin_can_deactivate_account(self, api_client, admin_user):
        """POST /api/auth/admin/users/{id}/deactivate/ sets is_active=False and returns 200."""
        user = User.objects.create_user(email="active@test.com", password="pwd", is_active=True)
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-deactivate', args=[user.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.is_active is False

    def test_admin_cannot_deactivate_self(self, api_client, admin_user):
        """POST /api/auth/admin/users/{admin_id}/deactivate/ where target is the requesting admin returns 400."""
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-deactivate', args=[admin_user.id])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_can_reset_password(self, api_client, admin_user):
        """POST /api/auth/admin/users/{id}/reset-password/ with valid new_password sets the password and returns 200."""
        user = User.objects.create_user(email="reset@test.com", password="OldPassword123!")
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-reset-password', args=[user.id])
        data = {"new_password": "NewPassword456!"}
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        # Check if login works with new password
        payload = {"email": "reset@test.com", "password": "NewPassword456!"}
        login_url = reverse('authentication:token_obtain_pair')
        login_response = api_client.post(login_url, payload)
        assert login_response.status_code == status.HTTP_200_OK

    def test_admin_can_change_role(self, api_client, admin_user):
        """POST /api/auth/admin/users/{id}/role/ with valid role updates the user's role and returns 200."""
        user = User.objects.create_user(email="change_role@test.com", password="pwd", role="PATIENT")
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-change-role', args=[user.id])
        data = {"role": "MEDECIN"}
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.role == "MEDECIN"
