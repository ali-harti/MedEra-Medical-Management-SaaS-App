import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation
from apps.patients.models import Patient
from django.utils import timezone
from datetime import timedelta

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def doctor_user():
    user = User.objects.create_user(email='testdoc@medera.com', password='password123', role='MEDECIN')
    return user

@pytest.fixture
def auth_client(api_client, doctor_user):
    api_client.force_authenticate(user=doctor_user)
    return api_client

@pytest.mark.django_db
def test_dashboard_kpis(auth_client, doctor_user):
    url = reverse('dashboard-kpis')
    
    # Create patient
    p = Patient.objects.create(
        first_name='Test', 
        last_name='Patient', 
        birth_date='1990-01-01',
        gender='M',
        phone='0600000000',
        created_by=doctor_user
    )
    
    # Create appointment today
    now = timezone.now()
    Appointment.objects.create(
        doctor=doctor_user, 
        patient=p, 
        start_datetime=now,
        status='CONFIRMED',
        motive='Test'
    )
    
    # Create Consultation
    Consultation.objects.create(doctor=doctor_user, patient=p, status='DRAFT')
    
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data['appointments_today'] == 1
    assert data['active_patients'] == 1
    assert data['pending_consultations'] == 1
    assert data['draft_count'] == 1

@pytest.mark.django_db
def test_dashboard_trend(auth_client, doctor_user):
    url = reverse('dashboard-weekly-trend')
    response = auth_client.get(url, {'period': '7d'})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 7

@pytest.mark.django_db
def test_dashboard_agenda(auth_client, doctor_user):
    url = reverse('dashboard-agenda')
    
    p = Patient.objects.create(
        first_name='John', 
        last_name='Doe', 
        birth_date='1990-01-01',
        gender='M',
        phone='0600000000',
        created_by=doctor_user
    )
    Appointment.objects.create(
        doctor=doctor_user, 
        patient=p, 
        start_datetime=timezone.now(),
        status='CONFIRMED',
        motive='Follow-up'
    )
    
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['patient_name'] == 'John Doe'
    assert data[0]['status'] == 'CONFIRMED'

@pytest.mark.django_db
def test_dashboard_top_diagnoses(auth_client, doctor_user):
    url = reverse('dashboard-top-diagnoses')
    p = Patient.objects.create(
        first_name='John', 
        last_name='Doe', 
        birth_date='1990-01-01',
        gender='M',
        phone='0600000000',
        created_by=doctor_user
    )
    Consultation.objects.create(doctor=doctor_user, patient=p, status='FINALIZED', diagnosis='Grippe')
    
    response = auth_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert 'data' in data
    assert len(data['data']) == 1
    assert data['data'][0]['diagnosis'] == 'Grippe'
