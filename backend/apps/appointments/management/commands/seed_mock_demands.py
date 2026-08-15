from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.appointments.models import Appointment
from apps.patients.models import Patient
from django.contrib.auth import get_user_model
User = get_user_model()
import random
from datetime import timedelta

class Command(BaseCommand):
    help = "Seed mock demands (REQUESTED and REJECTED appointments) for testing."

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting mock demands seeding...")

        patients = list(Patient.objects.all())
        doctors = list(User.objects.filter(role='MEDECIN'))

        if not patients or not doctors:
            self.stdout.write(self.style.ERROR("Need at least 1 patient and 1 doctor in the DB."))
            return

        reasons = [
            "Créneau non disponible",
            "Veuillez prendre un rdv urgent",
            "Dossier incomplet",
            "Hors spécialité"
        ]

        motives = [
            "Première consultation cardiologie",
            "Suivi traitement hypertension",
            "Douleurs persistantes depuis 3 jours",
            "Certificat médical de sport"
        ]

        # 1. Create some REQUESTED
        for i in range(5):
            patient = random.choice(patients)
            doctor = random.choice(doctors)
            start = timezone.now() + timedelta(days=random.randint(1, 14), hours=random.randint(9, 16))
            end = start + timedelta(minutes=30)
            
            Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                start_datetime=start,
                end_datetime=end,
                status='REQUESTED',
                appointment_type=random.choice(['FIRST', 'FOLLOW_UP']),
                consultation_type=random.choice(['IN_PERSON', 'VISIO']),
                motive=random.choice(motives),
                booked_via_whatsapp=random.choice([True, False])
            )
            self.stdout.write(self.style.SUCCESS(f"Created REQUESTED appointment for {patient}"))

        # 2. Create some REJECTED
        for i in range(3):
            patient = random.choice(patients)
            doctor = random.choice(doctors)
            start = timezone.now() + timedelta(days=random.randint(1, 14), hours=random.randint(9, 16))
            end = start + timedelta(minutes=30)
            
            Appointment.objects.create(
                patient=patient,
                doctor=doctor,
                start_datetime=start,
                end_datetime=end,
                status='REJECTED',
                appointment_type=random.choice(['FIRST', 'FOLLOW_UP']),
                consultation_type=random.choice(['IN_PERSON', 'VISIO']),
                motive=random.choice(motives),
                cancellation_reason=random.choice(reasons),
                booked_via_whatsapp=random.choice([True, False])
            )
            self.stdout.write(self.style.SUCCESS(f"Created REJECTED appointment for {patient}"))

        self.stdout.write(self.style.SUCCESS("Mock demands seeded successfully!"))
