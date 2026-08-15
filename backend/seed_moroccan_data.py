"""
MedEra — Moroccan Seed Data Script
===================================
Populates the database with realistic Moroccan medical data
for development and demo purposes.

Linked to existing accounts:
  admin@medera.com      → ADMIN
  medecin@medera.com    → MEDECIN
  secretaire@medera.com → SECRETAIRE
  patient@medera.com    → PATIENT
"""

import os
import sys
import django
import random
from datetime import date, timedelta
from decimal import Decimal

# Setup Django environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.utils import timezone
from apps.authentication.models import User
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription, MedicationLine
from django.db import transaction

print("=== STARTING SEED ===")

try:
    admin_user  = User.objects.get(email='admin@medera.com')
    doctor      = User.objects.get(email='medecin@medera.com')
    secretary   = User.objects.get(email='secretaire@medera.com')
    main_patient_user = User.objects.get(email='patient@medera.com')
    print(f"Loaded Core Accounts.")
except User.DoesNotExist as e:
    print(f"[ERROR] Missing account: {e}")
    sys.exit(1)

def dt(days_offset, hour=9, minute=0):
    return timezone.now().replace(
        hour=hour, minute=minute, second=0, microsecond=0
    ) + timedelta(days=days_offset)

with transaction.atomic():
    # 1. Create Patients
    print("Seeding Patients...")
    patients_data = [
        {
            'first_name': 'Youssef', 'last_name': 'Alami',
            'birth_date': date(1988, 4, 15), 'gender': 'MALE',
            'phone': '0661234567', 'email': 'youssef.alami@gmail.com',
            'address': '45 Rue Ibn Battouta, Casablanca', 'blood_type': 'A+',
            'allergies': ['Pénicilline', 'Aspirine'],
            'medical_history': 'Hypertension artérielle diagnostiquée en 2019.',
            'user': main_patient_user
        },
        {
            'first_name': 'Fatima', 'last_name': 'Berrada',
            'birth_date': date(1975, 9, 22), 'gender': 'FEMALE',
            'phone': '0662345678', 'email': 'f.berrada@hotmail.com',
            'address': '12 Boulevard Hassan II, Rabat', 'blood_type': 'O+',
            'allergies': ['Sulfamides'],
            'medical_history': 'Diabète type 2 depuis 2015.',
            'user': None
        },
        {
            'first_name': 'Mohammed', 'last_name': 'Chraibi',
            'birth_date': date(1990, 12, 3), 'gender': 'MALE',
            'phone': '0663456789', 'email': 'mchraibi@gmail.com',
            'address': '78 Rue Mohammed V, Fès', 'blood_type': 'B+',
            'allergies': [],
            'medical_history': 'Asthme allergique depuis l\'enfance.',
            'user': None
        },
    ]

    patients = []
    for p_data in patients_data:
        p, created = Patient.objects.get_or_create(
            first_name=p_data['first_name'],
            last_name=p_data['last_name'],
            birth_date=p_data['birth_date'],
            defaults={
                'internal_id': f"PAT-{timezone.now().strftime('%Y%m%d')}-{random.randint(1000,9999)}",
                'created_by': secretary,
                'user': p_data['user'],
                'gender': p_data['gender'],
                'phone': p_data['phone'],
                'email': p_data['email'],
                'address': p_data['address'],
                'blood_type': p_data['blood_type'],
                'allergies': p_data['allergies'],
                'medical_history': p_data['medical_history'],
            }
        )
        patients.append(p)
        print(f"  - Patient: {p.first_name} {p.last_name}")

    # 2. Create Appointments
    print("Seeding Appointments...")
    appts_data = [
        (patients[0], -30, 9, 'Suivi hypertension', 'COMPLETED', 'FOLLOW_UP'),
        (patients[1], -25, 10, 'Contrôle diabète', 'COMPLETED', 'FOLLOW_UP'),
        (patients[2], -20, 11, 'Crise asthme légère', 'COMPLETED', 'FIRST_VISIT'),
        (patients[0], -5, 11, 'TA élevée — urgence', 'COMPLETED', 'EMERGENCY'),
        (patients[1], 1, 9, 'Glycémie — suivi', 'CONFIRMED', 'FOLLOW_UP'),
        (patients[2], 0, 10, 'Vaccination rappel', 'SCHEDULED', 'FIRST_VISIT'),
        (patients[0], 5, 10, 'Suivi mensuel TA', 'SCHEDULED', 'FOLLOW_UP'),
    ]

    appts = []
    for p, days, hour, motive, status, a_type in appts_data:
        start = dt(days, hour, 0)
        end = start + timedelta(minutes=30)
        a, created = Appointment.objects.get_or_create(
            patient=p, doctor=doctor, start_datetime=start,
            defaults={
                'end_datetime': end,
                'duration_minutes': 30,
                'motive': motive,
                'appointment_type': a_type,
                'status': status,
                'created_by': secretary,
            }
        )
        appts.append(a)
        print(f"  - Appt: {p.first_name} on {start.strftime('%Y-%m-%d')}")

    # 3. Create Consultations
    print("Seeding Consultations...")
    cons_data = [
        {
            'patient': patients[0],
            'appt': appts[0],
            'motive': 'Hypertension artérielle — suivi',
            'anamnesis': 'Patient de 36 ans suivi pour HTA depuis 2019. TA bien contrôlée.',
            'symptoms': ['headache', 'dizziness'],
            'clinical_exam': {'bp': '135/85', 'hr': 72, 'weight': 82},
            'diagnosis': 'Hypertension artérielle essentielle',
            'icd10': 'I10',
            'notes': 'Continuer Amlodipine 5mg. Régime hyposodé.',
            'status': 'FINALIZED',
            'finalized_at': appts[0].start_datetime + timedelta(hours=1),
        },
        {
            'patient': patients[1],
            'appt': appts[1],
            'motive': 'Diabète type 2 — contrôle',
            'anamnesis': 'Patiente de 50 ans, diabétique. HbA1c à 7.2%.',
            'symptoms': ['fatigue', 'excessive_thirst'],
            'clinical_exam': {'bp': '128/82', 'hr': 78, 'weight': 74},
            'diagnosis': 'Diabète sucré type 2',
            'icd10': 'E11',
            'notes': 'Augmenter Metformine à 2g/jour.',
            'status': 'FINALIZED',
            'finalized_at': appts[1].start_datetime + timedelta(hours=1),
        },
        {
            'patient': patients[2],
            'appt': appts[2],
            'motive': 'Crise d\'asthme légère',
            'anamnesis': 'Asthme depuis l\'enfance. Crise déclenchée par pollen.',
            'symptoms': ['wheezing', 'difficulty_breathing'],
            'clinical_exam': {'bp': '120/75', 'hr': 92, 'weight': 73},
            'diagnosis': 'Asthme bronchique',
            'icd10': 'J45',
            'notes': 'Ventoline si nécessaire.',
            'status': 'FINALIZED',
            'finalized_at': appts[2].start_datetime + timedelta(hours=1),
        }
    ]

    consultations = []
    for cd in cons_data:
        c, created = Consultation.objects.get_or_create(
            appointment=cd['appt'], patient=cd['patient'], doctor=doctor,
            defaults={
                'motive': cd['motive'],
                'anamnesis': cd['anamnesis'],
                'symptoms': cd['symptoms'],
                'clinical_exam': cd['clinical_exam'],
                'diagnosis': cd['diagnosis'],
                'icd10_code': cd['icd10'],
                'clinical_notes': cd['notes'],
                'status': cd['status'],
                'finalized_at': cd['finalized_at'],
                'ai_used': True,
                'ai_suggestions': [],
            }
        )
        consultations.append(c)
        print(f"  - Cons: {cd['patient'].first_name} - {cd['diagnosis']}")

    # 4. Create Prescriptions
    print("Seeding Prescriptions...")
    presc_data = [
        {
            'cons': consultations[0],
            'instructions': 'Prendre le matin à jeun.',
            'meds': [
                {'name': 'Amlodipine', 'dosage': '5 mg', 'form': 'comprimé', 'dosology': '1/jour', 'duration': 30},
                {'name': 'Ramipril', 'dosage': '5 mg', 'form': 'comprimé', 'dosology': '1/jour', 'duration': 30},
            ]
        },
        {
            'cons': consultations[1],
            'instructions': 'Prendre pendant les repas.',
            'meds': [
                {'name': 'Metformine', 'dosage': '1000 mg', 'form': 'comprimé', 'dosology': '1 matin, 1 soir', 'duration': 30},
                {'name': 'Gliclazide', 'dosage': '30 mg', 'form': 'comprimé', 'dosology': '1 matin', 'duration': 30},
            ]
        },
        {
            'cons': consultations[2],
            'instructions': 'Rincer la bouche après utilisation.',
            'meds': [
                {'name': 'Salbutamol', 'dosage': '100 mcg', 'form': 'aérosol', 'dosology': '2 bouffées en cas de crise', 'duration': 30},
            ]
        }
    ]

    for pd in presc_data:
        p, created = Prescription.objects.get_or_create(
            consultation=pd['cons'], patient=pd['cons'].patient, doctor=doctor,
            defaults={
                'general_instructions': pd['instructions'],
                'is_renewable': True,
                'issued_at': pd['cons'].finalized_at
            }
        )
        if created:
            for m in pd['meds']:
                MedicationLine.objects.create(
                    prescription=p,
                    drug_name=m['name'],
                    dosage=m['dosage'],
                    form=m['form'],
                    dosology=m['dosology'],
                    duration_days=m['duration'],
                )
        print(f"  - Presc: {pd['cons'].patient.first_name}")

print("=== SEEDING COMPLETED ===")
