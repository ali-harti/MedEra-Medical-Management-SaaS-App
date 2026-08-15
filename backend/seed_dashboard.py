import os
import django
import sys
import random
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation

User = get_user_model()

def seed():
    doctor = User.objects.filter(role='MEDECIN').first()
    if not doctor:
        print("No doctor found")
        return

    # Ensure some patients exist
    patients = list(Patient.objects.all()[:5])
    if not patients:
        for i in range(5):
            p = Patient.objects.create(
                first_name=f"Patient{i}",
                last_name="Test",
                gender='M',
                phone=f"06000000{i}"
            )
            patients.append(p)
            
    now = timezone.now()

    # Clear old dashboard test data if needed (optional, let's just inject)
    
    print("Seeding past data for charts (Last Year / All Time)...")
    # Generate ~60 consultations spread across the last 14 months
    for i in range(60):
        days_ago = random.randint(1, 400)
        past_date = now - timedelta(days=days_ago)
        p = random.choice(patients)
        
        # We don't necessarily need an appointment for every historical consultation
        # but let's create it for consistency
        apt = Appointment.objects.create(
            doctor=doctor,
            patient=p,
            start_datetime=past_date,
            status='COMPLETED',
            motive='Routine checkup'
        )
        
        c = Consultation.objects.create(
            doctor=doctor,
            patient=p,
            appointment=apt,
            status='FINALIZED',
            motive='Routine checkup'
        )
        # Override auto_now_add for created_at
        Consultation.objects.filter(id=c.id).update(created_at=past_date, finalized_at=past_date)

    print("Seeding data for Last 30 Days / 7 Days...")
    for i in range(15):
        days_ago = random.randint(1, 28)
        past_date = now - timedelta(days=days_ago)
        p = random.choice(patients)
        
        apt = Appointment.objects.create(
            doctor=doctor,
            patient=p,
            start_datetime=past_date,
            status='COMPLETED',
            motive='Follow-up'
        )
        c = Consultation.objects.create(
            doctor=doctor,
            patient=p,
            appointment=apt,
            status='FINALIZED',
            motive='Follow-up'
        )
        Consultation.objects.filter(id=c.id).update(created_at=past_date, finalized_at=past_date)
        
    print("Seeding Today's Agenda...")
    # Add a couple of appointments for today
    today_start = now.replace(hour=10, minute=0, second=0)
    for i, status in enumerate(['CONFIRMED', 'PLANNED', 'PENDING', 'IN_PROGRESS', 'CANCELLED']):
        apt_time = today_start + timedelta(hours=i)
        Appointment.objects.create(
            doctor=doctor,
            patient=random.choice(patients),
            start_datetime=apt_time,
            status=status,
            motive=f'Checkup {status}'
        )

    print("Data seeding completed successfully!")

if __name__ == '__main__':
    seed()
