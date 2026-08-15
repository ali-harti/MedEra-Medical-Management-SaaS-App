import pytest
from django.urls import reverse
from rest_framework import status
from apps.billing.models import Billing
from apps.billing.tests.factories import BillingFactory, UserFactory, PatientFactory

@pytest.fixture
def medecin(db):
    return UserFactory(role='MEDECIN')

@pytest.fixture
def patient(db):
    return PatientFactory()

@pytest.fixture
def billing(db, medecin, patient):
    return BillingFactory(doctor=medecin, patient=patient)

@pytest.mark.django_db
class TestBilling:
    def test_create_billing(self, api_client, medecin, patient):
        api_client.force_authenticate(user=medecin)
        url = reverse('billing-list')
        data = {
            'patient': patient.id,
            'amount_total': '500.00',
            'items': [{'description': 'Consultation', 'price': 500}]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED, response.data
        assert Billing.objects.count() == 1
        assert response.data['invoice_number'].startswith('INV-')

    def test_mark_paid(self, api_client, medecin, billing):
        api_client.force_authenticate(user=medecin)
        url = reverse('billing-mark-paid', kwargs={'pk': billing.id})
        response = api_client.post(url, {'payment_method': 'CARD'})
        assert response.status_code == status.HTTP_200_OK
        billing.refresh_from_db()
        assert billing.status == 'PAID'
        assert billing.payment_method == 'CARD'

    def test_billing_kpis(self, api_client, medecin, billing):
        billing.status = 'PAID'
        billing.save()
        api_client.force_authenticate(user=medecin)
        url = reverse('billing-kpis')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert float(response.data['revenue_today']) > 0
