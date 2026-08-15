import pytest
from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from apps.prescriptions.tests.factories import PrescriptionFactory
from apps.prescriptions.pdf_generator import generate_prescription_pdf

@pytest.fixture(autouse=True)
def mock_weasyprint():
    with patch('apps.prescriptions.pdf_generator.WEASYPRINT_AVAILABLE', False):
        yield

@pytest.mark.django_db
class TestPDFGeneration:
    """Tests for Prescription PDF generation."""

    def test_generate_pdf_returns_bytes(self):
        """generate_prescription_pdf() returns non-empty bytes starting with %PDF."""
        prescription = PrescriptionFactory()
        pdf_bytes = generate_prescription_pdf(prescription)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b'%PDF')

    def test_cancelled_pdf_generates_without_error(self):
        """generate_prescription_pdf(prescription, cancelled=True) completes without exception."""
        prescription = PrescriptionFactory(is_cancelled=True)
        pdf_bytes = generate_prescription_pdf(prescription, cancelled=True)
        assert pdf_bytes.startswith(b'%PDF')

    def test_pdf_endpoint_returns_pdf_content_type(self, api_client, medecin_user):
        """GET /api/prescriptions/{id}/pdf/ returns Content-Type: application/pdf."""
        prescription = PrescriptionFactory(doctor=medecin_user)
        api_client.force_authenticate(user=medecin_user)
        url = reverse('prescription-pdf', args=[prescription.id])
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'application/pdf'

    def test_pdf_endpoint_sets_pdf_path_on_prescription(self, api_client, medecin_user):
        """After GET /api/prescriptions/{id}/pdf/, the prescription's pdf_path field is populated."""
        prescription = PrescriptionFactory(doctor=medecin_user)
        assert not prescription.pdf_path
        
        api_client.force_authenticate(user=medecin_user)
        url = reverse('prescription-pdf', args=[prescription.id])
        api_client.get(url)
        
        prescription.refresh_from_db()
        assert prescription.pdf_path
        assert prescription.pdf_path.endswith('.pdf')
