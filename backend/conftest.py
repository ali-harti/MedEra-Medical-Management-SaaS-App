"""Root pytest conftest.py for Medera backend."""
import django
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient




@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def physician(db):
    User = get_user_model()
    return User.objects.create_user(
        email="doctor@medera.test",
        password="TestPass123!",
        first_name="Dr. Test",
        last_name="Physician",
        specialty="General Medicine",
        role='MEDECIN',
        is_active=True,
    )


@pytest.fixture
def auth_client(api_client, physician):
    """Return authenticated APIClient for the test physician."""
    api_client.force_authenticate(user=physician)
    return api_client
