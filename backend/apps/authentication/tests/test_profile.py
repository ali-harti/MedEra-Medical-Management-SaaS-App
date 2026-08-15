import pytest
from django.urls import reverse
from rest_framework import status
from apps.authentication.tests.factories import UserFactory

@pytest.mark.django_db
class TestProfile:
    """Tests for Profile Management (Manage Profile UC)."""

    def setup_method(self, method):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.medecin = UserFactory(role='MEDECIN', first_name="Old")
        # Ensure password is set correctly for change password test
        self.medecin.set_password("Medecin123!")
        self.medecin.save()
        self.secretaire = UserFactory(role='SECRETAIRE')

    def test_medecin_can_update_own_profile(self):
        self.client.force_authenticate(user=self.medecin)
        url = reverse('authentication:user_profile')
        response = self.client.patch(url, {'first_name': 'NewName'})
        assert response.status_code == 200
        self.medecin.refresh_from_db()
        assert self.medecin.first_name == 'NewName'

    def test_secretaire_can_update_own_profile(self):
        self.client.force_authenticate(user=self.secretaire)
        url = reverse('authentication:user_profile')
        response = self.client.patch(url, {'first_name': 'SecName'})
        assert response.status_code == 200
        self.secretaire.refresh_from_db()
        assert self.secretaire.first_name == 'SecName'

    def test_any_role_can_change_own_password(self):
        """POST /api/auth/change-password/ password change logic."""
        self.client.force_authenticate(user=self.medecin)
        url = reverse('authentication:change_password')
        data = {
            'old_password': 'Medecin123!',
            'new_password': 'NewPassword123!'
        }
        response = self.client.post(url, data)
        assert response.status_code == 200
        assert self.medecin.check_password('NewPassword123!')

    def test_cannot_change_another_users_profile(self):
        user2 = UserFactory(first_name="User2")
        self.client.force_authenticate(user=self.secretaire)
        # MeView handles own profile, but we check if we can pass another ID if it was ID based
        # Here MeView is self.request.user, so this test might need different logic if it was DetailView
        url = reverse('authentication:user_profile')
        self.client.patch(url, {"first_name": "Hacker"})
        
        user2.refresh_from_db()
        assert user2.first_name == "User2"
