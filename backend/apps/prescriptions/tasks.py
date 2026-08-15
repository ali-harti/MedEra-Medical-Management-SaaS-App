import base64
import logging
import requests
import os
from celery import shared_task
from django.conf import settings
from .models import Prescription
from .pdf_generator import generate_prescription_pdf

logger = logging.getLogger(__name__)

@shared_task
def deliver_prescription_task(prescription_id):
    """
    Automated delivery of prescription via Email and WhatsApp.
    Uses MedEra infrastructure (Internal API).
    """
    try:
        prescription = Prescription.objects.select_related('patient', 'doctor', 'consultation').get(id=prescription_id)
        patient = prescription.patient
        doctor = prescription.doctor

        # 1. Generate PDF
        pdf_bytes = generate_prescription_pdf(prescription)
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

        # 2. Prepare Internal Email Call
        internal_secret = "medera-internal-secret-token-dev"
        internal_url = "http://backend:8000/api/internal/send-email/"
        
        email_body = f"""
        <html>
        <body>
            <h2>Bonjour {patient.first_name},</h2>
            <p>Votre ordonnance établie par le Dr. {doctor.last_name} est disponible.</p>
            <p>Vous trouverez le document PDF en pièce jointe.</p>
            <br>
            <p>L'équipe MedEra</p>
        </body>
        </html>
        """
        
        email_data = {
            "to_email": patient.email,
            "subject": f"Votre ordonnance MedEra - Dr. {doctor.last_name}",
            "html_body": email_body,
            "attachment_base64": pdf_base64,
            "attachment_filename": f"Ordonnance_{prescription.id}.pdf"
        }
        
        headers = {"X-Internal-Secret": internal_secret}
        
        # Call internal email service
        try:
            requests.post(internal_url, json=email_data, headers=headers, timeout=10)
        except Exception as e:
            logger.error(f"Failed to call internal email for prescription {prescription_id}: {e}")

        # 3. WhatsApp Delivery (via WhatsApp Microservice Internal Call if exists, or direct Meta call)
        # Assuming whatsapp_service has an internal delivery endpoint
        whatsapp_url = "http://whatsapp_service:5005/api/internal/send-document"
        whatsapp_data = {
            "phone_number": patient.phone,
            "caption": f"Bonjour {patient.first_name}, voici votre ordonnance du Dr. {doctor.last_name}.",
            "file_base64": pdf_base64,
            "filename": f"Ordonnance_{prescription.id}.pdf"
        }
        
        try:
            requests.post(whatsapp_url, json=whatsapp_data, headers=headers, timeout=10)
        except Exception as e:
            logger.error(f"Failed to call WhatsApp delivery for prescription {prescription_id}: {e}")

        return f"Prescription {prescription_id} delivered."

    except Prescription.DoesNotExist:
        logger.error(f"Prescription {prescription_id} not found.")
    except Exception as e:
        logger.error(f"Error delivering prescription {prescription_id}: {e}")
