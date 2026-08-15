"""
MedEra — Moroccan Seed Data Script v2
===================================
Expands database with realistic Moroccan medical data.
"""

import os
import sys
import django
import random
from datetime import date, timedelta
from decimal import Decimal

sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.utils import timezone
from apps.authentication.models import User
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription, MedicationLine
from apps.billing.models import Billing
from apps.messaging.models import Thread, Message
from django.db import transaction

print("=== STARTING SEED V2 ===")

try:
    doctor = User.objects.get(email='medecin@medera.com')
    secretary = User.objects.get(email='secretaire@medera.com')
    main_patient = User.objects.get(email='patient@medera.com')
    
    # Update doctor name
    if doctor.first_name == 'Dr. Karim':
        doctor.first_name = 'Karim'
        doctor.save()
        print("Updated doctor's first name to Karim")

    # Link secretary to doctor
    if secretary.employer != doctor:
        secretary.employer = doctor
        secretary.save()
        print("Linked Secretary to Doctor")

except User.DoesNotExist as e:
    print(f"[ERROR] Missing account: {e}")
    sys.exit(1)

def dt(days_offset, hour=9, minute=0):
    return timezone.now().replace(
        hour=hour, minute=minute, second=0, microsecond=0
    ) + timedelta(days=days_offset)

with transaction.atomic():
    print("Seeding Patients...")
    patients_data = [
        {'fn': 'Youssef', 'ln': 'Alami', 'dob': date(1988, 4, 15), 'gender': 'MALE', 'bg': 'A+', 'ins': 'CNOPS'},
        {'fn': 'Fatima', 'ln': 'Berrada', 'dob': date(1975, 9, 22), 'gender': 'FEMALE', 'bg': 'O+', 'ins': 'CNSS'},
        {'fn': 'Mohammed', 'ln': 'Chraibi', 'dob': date(1990, 12, 3), 'gender': 'MALE', 'bg': 'B+', 'ins': 'SAHAM'},
        {'fn': 'Khadija', 'ln': 'Tazi', 'dob': date(1982, 5, 11), 'gender': 'FEMALE', 'bg': 'AB+', 'ins': 'RMA'},
        {'fn': 'Omar', 'ln': 'Benjelloun', 'dob': date(1965, 8, 30), 'gender': 'MALE', 'bg': 'O-', 'ins': 'CNSS'},
        {'fn': 'Amina', 'ln': 'El Fassi', 'dob': date(1995, 2, 14), 'gender': 'FEMALE', 'bg': 'A-', 'ins': 'CNOPS'},
        {'fn': 'Rachid', 'ln': 'Bennani', 'dob': date(1978, 11, 20), 'gender': 'MALE', 'bg': 'B-', 'ins': 'None'},
        {'fn': 'Leila', 'ln': 'Amrani', 'dob': date(1989, 7, 5), 'gender': 'FEMALE', 'bg': 'A+', 'ins': 'AXA'},
        {'fn': 'Hassan', 'ln': 'Iraqui', 'dob': date(1955, 3, 25), 'gender': 'MALE', 'bg': 'O+', 'ins': 'CNSS'},
        {'fn': 'Nadia', 'ln': 'Lahlou', 'dob': date(1992, 10, 18), 'gender': 'FEMALE', 'bg': 'AB-', 'ins': 'SAHAM'},
        {'fn': 'Tarik', 'ln': 'Bouabid', 'dob': date(1985, 6, 8), 'gender': 'MALE', 'bg': 'B+', 'ins': 'CNOPS'},
        {'fn': 'Samira', 'ln': 'Guessous', 'dob': date(1970, 1, 12), 'gender': 'FEMALE', 'bg': 'O-', 'ins': 'RMA'},
        {'fn': 'Adil', 'ln': 'Zniber', 'dob': date(1980, 9, 3), 'gender': 'MALE', 'bg': 'A+', 'ins': 'AXA'},
        {'fn': 'Meryem', 'ln': 'Bennis', 'dob': date(1998, 4, 27), 'gender': 'FEMALE', 'bg': 'B-', 'ins': 'None'},
        {'fn': 'Khalid', 'ln': 'Kettani', 'dob': date(1960, 12, 15), 'gender': 'MALE', 'bg': 'AB+', 'ins': 'CNSS'}
    ]

    patients = []
    for i, p_data in enumerate(patients_data):
        user_val = main_patient if i == 0 else None
        p, _ = Patient.objects.get_or_create(
            first_name=p_data['fn'],
            last_name=p_data['ln'],
            birth_date=p_data['dob'],
            defaults={
                'internal_id': f"PAT-{timezone.now().strftime('%Y%m%d')}-{random.randint(1000,9999)}",
                'created_by': secretary,
                'user': user_val,
                'gender': p_data['gender'],
                'blood_type': p_data['bg'],
                'insurance': p_data['ins'],
                'phone': f"066{random.randint(1000000, 9999999)}"
            }
        )
        if p.blood_type != p_data['bg']:
            p.blood_type = p_data['bg']
            p.save()
        patients.append(p)

    print("Seeding Appointments...")
    rooms = ["Salle 1", "Salle 2", "Salle 3"]
    appts = []
    
    # Generate 35 appointments (past, present, future)
    for i in range(35):
        pat = random.choice(patients)
        days_offset = random.randint(-14, 14)
        hour = random.randint(8, 17)
        status_pool = ['COMPLETED'] if days_offset < 0 else ['PLANNED', 'CONFIRMED', 'CANCELLED']
        if days_offset == 0:
            status_pool = ['CONFIRMED', 'IN_PROGRESS', 'DONE']
            
        status = random.choice(status_pool)
        a_type = random.choice(['FIRST', 'FOLLOW_UP', 'EMERGENCY'])
        motives = {
            'FIRST': 'Première consultation générale',
            'FOLLOW_UP': 'Visite de suivi',
            'EMERGENCY': 'Urgence - Douleur aiguë'
        }
        
        start = dt(days_offset, hour, 0)
        end = start + timedelta(minutes=30)
        
        a, _ = Appointment.objects.get_or_create(
            patient=pat, doctor=doctor, start_datetime=start,
            defaults={
                'end_datetime': end,
                'duration_minutes': 30,
                'motive': motives[a_type],
                'appointment_type': a_type,
                'status': status,
                'created_by': secretary,
                'room': random.choice(rooms)
            }
        )
        appts.append(a)

    print("Seeding Consultations...")
    # Find some completed/in progress appts
    valid_appts = [a for a in appts if a.status in ['COMPLETED', 'DONE', 'IN_PROGRESS']]
    consultations = []
    
    for a in valid_appts[:12]:
        status = 'FINALIZED' if a.status in ['COMPLETED', 'DONE'] else 'IN_PROGRESS'
        exam = {
            'bp': f"{random.randint(110,140)}/{random.randint(70,90)}",
            'hr': random.randint(60, 100),
            'temp': round(random.uniform(36.5, 38.5), 1),
            'weight': random.randint(60, 90),
            'height': random.randint(155, 185),
            'spo2': random.randint(95, 100)
        }
        
        c, _ = Consultation.objects.get_or_create(
            appointment=a, patient=a.patient, doctor=doctor,
            defaults={
                'motive': a.motive,
                'clinical_exam': exam,
                'diagnosis': 'Diagnostic généré par IA / Médecin',
                'status': status,
                'ai_used': True,
                'ai_suggestions': [{"suggestion": "Prescrire Paracétamol"}],
                'finalized_at': a.end_datetime if status == 'FINALIZED' else None
            }
        )
        # Force update exam if it was incomplete
        if not c.clinical_exam or 'temp' not in c.clinical_exam:
            c.clinical_exam = exam
            c.save()
        consultations.append(c)

    print("Seeding Prescriptions & Invoices...")
    finalized_cons = [c for c in consultations if c.status == 'FINALIZED']
    
    for c in finalized_cons[:10]:
        p, created = Prescription.objects.get_or_create(
            consultation=c, patient=c.patient, doctor=doctor,
            defaults={'general_instructions': 'A prendre avec de l\'eau.', 'issued_at': c.finalized_at}
        )
        if created:
            MedicationLine.objects.create(prescription=p, drug_name='Doliprane', dosage='1000mg', form='comprimé', dosology='1 matin/soir', duration_days=5)
            MedicationLine.objects.create(prescription=p, drug_name='Amoxicilline', dosage='500mg', form='gélule', dosology='1 matin/midi/soir', duration_days=7)

        # Invoice
        inv_status = random.choice(['PENDING', 'PAID'])
        Billing.objects.get_or_create(
            consultation=c, patient=c.patient, doctor=doctor,
            defaults={
                'amount_total': Decimal(str(random.randint(150, 800))),
                'status': inv_status,
                'items': [{'description': 'Consultation médicale', 'price': 300}]
            }
        )

    print("Seeding Messages...")
    # Doctor - Patient (instead of Secretary since Thread requires patient)
    conv_pat, _ = Thread.objects.get_or_create(patient=patients[0], doctor=doctor, subject="Suivi Youssef Alami")
    
    if conv_pat.messages.count() == 0:
        Message.objects.create(thread=conv_pat, sender=main_patient, content="Bonjour Docteur, j'ai toujours des maux de tête malgré le traitement.")
        Message.objects.create(thread=conv_pat, sender=doctor, content="Bonjour Youssef. Continuez encore 2 jours, si ça persiste, venez au cabinet.")
        
    # Another Patient thread
    other_pat = patients[1]
    conv_pat2, _ = Thread.objects.get_or_create(patient=other_pat, doctor=doctor, subject="Renouvellement Ordonnance")
    if conv_pat2.messages.count() == 0:
        # If other_pat doesn't have a user, just send from secretary as a proxy for testing
        sender_user = other_pat.user if other_pat.user else secretary
        Message.objects.create(thread=conv_pat2, sender=sender_user, content="Bonjour, je voudrais renouveler mon ordonnance.")
        Message.objects.create(thread=conv_pat2, sender=doctor, content="D'accord, je vous prépare ça.")

print("=== SEEDING COMPLETED ===")
