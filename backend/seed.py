import os
import django
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.authentication.models import User
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from apps.billing.models import Billing

# Get Patient and Doctor
youssef_user = User.objects.get(role='PATIENT', first_name__icontains='Youssef')
youssef_patient = Patient.objects.get(user=youssef_user)
karim = User.objects.get(role='MEDECIN', first_name__icontains='Karim')

now = timezone.now()

# 1. Create Demands (Appointments with status='REQUESTED')
print("Creating demands...")
Appointment.objects.create(
    patient=youssef_patient,
    doctor=karim,
    start_datetime=now + timedelta(days=2),
    end_datetime=now + timedelta(days=2, minutes=30),
    appointment_type='FIRST',
    status='REQUESTED',
    motive='General Checkup'
)

Appointment.objects.create(
    patient=youssef_patient,
    doctor=karim,
    start_datetime=now + timedelta(days=4),
    end_datetime=now + timedelta(days=4, minutes=30),
    appointment_type='FOLLOW_UP',
    status='REQUESTED',
    motive='Follow-up for previous treatment'
)

# 2. Create Appointments for TODAY (status='PLANNED')
print("Creating today appointments...")
Appointment.objects.create(
    patient=youssef_patient,
    doctor=karim,
    start_datetime=now.replace(hour=10, minute=0, second=0, microsecond=0),
    end_datetime=now.replace(hour=10, minute=30, second=0, microsecond=0),
    appointment_type='FIRST',
    status='PLANNED',
    motive='Routine Check'
)

Appointment.objects.create(
    patient=youssef_patient,
    doctor=karim,
    start_datetime=now.replace(hour=14, minute=0, second=0, microsecond=0),
    end_datetime=now.replace(hour=14, minute=30, second=0, microsecond=0),
    appointment_type='FOLLOW_UP',
    status='PLANNED',
    motive='Test Results Review'
)

# 3. Create Pending Bills (Billing with status='UNPAID')
print("Creating pending bills...")
Billing.objects.create(
    invoice_number='INV-2026-001',
    patient=youssef_patient,
    doctor=karim,
    amount_total=300.00,
    amount_paid=0.00,
    status='UNPAID',
    items=[{"description": "Consultation", "amount": 300.00}]
)

Billing.objects.create(
    invoice_number='INV-2026-002',
    patient=youssef_patient,
    doctor=karim,
    amount_total=150.00,
    amount_paid=0.00,
    status='UNPAID',
    items=[{"description": "Blood Test", "amount": 150.00}]
)

Billing.objects.create(
    invoice_number='INV-2026-003',
    patient=youssef_patient,
    doctor=karim,
    amount_total=450.00,
    amount_paid=0.00,
    status='UNPAID',
    items=[{"description": "MRI Scan", "amount": 450.00}]
)

print("Seed completed successfully.")
