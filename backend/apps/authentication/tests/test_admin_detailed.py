import pytest
from django.urls import reverse
from rest_framework import status
from apps.authentication.models import User
from apps.authentication.tests.factories import UserFactory

@pytest.mark.django_db
class TestAdminDetailed:
    def test_admin_can_retrieve_user_detail(self, api_client, admin_user):
        user = UserFactory()
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-detail', args=[user.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == user.email

    def test_admin_can_update_user_detail(self, api_client, admin_user):
        user = UserFactory(first_name="Old")
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-user-detail', args=[user.id])
        response = api_client.patch(url, {"first_name": "New"})
        assert response.status_code == status.HTTP_200_OK
        user.refresh_from_db()
        assert user.first_name == "New"
        
    def test_admin_user_not_found_on_activate(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        # Using a likely non-existent UUID
        import uuid
        url = reverse('authentication:admin-user-activate', args=[uuid.uuid4()])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    def test_admin_user_not_found_on_deactivate(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        import uuid
        url = reverse('authentication:admin-user-deactivate', args=[uuid.uuid4()])
        response = api_client.post(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_admin_cannot_change_own_role(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-change-role', args=[admin_user.id])
        response = api_client.post(url, {"role": "MEDECIN"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_admin_invalid_role(self, api_client, admin_user):
        user = UserFactory()
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-change-role', args=[user.id])
        response = api_client.post(url, {"role": "INVALID_ROLE"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_invalid_password_reset(self, api_client, admin_user):
        user = UserFactory()
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:admin-reset-password', args=[user.id])
        response = api_client.post(url, {"new_password": "short"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
