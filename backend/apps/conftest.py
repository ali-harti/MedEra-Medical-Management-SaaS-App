import pytest
from apps.authentication.tests.factories import UserFactory

@pytest.fixture
def admin_user(db):
    return UserFactory(role='ADMIN')

@pytest.fixture
def medecin_user(db):
    return UserFactory(role='MEDECIN')

@pytest.fixture
def secretaire_user(db):
    return UserFactory(role='SECRETAIRE')

@pytest.fixture
def patient_user(db):
    return UserFactory(role='PATIENT')

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()
