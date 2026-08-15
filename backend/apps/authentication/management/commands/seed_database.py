import random
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.appointments.models import Appointment
from apps.patients.models import Patient
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription, MedicationLine
from apps.billing.models import Billing
from apps.messaging.models import Thread, Message
from apps.authentication.models import DoctorApplication
from apps.audit.models import AuditLog
from apps.admin_portal.models import CabinetConfig

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed the database with synthetic near-real test data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            # Dependency order: Billing -> Prescription -> Consultation -> Appointment -> Message -> Application -> User/Patient
            AuditLog.objects.all().delete()
            Billing.objects.all().delete()
            MedicationLine.objects.all().delete()
            Prescription.objects.all().delete()
            Consultation.objects.all().delete()
            Appointment.objects.all().delete()
            Message.objects.all().delete()
            Thread.objects.all().delete()
            DoctorApplication.objects.all().delete()
            Patient.objects.all().delete()
            User.objects.all().delete()
            CabinetConfig.objects.all().delete()

        self.stdout.write('Creating users...')
        password = 'MedEra2026!'

        admin = User.objects.create_user(
            email='admin@medera.ma',
            password=password,
            first_name='Karim',
            last_name='Bensouda',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            phone='611111111'
        )

        dr_bennani = User.objects.create_user(
            email='y.bennani@medera.ma',
            password=password,
            first_name='Youssef',
            last_name='Bennani',
            specialty='Médecine Générale',
            role='MEDECIN',
            phone='622222222'
        )

        dr_mouti = User.objects.create_user(
            email='s.mouti@medera.ma',
            password=password,
            first_name='Sara',
            last_name='Mouti',
            specialty='Cardiologie',
            role='MEDECIN',
            phone='644444444'
        )

        dr_alaoui = User.objects.create_user(
            email='k.alaoui@medera.ma',
            password=password,
            first_name='Karim',
            last_name='Alaoui',
            specialty='Pédiatrie',
            role='MEDECIN',
            phone='655555555'
        )

        secretary = User.objects.create_user(
            email='secretary@medera.ma',
            password=password,
            first_name='Nadia',
            last_name='Chraibi',
            role='SECRETAIRE',
            phone='633333333'
        )

        self.stdout.write('Creating patients...')
        # Patient 1
        p1 = Patient.objects.create(
            email='fatima.alami@gmail.com',
            first_name='Fatima Zahra',
            last_name='Alami',
            birth_date='1990-03-15',
            gender='F',
            blood_type='A+',
            allergies=["Pénicilline", "Poussière"],
            medical_history="Hypertension depuis 2020",
            insurance='CNSS',
            health_profile_complete=True,
            created_by=admin
        )
        
        # Patient 2
        p2 = Patient.objects.create(
            email='mohamed.benali@gmail.com',
            first_name='Mohamed',
            last_name='Benali',
            birth_date='1985-07-22',
            gender='M',
            blood_type='O+',
            allergies=[],
            medical_history="Diabète Type 2 depuis 2018",
            insurance='CNOPS',
            health_profile_complete=True,
            created_by=admin
        )
        
        # Patient 3
        p3 = Patient.objects.create(
            email='aicha.tazi@gmail.com',
            first_name='Aicha',
            last_name='Tazi',
            birth_date='1995-11-08',
            gender='F',
            blood_type='B+',
            allergies=["Aspirine"],
            medical_history="Asthme",
            insurance='RMA',
            health_profile_complete=True,
            created_by=admin
        )
        
        # Patient 4 (Incomplete profile)
        p4 = Patient.objects.create(
            email='hassan.qabbaj@gmail.com',
            first_name='Hassan',
            last_name='Qabbaj',
            birth_date='1992-05-10', # Added birth_date as it's likely required
            gender='M',
            health_profile_complete=False,
            created_by=admin
        )
        
        # Patient 5 (Archived)
        p5 = Patient.objects.create(
            email='zineb.mansouri@gmail.com',
            first_name='Zineb',
            last_name='Mansouri',
            birth_date='1988-12-01',
            gender='F',
            is_archived=True,
            health_profile_complete=True,
            created_by=admin
        )

        self.stdout.write('Creating doctor applications...')
        DoctorApplication.objects.create(
            first_name='Hamza',
            last_name='Ouazzani',
            email='h.ouazzani@gmail.com',
            specialty='Dermatologie',
            license_number='MED-DRM-2024-0892',
            status='PENDING',
            submitted_at=timezone.now() - timedelta(days=2)
        )
        
        DoctorApplication.objects.create(
            first_name='Samira',
            last_name='Idrissi',
            email='s.idrissi@gmail.com',
            specialty='Neurologie',
            license_number='MED-NRL-2024-1204',
            status='PENDING',
            submitted_at=timezone.now() - timedelta(days=5)
        )
        
        app3 = DoctorApplication.objects.create(
            first_name='Youssef',
            last_name='Bennani',
            email='y.bennani@medera.ma',
            specialty='Médecine Générale',
            license_number='MED-GEN-2024-0001',
            status='APPROVED',
            reviewed_by=admin,
            reviewed_at=timezone.now() - timedelta(days=30),
            created_user=dr_bennani
        )
        
        DoctorApplication.objects.create(
            first_name='Omar',
            last_name='Filali',
            email='o.filali@gmail.com',
            specialty='Chirurgie',
            license_number='MED-SURG-2024-9999',
            status='REJECTED',
            rejection_reason="Documents non conformes — licence expirée",
            reviewed_by=admin,
            reviewed_at=timezone.now() - timedelta(days=15)
        )

        self.stdout.write('Creating appointments...')
        now = timezone.now()
        today = now.date()
        
        # Appt 1 - TODAY, IN_PERSON, CONFIRMED
        appt1 = Appointment.objects.create(
            patient=p1,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=9, minute=30))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=10, minute=0))),
            duration_minutes=30,
            motive="Suivi tension artérielle",
            status='CONFIRMED',
            consultation_type='PRESENTIEL'
        )
        
        # Appt 2 - TODAY, VIDEO, IN_PROGRESS
        appt2 = Appointment.objects.create(
            patient=p2,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=10, minute=30))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=11, minute=0))),
            duration_minutes=30,
            motive="Contrôle glycémie",
            status='IN_PROGRESS',
            consultation_type='VISIO'
        )
        
        # Appt 3 - TOMORROW, IN_PERSON, CONFIRMED
        tomorrow = today + timedelta(days=1)
        appt3 = Appointment.objects.create(
            patient=p3,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(tomorrow, timezone.datetime.min.time().replace(hour=14, minute=0))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(tomorrow, timezone.datetime.min.time().replace(hour=14, minute=45))),
            duration_minutes=45,
            motive="Crise d'asthme récurrente",
            status='CONFIRMED',
            consultation_type='PRESENTIEL'
        )
        
        # Appt 4 - PENDING
        after_tomorrow = today + timedelta(days=2)
        appt4 = Appointment.objects.create(
            patient=p2,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(after_tomorrow, timezone.datetime.min.time().replace(hour=9, minute=0))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(after_tomorrow, timezone.datetime.min.time().replace(hour=9, minute=30))),
            duration_minutes=30,
            motive="Renouvellement ordonnance",
            status='PLANNED', # Mapping PENDING to PLANNED
            consultation_type='VISIO'
        )
        
        # Appt 5 - PAST, DONE
        past_7 = today - timedelta(days=7)
        appt5 = Appointment.objects.create(
            patient=p1,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(past_7, timezone.datetime.min.time().replace(hour=10, minute=0))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(past_7, timezone.datetime.min.time().replace(hour=10, minute=30))),
            duration_minutes=30,
            motive="Checkup",
            status='DONE',
            consultation_type='PRESENTIEL'
        )
        
        # Appt 6 - PAST, CANCELLED
        past_14 = today - timedelta(days=14)
        appt6 = Appointment.objects.create(
            patient=p3,
            doctor=dr_bennani,
            start_datetime=timezone.make_aware(timezone.datetime.combine(past_14, timezone.datetime.min.time().replace(hour=15, minute=30))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(past_14, timezone.datetime.min.time().replace(hour=16, minute=0))),
            duration_minutes=30,
            motive="Suivi asthme",
            status='CANCELLED',
            cancellation_reason="Annulé par le patient",
            consultation_type='PRESENTIEL'
        )
        
        # dr_mouti Appt 7
        appt7 = Appointment.objects.create(
            patient=p3,
            doctor=dr_mouti,
            start_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=11, minute=0))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=11, minute=30))),
            duration_minutes=30,
            motive="Consultation cardiologique",
            status='CONFIRMED',
            consultation_type='PRESENTIEL'
        )
        
        # dr_mouti Appt 8 - PENDING
        in_3 = today + timedelta(days=3)
        appt8 = Appointment.objects.create(
            patient=p1,
            doctor=dr_mouti,
            start_datetime=timezone.make_aware(timezone.datetime.combine(in_3, timezone.datetime.min.time().replace(hour=16, minute=0))),
            end_datetime=timezone.make_aware(timezone.datetime.combine(in_3, timezone.datetime.min.time().replace(hour=16, minute=30))),
            duration_minutes=30,
            motive="Douleurs thoraciques",
            status='PLANNED',
            consultation_type='PRESENTIEL'
        )

        # BLOCKED SLOTS
        from apps.availability.models import DoctorAvailability
        DoctorAvailability.objects.create(
            doctor=dr_bennani,
            day_of_week=today.weekday(),
            start_time="12:00",
            end_time="14:00",
            is_active=False,
            consultation_types=['PRESENTIEL']
        )

        self.stdout.write('Creating consultations...')
        # Cons 1 - FINALIZED, ai_used: true
        c1 = Consultation.objects.create(
            patient=p1,
            doctor=dr_bennani,
            appointment=appt5,
            clinical_exam={ "bp": "145/92", "hr": 82, "temp": 37.2, "weight": 70, "height": 175, "bmi": 24.1 },
            diagnosis="Hypertension artérielle stade 1 (ICD-10: I10)",
            clinical_notes="Tension élevée malgré traitement. Augmenter la dose d'Amlodipine. RDV contrôle dans 2 semaines.",
            ai_used=True,
            ai_suggestions=[
                {
                    "disease": "Essential Hypertension",
                    "name_fr": "Hypertension Artérielle Essentielle",
                    "confidence": 0.89,
                    "icd10": "I10",
                    "severity": 3,
                    "evidence": [
                        { "symptom": "high_blood_pressure", "weight": 0.65, "label_en": "High Blood Pressure" },
                        { "symptom": "headache", "weight": 0.25, "label_en": "Headache" }
                    ]
                }
            ],
            status='FINALIZED',
            finalized_at=now - timedelta(days=7)
        )
        
        # Cons 2 - FINALIZED, ai_used: false
        c2 = Consultation.objects.create(
            patient=p2,
            doctor=dr_bennani,
            clinical_exam={ "bp": "125/80", "hr": 78, "temp": 36.8, "weight": 85, "height": 178, "bmi": 27.3 },
            diagnosis="Diabète de type 2 — contrôle glycémique insuffisant (ICD-10: E11)",
            clinical_notes="HbA1c à 8.2%. Révision régime alimentaire. Ajout Metformine 1000mg.",
            ai_used=False,
            status='FINALIZED',
            finalized_at=now - timedelta(days=14)
        )
        
        # Cons 3 - DRAFT
        c3 = Consultation.objects.create(
            patient=p3,
            doctor=dr_bennani,
            clinical_exam={ "hr": 95, "temp": 37.5 },
            diagnosis="",
            status='DRAFT'
        )
        
        # Cons 4 - IN_PROGRESS
        # Using DRAFT for IN_PROGRESS as per model
        c4 = Consultation.objects.create(
            patient=p2,
            doctor=dr_bennani,
            appointment=appt2,
            clinical_exam={ "hr": 80 },
            status='DRAFT'
        )

        self.stdout.write('Creating prescriptions...')
        # Presc 1
        pr1 = Prescription.objects.create(
            consultation=c1,
            patient=p1,
            doctor=dr_bennani,
            general_instructions="Contrôle tensionnel dans 2 semaines. Éviter sel et stress.",
            issued_at=now - timedelta(days=7)
        )
        MedicationLine.objects.create(prescription=pr1, drug_name="Amlodipine", dosage="10mg", dosology="1 fois/jour", duration_days=30, special_instructions="Le matin à jeun")
        MedicationLine.objects.create(prescription=pr1, drug_name="Perindopril", dosage="5mg", dosology="1 fois/jour", duration_days=30, special_instructions="Le matin")
        
        # Presc 2
        pr2 = Prescription.objects.create(
            consultation=c2,
            patient=p2,
            doctor=dr_bennani,
            issued_at=now - timedelta(days=14)
        )
        MedicationLine.objects.create(prescription=pr2, drug_name="Metformine", dosage="1000mg", dosology="2 fois/jour", duration_days=90, special_instructions="Pendant les repas")
        MedicationLine.objects.create(prescription=pr2, drug_name="Glucophage", dosage="500mg", dosology="1 fois/jour", duration_days=90, special_instructions="Le soir")
        
        # Presc 3 - CANCELLED
        pr3 = Prescription.objects.create(
            consultation=c3, # Link to some consultation
            patient=p3,
            doctor=dr_bennani,
            is_cancelled=True,
            general_instructions="Annulée — remplacée par nouvelle ordonnance",
            issued_at=now - timedelta(days=21)
        )
        MedicationLine.objects.create(prescription=pr3, drug_name="Ventoline", dosage="100mcg", dosology="Au besoin", duration_days=60)

        self.stdout.write('Creating invoices...')
        # Invoice 1
        Billing.objects.create(
            patient=p1,
            doctor=dr_bennani,
            consultation=c1,
            amount_total=300.00,
            amount_paid=300.00,
            status='PAID',
            payment_method='CASH',
            paid_at=now - timedelta(days=7),
            invoice_number='FAC-20260501-0001'
        )
        
        # Invoice 2
        Billing.objects.create(
            patient=p2,
            doctor=dr_bennani,
            consultation=c2,
            amount_total=300.00,
            amount_paid=300.00,
            status='PAID',
            payment_method='TRANSFER', # Using TRANSFER for insurance stub
            paid_at=now - timedelta(days=14),
            invoice_number='FAC-20260424-0002',
            notes="CNOPS (insurance)"
        )
        
        # Invoice 3
        Billing.objects.create(
            patient=p3,
            doctor=dr_bennani,
            amount_total=450.00,
            status='PENDING',
            invoice_number='FAC-20260506-0003',
            notes="Consultation cardiologie + ECG"
        )
        
        # Invoice 4
        Billing.objects.create(
            patient=p2,
            doctor=dr_bennani,
            amount_total=300.00,
            status='PENDING',
            invoice_number='FAC-20260507-0004'
        )
        
        # Invoice 5
        Billing.objects.create(
            patient=p1,
            doctor=dr_bennani,
            amount_total=200.00,
            status='CANCELLED',
            invoice_number='FAC-20260415-0005',
            notes="Annulée — double facturation"
        )

        self.stdout.write('Creating messages...')
        # Thread 1
        t1 = Thread.objects.create(patient=p1, doctor=dr_bennani, subject="Résultats analyse sanguine")
        Message.objects.create(thread=t1, sender=dr_bennani, content="Bonjour Mme Alami, vos résultats sont disponibles. Votre tension est bien contrôlée. Continuez le traitement.", is_read=True, created_at=now - timedelta(days=2))
        Message.objects.create(thread=t1, sender=admin, content="Merci docteur. Est-ce que je dois venir pour un contrôle ?", is_read=True, created_at=now - timedelta(days=1)) # Simulating patient via User link
        Message.objects.create(thread=t1, sender=dr_bennani, content="Oui, prenez rendez-vous pour dans 2 semaines.", is_read=False, created_at=now - timedelta(days=1))
        
        # Thread 2
        t2 = Thread.objects.create(patient=p2, doctor=dr_bennani, subject="Confirmation rendez-vous")
        Message.objects.create(thread=t2, sender=secretary, content="Bonjour M. Benali, votre rendez-vous avec Dr. Bennani est confirmé.", is_read=True, created_at=now - timedelta(days=3))
        Message.objects.create(thread=t2, sender=admin, content="Merci beaucoup.", is_read=True, created_at=now - timedelta(days=3))
        
        # Thread 3
        t3 = Thread.objects.create(patient=p3, doctor=dr_mouti, subject="Question sur ordonnance")
        Message.objects.create(thread=t3, sender=admin, content="Docteur, puis-je prendre Ventoline avec mon traitement actuel ?", is_read=False, created_at=now)

        self.stdout.write('Creating audit log entries...')
        # Manually create the 15 audit entries
        audit_data = [
            ('CREATE', 'User', admin, 'admin@medera.ma created patient account fatima.alami@gmail.com', 30),
            ('CREATE', 'DoctorApplication', admin, 'h.ouazzani@gmail.com submitted application', 2),
            ('FINALIZE', 'DoctorApplication', admin, 'admin approved Dr. Bennani application', 30),
            ('CANCEL', 'DoctorApplication', admin, 'admin rejected Dr. Filali application', 15),
            ('CREATE', 'Appointment', admin, 'Fatima booked appointment with Dr. Bennani', 8),
            ('UPDATE', 'Appointment', secretary, 'Secretary confirmed appointment', 7),
            ('CREATE', 'Consultation', dr_bennani, 'Dr. Bennani created consultation for Fatima', 7),
            ('FINALIZE', 'Consultation', dr_bennani, 'Dr. Bennani finalized consultation', 7),
            ('CREATE', 'Prescription', dr_bennani, 'Dr. Bennani issued prescription for Fatima', 7),
            ('CREATE', 'Billing', secretary, 'Invoice FAC-20260501-0001 generated', 7),
            ('UPDATE', 'Billing', secretary, 'Invoice marked as paid (CASH)', 7),
            ('LOCKOUT', 'User', admin, 'mohamed.benali@gmail.com — 3 failed login attempts', 5),
            ('UPDATE', 'Patient', dr_bennani, 'Dr. Bennani updated patient record', 3),
            ('CREATE', 'Message', dr_bennani, 'Thread created between Dr. Bennani and Fatima', 2),
            ('CANCEL', 'Appointment', admin, 'Aicha cancelled appointment', 14),
        ]
        
        for action, model, user, desc, days in audit_data:
            AuditLog.objects.create(
                action=action,
                model_name=model,
                user=user,
                changes={'description': desc},
                timestamp=timezone.now() - timedelta(days=days)
            )

        self.stdout.write('Configuring cabinet...')
        CabinetConfig.objects.create(
            name="Cabinet Médical MedEra",
            address="45 Boulevard Mohammed V, Casablanca 20000, Maroc",
            phone="+212 522-123456",
            email="contact@medera.ma",
            timezone="Africa/Casablanca",
            language="fr",
            default_duration=30,
            working_hours={
                "Monday": "08:00-18:00",
                "Tuesday": "08:00-18:00",
                "Wednesday": "08:00-18:00",
                "Thursday": "08:00-18:00",
                "Friday": "08:00-18:00",
                "Saturday": "09:00-13:00",
                "Sunday": "Closed"
            },
            rooms=[
                { "id": "Room 1", "name": "Salle de consultation 1", "capacity": 1, "active": True },
                { "id": "Room 2", "name": "Salle de consultation 2", "capacity": 1, "active": True },
                { "id": "Room 3", "name": "Salle de radiologie", "capacity": 2, "active": True },
                { "id": "Room 4", "name": "Salle d'attente", "capacity": 10, "active": False }
            ],
            specialties=["Médecine Générale", "Cardiologie", "Pédiatrie", "Dermatologie", "Neurologie"],
            insurances=[
                { "name": "CNSS", "coverage": "70%" },
                { "name": "CNOPS", "coverage": "80%" },
                { "name": "RMA", "coverage": "75%" },
                { "name": "AXA", "coverage": "85%" },
                { "name": "SAHAM", "coverage": "70%" }
            ],
            holidays=[
                { "name": "Aid Al Fitr", "date": "variable" },
                { "name": "Aid Al Adha", "date": "variable" },
                { "name": "Fête du Trône", "date": "2026-07-30" },
                { "name": "Fête de l'Indépendance", "date": "2026-11-18" }
            ]
        )

        self.stdout.write(self.style.SUCCESS(
            '\nDatabase seeded successfully.'
            '\n  Admin:     admin@medera.ma / MedEra2026!'
            '\n  Doctor:    y.bennani@medera.ma / MedEra2026!'
            '\n  Secretary: secretary@medera.ma / MedEra2026!'
            '\n  Patient:   fatima.alami@gmail.com / MedEra2026!'
        ))
