from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import requests as http_requests
from django.conf import settings
from .models import Appointment

def _send_reminder(appointment, event_type):
    patient = appointment.patient
    if not patient or not patient.phone:
        return False
        
    doctor = appointment.doctor
    whatsapp_url = f"{getattr(settings, 'WHATSAPP_AGENT_URL', 'http://whatsapp_agent:8001')}/send-notification"
    
    payload = {
        "whatsapp_number": patient.phone,
        "event": event_type,
        "appointment_datetime": appointment.start_datetime.strftime('%d/%m/%Y à %H:%M'),
        "doctor_name": f"Dr. {doctor.last_name}"
    }
    
    try:
        r = http_requests.post(whatsapp_url, json=payload, timeout=10)
        return r.status_code == 200
    except Exception:
        return False

@shared_task
def send_24h_reminders():
    """Find appointments starting in ~24 hours and send reminders."""
    now = timezone.now()
    # Check window between 23h45m and 24h15m from now
    start_window = now + timedelta(hours=23, minutes=45)
    end_window = now + timedelta(hours=24, minutes=15)
    
    appointments = Appointment.objects.filter(
        status__in=['PLANNED', 'CONFIRMED'],
        start_datetime__gte=start_window,
        start_datetime__lte=end_window
    )
    
    sent_count = 0
    for appt in appointments:
        if _send_reminder(appt, "reminder_24h"):
            sent_count += 1
            
    return f"Sent {sent_count} 24h reminders"

@shared_task
def send_1h_reminders():
    """Find appointments starting in ~1 hour and send reminders."""
    now = timezone.now()
    # Check window between 55m and 65m from now
    start_window = now + timedelta(minutes=55)
    end_window = now + timedelta(minutes=65)
    
    appointments = Appointment.objects.filter(
        status__in=['PLANNED', 'CONFIRMED'],
        start_datetime__gte=start_window,
        start_datetime__lte=end_window
    )
    
    sent_count = 0
    for appt in appointments:
        if _send_reminder(appt, "reminder_1h"):
            sent_count += 1
            
    return f"Sent {sent_count} 1h reminders"
