from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import requests as http_requests
from .models import Prescription

@receiver(post_save, sender=Prescription)
def send_prescription_notification(sender, instance, created, **kwargs):
    if created:
        consultation = instance.consultation
        appointment = consultation.appointment
        patient = appointment.patient
        doctor = appointment.doctor
        
        if patient and patient.phone and instance.pdf_path:
            whatsapp_url = f"{getattr(settings, 'WHATSAPP_AGENT_URL', 'http://whatsapp_agent:8001')}/send-notification"
            
            # Construct full public URL for the PDF
            base_url = getattr(settings, 'BACKEND_PUBLIC_URL', 'http://localhost:8000')
            pdf_url = f"{base_url}{settings.MEDIA_URL}{instance.pdf_path}"
            
            payload = {
                "whatsapp_number": patient.phone,
                "event": "prescription_ready",
                "prescription_url": pdf_url,
                "doctor_name": f"Dr. {doctor.last_name}"
            }
            
            try:
                # We use timeout=5 so it doesn't block the save operation too long
                http_requests.post(whatsapp_url, json=payload, timeout=5)
            except Exception:
                pass
