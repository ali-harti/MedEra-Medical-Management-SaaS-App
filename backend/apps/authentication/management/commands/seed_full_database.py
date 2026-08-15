import random
import uuid
import time
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction, models, connection
from django.utils import timezone
from faker import Faker

# Local app imports
from apps.authentication.models import DoctorApplication
from apps.patients.models import Patient
from apps.appointments.models import Appointment
from apps.availability.models import DoctorAvailability
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription, MedicationLine
from apps.billing.models import Billing
from apps.messaging.models import Thread, Message
from apps.audit.models import AuditLog
from apps.admin_portal.models import CabinetConfig

User = get_user_model()
fake = Faker(['fr_FR'])

# --- DATA POOLS ---
SURNAMES = [
    'Alami', 'Benali', 'Tazi', 'Chraibi', 'Idrissi',
    'Mansouri', 'Filali', 'Ouazzani', 'Berada', 'Rhazali',
    'Skalli', 'Bennasser', 'Zouiten', 'Amrani', 'Tahiri',
    'Bensouda', 'Lahrizi', 'Belmahi', 'Qarroum', 'Hajji'
]

FIRST_NAMES_MALE = [
    'Mohamed', 'Ahmed', 'Hassan', 'Omar', 'Youssef',
    'Rachid', 'Khalid', 'Amine', 'Mehdi', 'Karim'
]

FIRST_NAMES_FEMALE = [
    'Fatima', 'Aicha', 'Zineb', 'Khadija', 'Meryem',
    'Nadia', 'Houda', 'Laila', 'Sara', 'Soukaina'
]

SPECIALTIES = [
    ('Médecine Générale', 4),
    ('Cardiologie', 2),
    ('Pédiatrie', 2),
    ('Dermatologie', 1),
    ('Neurologie', 1),
    ('Gynécologie-Obstétrique', 2),
    ('Orthopédie', 1),
    ('Psychiatrie', 1),
    ('Ophtalmologie', 1),
]

INSURANCES = ['CNSS', 'CNOPS', 'RMA', 'AXA', 'SAHAM', 'ALLIANZ', 'None']
INSURANCE_WEIGHTS = [35, 25, 10, 8, 7, 5, 10]

ALLERGIES = [
    'Pénicilline', 'Aspirine', 'Ibuprofène', 'Pollen', 'Poussière',
    'Arachides', 'Fruits de mer', 'Latex', 'Sulfamides', 'Codéine'
]

MEDICAL_HISTORY_POOL = [
    ("Hypertension artérielle", 0.30, 40),
    ("Diabète de type 2", 0.20, 50),
    ("Asthme bronchique", 0.12, 0),
    ("Insuffisance cardiaque", 0.08, 60),
    ("Hypothyroïdie", 0.10, 0),
    ("Arthrose", 0.15, 65),
    ("Dépression", 0.08, 0),
    ("Migraine chronique", 0.10, 0),
    ("Reflux gastro-œsophagien", 0.15, 0),
    ("Dyslipidémie", 0.20, 45),
    ("Obésité IMC > 30", 0.18, 0),
    ("Cancer (histoire)", 0.05, 0),
]

MOTIVES = [
    "Consultation de routine", "Renouvellement d'ordonnance", "Suivi hypertension artérielle",
    "Contrôle glycémie", "Douleurs thoraciques", "Céphalées persistantes",
    "Bilan de santé annuel", "Suivi post-opératoire", "Toux persistante",
    "Douleurs articulaires", "Consultation première fois", "Résultats analyses",
    "Éruption cutanée", "Troubles du sommeil", "Douleurs abdominales",
    "Consultation préventive", "Suivi traitement", "Vertiges",
    "Palpitations cardiaques", "Fatigue chronique"
]

DIAGNOSES = [
    {"label": "Hypertension artérielle essentielle", "code": "I10", "symptoms": ["high_blood_pressure", "headache", "dizziness", "fatigue"]},
    {"label": "Diabète de type 2", "code": "E11", "symptoms": ["increased_thirst", "frequent_urination", "fatigue", "blurred_vision"]},
    {"label": "Rhinopharyngite aiguë", "code": "J00", "symptoms": ["fever", "runny_nose", "cough"]},
    {"label": "Bronchite aiguë", "code": "J20", "symptoms": ["cough", "fever", "chest_tightness"]},
    {"label": "Sinusite maxillaire aiguë", "code": "J01.0", "symptoms": ["nasal_congestion", "facial_pain", "headache"]},
    {"label": "Angine érythémateuse", "code": "J02", "symptoms": ["sore_throat", "fever", "difficulty_swallowing"]},
    {"label": "Lombalgies communes", "code": "M54.5", "symptoms": ["back_pain", "muscle_stiffness"]},
    {"label": "Gastro-entérite aiguë", "code": "A09", "symptoms": ["abdominal_pain", "nausea", "vomiting"]},
    {"label": "Céphalées de tension", "code": "G44.2", "symptoms": ["headache", "muscle_stiffness"]},
    {"label": "Migraine sans aura", "code": "G43.0", "symptoms": ["headache", "nausea", "light_sensitivity"]},
    {"label": "Anxiété généralisée", "code": "F41.1", "symptoms": ["anxiety", "palpitations", "insomnia"]},
    {"label": "Dépression légère à modérée", "code": "F32.1", "symptoms": ["fatigue", "insomnia", "anxiety"]},
]

MEDICATIONS_MAP = {
    "I10": [
        {"drug_name": "Amlodipine", "dosage": "10mg", "form": "comprimé", "dosology": "1 comprimé par jour le matin", "duration_days": 30},
        {"drug_name": "Perindopril", "dosage": "5mg", "form": "comprimé", "dosology": "1 comprimé par jour à jeun", "duration_days": 30}
    ],
    "E11": [
        {"drug_name": "Metformine", "dosage": "850mg", "form": "comprimé", "dosology": "2 fois/jour pendant les repas", "duration_days": 30},
        {"drug_name": "Sitagliptine", "dosage": "100mg", "form": "comprimé", "dosology": "1 cp/jour", "duration_days": 30}
    ],
    "J00": [
        {"drug_name": "Paracétamol", "dosage": "1g", "form": "comprimé", "dosology": "3 fois/jour si douleurs", "duration_days": 5},
        {"drug_name": "Fervex", "dosage": "adulte", "form": "sachet", "dosology": "3 sachets/jour", "duration_days": 3}
    ],
    "DEFAULT": [
        {"drug_name": "Paracétamol", "dosage": "1g", "form": "comprimé", "dosology": "3 fois/jour si douleurs", "duration_days": 7},
        {"drug_name": "Ibuprofène", "dosage": "400mg", "form": "comprimé", "dosology": "3 fois/jour pendant les repas", "duration_days": 5}
    ]
}

REJECTION_REASONS = [
    "Documents non conformes — licence médicale expirée",
    "Spécialisation non vérifiable — diplôme étranger non reconnu",
    "Dossier incomplet — certificat de spécialisation manquant",
    "Informations contradictoires dans le dossier",
    "Licence révoquée par le Conseil National de l'Ordre des Médecins"
]

# --- COMMAND ---
class Command(BaseCommand):
    help = 'Populate the MedEra PostgreSQL database with a complete, realistic, fully-relational synthetic dataset.'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Wipe all data before seeding')
        parser.add_argument('--fast', action='store_true', help='Skip audit log generation')
        parser.add_argument('--patients', type=int, default=3000, help='Number of patients to generate')
        parser.add_argument('--doctors', type=int, default=15, help='Number of doctors to generate')

    def handle(self, *args, **options):
        start_time = time.time()
        clear = options['clear']
        fast = options['fast']
        n_patients = options['patients']
        n_doctors = options['doctors']

        if clear:
            self.clear_data()

        try:
            with transaction.atomic():
                # 1. Cabinet Config
                self.stdout.write('🔄 Configuring cabinet...')
                config = self.create_cabinet_config()

                # 2. Admins
                self.stdout.write('🔄 Creating admin accounts...')
                admins = self.create_admins()
                primary_admin = admins[0]

                # 3. Doctors
                self.stdout.write('🔄 Creating doctor accounts...')
                doctors = self.create_doctors(n_doctors)

                # 4. Secretaries
                self.stdout.write('🔄 Creating secretary accounts...')
                secretaries = self.create_secretaries(doctors)

                # 5. Patients
                self.stdout.write(f'🔄 Creating {n_patients} patient accounts...')
                patients = self.create_patients(n_patients, primary_admin)

                # 6. Applications
                self.stdout.write('🔄 Creating doctor applications...')
                self.create_doctor_applications(doctors, primary_admin)

                # 7. Availability
                self.stdout.write('🔄 Creating doctor availability settings...')
                self.create_availabilities(doctors)

                # 8. Appointments
                self.stdout.write('🔄 Creating appointments...')
                appointments = self.create_appointments(doctors, patients, primary_admin)

                # 9. Consultations
                self.stdout.write('🔄 Creating consultations...')
                consultations = self.create_consultations(appointments, doctors, patients)

                # 10. Prescriptions
                self.stdout.write('🔄 Creating prescriptions...')
                prescriptions = self.create_prescriptions(consultations)

                # 11. Billing
                self.stdout.write('🔄 Creating billing records...')
                invoices = self.create_billing(consultations, patients)

                # 12. Messages
                self.stdout.write('🔄 Creating message threads...')
                self.create_messages(doctors, patients, secretaries)

                # 13. Audit Log
                if not fast:
                    self.stdout.write('🔄 Generating audit log entries...')
                    self.create_audit_logs(doctors, patients, admins, secretaries)

                # 14. Verification
                self.stdout.write('🔄 Running integrity verification checks...')
                self.verify_integrity()
                
                # 15. Summary
                elapsed = time.time() - start_time
                self.print_summary(elapsed)

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'❌ Seeding failed: {str(e)}'))
            import traceback
            traceback.print_exc()
            exit(1)

    # --- STEPS ---

    def clear_data(self):
        self.stdout.write('🗑️ Clearing existing data...')
        
        # Order matters for foreign key constraints
        models_to_clear = [
            AuditLog, Message, Thread, Billing, MedicationLine, 
            Prescription, Consultation, Appointment, DoctorAvailability, 
            DoctorApplication, Patient, User, CabinetConfig
        ]
        
        for model in models_to_clear:
            try:
                model.objects.all().delete()
            except Exception as e:
                self.stdout.write(f"⚠️ Could not clear {model.__name__}: {e}")

    def create_cabinet_config(self):
        return CabinetConfig.objects.create(
            name="Cabinet Médical MedEra",
            address="45 Boulevard Mohammed V, Casablanca 20000, Maroc",
            phone="+212 522-123456",
            email="contact@medera.ma",
            timezone="Africa/Casablanca",
            language="fr",
            default_duration=30,
            working_hours={
                "Monday": "08:00-19:00",
                "Tuesday": "08:00-19:00",
                "Wednesday": "08:00-19:00",
                "Thursday": "08:00-19:00",
                "Friday": "08:00-18:00",
                "Saturday": "09:00-13:00",
                "Sunday": "CLOSED"
            },
            rooms=[
                {"id": "Room1", "name": "Salle de consultation 1", "capacity": 1, "active": True},
                {"id": "Room2", "name": "Salle de consultation 2", "capacity": 1, "active": True},
                {"id": "Room3", "name": "Salle de consultation 3", "capacity": 1, "active": True},
                {"id": "Room4", "name": "Salle d'échographie", "capacity": 2, "active": True},
                {"id": "Room5", "name": "Salle d'urgences", "capacity": 3, "active": True},
                {"id": "Room6", "name": "Salle de réunion", "capacity": 10, "active": False},
            ],
            specialties=[s[0] for s in SPECIALTIES],
            insurances=[
                {"name": "CNSS", "coverage": 0.70},
                {"name": "CNOPS", "coverage": 0.80},
                {"name": "RMA", "coverage": 0.75},
                {"name": "AXA", "coverage": 0.85},
                {"name": "SAHAM", "coverage": 0.70},
                {"name": "ALLIANZ", "coverage": 0.80},
            ],
            holidays=[
                {"name": "Jour de l'An", "date": "2026-01-01"},
                {"name": "Manifeste de l'Indépendance", "date": "2026-01-11"},
            ]
        )

    def create_admins(self):
        password = make_password('MedEra2026!')
        admins = [
            User(email='admin@medera.ma', password=password, first_name='Karim', last_name='Bensouda', role='ADMIN', is_staff=True, is_superuser=True),
            User(email='admin2@medera.ma', password=password, first_name='Salma', last_name='Tahiri', role='ADMIN'),
            User(email='admin.inactive@medera.ma', password=password, first_name='Admin', last_name='Inactive', role='ADMIN', is_active=False),
        ]
        User.objects.bulk_create(admins)
        return list(User.objects.filter(role='ADMIN'))

    def create_doctors(self, n_total):
        password = make_password('MedEra2026!')
        doctors_data = [
            ('Youssef', 'Bennani', 'y.bennani@medera.ma', 'Médecine Générale'),
            ('Sara', 'Mouti', 's.mouti@medera.ma', 'Cardiologie'),
            ('Karim', 'Alaoui', 'k.alaoui@medera.ma', 'Pédiatrie'),
            ('Fatima', 'Chraibi', 'f.chraibi@medera.ma', 'Gynécologie-Obstétrique'),
            ('Hassan', 'Ouazzani', 'h.ouazzani@medera.ma', 'Neurologie'),
            ('Zineb', 'Mansouri', 'z.mansouri@medera.ma', 'Dermatologie'),
            ('Omar', 'Filali', 'o.filali@medera.ma', 'Médecine Générale'),
            ('Nadia', 'Idrissi', 'n.idrissi@medera.ma', 'Cardiologie'),
            ('Amine', 'Berada', 'a.berada@medera.ma', 'Pédiatrie'),
            ('Laila', 'Tazi', 'l.tazi@medera.ma', 'Gynécologie-Obstétrique'),
            ('Mehdi', 'Rhazali', 'm.rhazali@medera.ma', 'Orthopédie'),
            ('Asmaa', 'Bennasser', 'a.bennasser@medera.ma', 'Médecine Générale'),
            ('Rachid', 'Skalli', 'r.skalli@medera.ma', 'Psychiatrie'),
            ('Houda', 'Zouiten', 'h.zouiten@medera.ma', 'Ophtalmologie'),
            ('Khalid', 'Amrani', 'k.amrani@medera.ma', 'Médecine Générale'),
        ]
        
        doctor_objs = []
        for fn, ln, email, spec in doctors_data:
            doctor_objs.append(User(
                email=email, password=password, first_name=fn, last_name=ln,
                role='MEDECIN', specialty=spec, is_active=True
            ))
        
        User.objects.bulk_create(doctor_objs)
        doctors = list(User.objects.filter(role='MEDECIN'))
        
        # Special states
        d_inactive = doctors[-1]
        d_inactive.is_active = False
        d_inactive.save()
        
        d_locked = doctors[1]
        d_locked.locked_until = timezone.now() + timedelta(minutes=10)
        d_locked.failed_login_attempts = 5
        d_locked.save()
        
        return doctors

    def create_secretaries(self, doctors):
        password = make_password('MedEra2026!')
        sec_data = [
            ('Nadia', 'Chraibi', 'secretary@medera.ma'),
            ('Khadija', 'Belmahi', 'secretary2@medera.ma'),
            ('Hafida', 'Lahrizi', 'secretary3@medera.ma'),
            ('Souad', 'Qarroum', 'secretary4@medera.ma'),
            ('Sec', 'Inactive', 'secretary.inactive@medera.ma'),
        ]
        sec_objs = []
        for fn, ln, email in sec_data:
            sec_objs.append(User(
                email=email, password=password, first_name=fn, last_name=ln,
                role='SECRETAIRE', is_active=(email != 'secretary.inactive@medera.ma')
            ))
        User.objects.bulk_create(sec_objs)
        return list(User.objects.filter(role='SECRETAIRE'))

    def create_patients(self, n, admin):
        password = make_password('MedEra2026!')
        today_str = date.today().strftime('%Y%m%d')
        
        # Fixed test patients
        test_patients_info = [
            ('Fatima Zahra', 'Alami', 'fatima.alami@gmail.com', True, False, True),
            ('Mohamed', 'Benali', 'mohamed.benali@gmail.com', True, False, True),
            ('Aicha', 'Tazi', 'aicha.tazi@gmail.com', True, False, True),
            ('Hassan', 'Qabbaj', 'hassan.qabbaj@gmail.com', False, False, True),
            ('Zineb', 'Mansouri', 'zineb.archived@gmail.com', True, True, True),
        ]
        
        for idx, (fn, ln, email, complete, archived, active) in enumerate(test_patients_info):
            u = User.objects.create(email=email, password=password, first_name=fn.split()[0], last_name=ln, role='PATIENT', is_active=active)
            Patient.objects.create(
                user=u, email=email, first_name=fn, last_name=ln,
                birth_date=date(1990, 1, 1), gender='F' if 'a' in fn[-1] else 'M',
                health_profile_complete=complete, is_archived=archived, created_by=admin,
                blood_type='A+', insurance='CNSS',
                internal_id=f"PAT-{today_str}-{str(idx+1).zfill(4)}"
            )

        # Batch creation for the rest
        n_rem = n - len(test_patients_info)
        batch_size = 500
        start_count = len(test_patients_info) + 1
        
        for i in range(0, n_rem, batch_size):
            current_batch_size = min(batch_size, n_rem - i)
            u_batch = []
            for j in range(current_batch_size):
                gender = 'F' if random.random() < 0.52 else 'M'
                fn = random.choice(FIRST_NAMES_FEMALE if gender == 'F' else FIRST_NAMES_MALE)
                ln = random.choice(SURNAMES)
                email = f"{fn.lower()}.{ln.lower()}{start_count+i+j}@gmail.com"
                u_batch.append(User(email=email, password=password, first_name=fn, last_name=ln, role='PATIENT'))
            
            User.objects.bulk_create(u_batch)
            # Re-fetch users in this batch to get IDs
            emails = [u.email for u in u_batch]
            created_users = list(User.objects.filter(email__in=emails))
            
            p_batch = []
            for idx, u in enumerate(created_users):
                u_idx = start_count + i + idx
                complete = random.random() < 0.95
                archived = random.random() < 0.05
                
                age_r = random.random()
                if age_r < 0.05: age = random.randint(1, 17)
                elif age_r < 0.25: age = random.randint(18, 35)
                elif age_r < 0.50: age = random.randint(36, 50)
                elif age_r < 0.80: age = random.randint(51, 65)
                elif age_r < 0.98: age = random.randint(66, 85)
                else: age = random.randint(86, 95)
                
                bday = date.today() - timedelta(days=age*365 + random.randint(0, 364))
                
                p = Patient(
                    user=u, email=u.email, first_name=u.first_name, last_name=u.last_name,
                    birth_date=bday, gender='F' if u.first_name in FIRST_NAMES_FEMALE else 'M',
                    health_profile_complete=complete, is_archived=archived, created_by=admin,
                    blood_type=random.choices(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'], weights=[38, 30, 15, 5, 7, 3, 1, 1])[0],
                    insurance=random.choices(INSURANCES, weights=INSURANCE_WEIGHTS)[0],
                    internal_id=f"PAT-{today_str}-{str(u_idx).zfill(4)}"
                )
                
                if complete:
                    if random.random() < 0.40: p.allergies = random.sample(ALLERGIES, k=random.randint(1, 2))
                    history = [h[0] for h in MEDICAL_HISTORY_POOL if random.random() < h[1] and age >= h[2]]
                    p.medical_history = ", ".join(history)
                    p.emergency_contact = {"name": f"{random.choice(FIRST_NAMES_MALE)} {random.choice(SURNAMES)}", "phone": "+212 600000000", "relation": "Parent"}
                
                p_batch.append(p)
            Patient.objects.bulk_create(p_batch)

        return list(Patient.objects.all())

    def create_doctor_applications(self, doctors, admin):
        apps = []
        for d in doctors:
            apps.append(DoctorApplication(
                first_name=d.first_name, last_name=d.last_name, email=d.email, phone="+212 600000000",
                city="Casablanca", specialty=d.specialty, license_number=f"MED-{d.specialty[:3].upper()}-2024-{random.randint(1000, 9999)}",
                status='APPROVED', reviewed_by=admin, reviewed_at=timezone.now() - timedelta(days=30), created_user=d
            ))
        for i in range(8):
            spec = random.choice([s[0] for s in SPECIALTIES])
            apps.append(DoctorApplication(first_name=random.choice(FIRST_NAMES_MALE), last_name=random.choice(SURNAMES), email=f"pending{i}@medera.ma", specialty=spec, status='PENDING'))
        for i in range(5):
            spec = random.choice([s[0] for s in SPECIALTIES])
            apps.append(DoctorApplication(first_name=random.choice(FIRST_NAMES_FEMALE), last_name=random.choice(SURNAMES), email=f"rejected{i}@medera.ma", specialty=spec, status='REJECTED', rejection_reason=random.choice(REJECTION_REASONS)))
        DoctorApplication.objects.bulk_create(apps)

    def create_availabilities(self, doctors):
        avails = []
        for d in doctors:
            for day in range(6):
                avails.append(DoctorAvailability(
                    doctor=d, day_of_week=day, start_time="08:30" if day < 5 else "09:00",
                    end_time="17:00" if day < 5 else "13:00", consultation_types=['PRESENTIEL', 'VISIO'] if random.random() < 0.4 else ['PRESENTIEL']
                ))
        DoctorAvailability.objects.bulk_create(avails)

    def create_appointments(self, doctors, patients, admin):
        appts = []
        now = timezone.now()
        for d in doctors:
            if not d.is_active: continue
            # Past
            for _ in range(80):
                start = now - timedelta(days=random.randint(1, 180), hours=random.randint(0, 8))
                appts.append(Appointment(patient=random.choice(patients), doctor=d, start_datetime=start, end_datetime=start+timedelta(minutes=30), motive=random.choice(MOTIVES), status='DONE'))
            # Today
            for h in range(8, 18):
                start = now.replace(hour=h, minute=0, second=0, microsecond=0)
                appts.append(Appointment(patient=random.choice(patients), doctor=d, start_datetime=start, end_datetime=start+timedelta(minutes=30), motive=random.choice(MOTIVES), status='CONFIRMED'))
            # Future
            for _ in range(40):
                start = now + timedelta(days=random.randint(1, 90), hours=random.randint(0, 8))
                appts.append(Appointment(patient=random.choice(patients), doctor=d, start_datetime=start, end_datetime=start+timedelta(minutes=30), motive=random.choice(MOTIVES), status='PLANNED'))
        
        for _ in range(200):
            appts.append(Appointment(patient=random.choice(patients), doctor=random.choice(doctors), start_datetime=now, end_datetime=now+timedelta(minutes=30), status='CANCELLED', cancellation_reason="Absent"))
        
        return Appointment.objects.bulk_create(appts)

    def create_consultations(self, appts, doctors, patients):
        cons = []
        now = timezone.now()
        done_appts = [a for a in appts if a.status == 'DONE']
        for a in done_appts:
            diag = random.choice(DIAGNOSES)
            cons.append(Consultation(
                appointment=a, patient=a.patient, doctor=a.doctor, motive=a.motive,
                anamnesis=fake.text(max_nb_chars=200), symptoms=diag['symptoms'],
                clinical_exam={"bp": "120/80", "hr": 72, "temp": 37.0},
                diagnosis=diag['label'], icd10_code=diag['code'], status='FINALIZED', finalized_at=a.end_datetime
            ))
        # Walk-ins
        for _ in range(150):
            p = random.choice(patients)
            d = random.choice(doctors)
            cons.append(Consultation(patient=p, doctor=d, status='FINALIZED', finalized_at=now - timedelta(days=random.randint(1, 30))))
        return Consultation.objects.bulk_create(cons)

    def create_prescriptions(self, consultations):
        prescs = []
        for c in random.sample(consultations, int(len(consultations)*0.7)):
            prescs.append(Prescription(consultation=c, patient=c.patient, doctor=c.doctor, issued_at=c.finalized_at))
        Prescription.objects.bulk_create(prescs)
        
        lines = []
        for pr in Prescription.objects.all():
            diag_code = pr.consultation.icd10_code if pr.consultation else "DEFAULT"
            meds = MEDICATIONS_MAP.get(diag_code, MEDICATIONS_MAP['DEFAULT'])
            for m in meds:
                lines.append(MedicationLine(prescription=pr, drug_name=m['drug_name'], dosage=m['dosage'], form=m['form'], dosology=m['dosology'], duration_days=m['duration_days']))
        MedicationLine.objects.bulk_create(lines)

    def create_billing(self, consultations, patients):
        bills = []
        doctors = list(User.objects.filter(role='MEDECIN'))
        date_str = timezone.now().strftime('%Y%m%d')
        
        for idx, c in enumerate(consultations):
            bills.append(Billing(
                patient=c.patient, doctor=c.doctor, consultation=c, amount_total=300, 
                status='PAID', amount_paid=300, payment_method='CASH',
                invoice_number=f"INV-{date_str}-{str(idx+1).zfill(4)}"
            ))
        
        start_idx = len(consultations) + 1
        for i in range(200):
            bills.append(Billing(
                patient=random.choice(patients), doctor=random.choice(doctors), amount_total=200, 
                status='PENDING', invoice_number=f"INV-{date_str}-{str(start_idx+i).zfill(4)}"
            ))
        return Billing.objects.bulk_create(bills)

    def create_messages(self, doctors, patients, secretaries):
        t_objs = []
        for _ in range(200):
            p = random.choice(patients)
            d = random.choice(doctors)
            t_objs.append(Thread(patient=p, doctor=d, subject="Question médicale"))
        Thread.objects.bulk_create(t_objs)
        
        m_objs = []
        for t in Thread.objects.all():
            m_objs.append(Message(thread=t, sender=t.doctor, content="Bonjour, comment allez-vous ?", is_read=True))
            m_objs.append(Message(thread=t, sender=t.patient.user, content="Ça va mieux, merci.", is_read=True))
        Message.objects.bulk_create(m_objs)

    def create_audit_logs(self, doctors, patients, admins, secretaries):
        logs = []
        users = list(doctors) + list(admins) + list(secretaries)
        now = timezone.now()
        for _ in range(1000):
            logs.append(AuditLog(user=random.choice(users), action='CREATE', model_name='Patient', timestamp=now - timedelta(minutes=random.randint(1, 10000))))
        AuditLog.objects.bulk_create(logs)

    def verify_integrity(self):
        # Check counts
        self.stdout.write(f"Verification: Users={User.objects.count()}, Patients={Patient.objects.count()}, Appointments={Appointment.objects.count()}")

    def print_summary(self, elapsed):
        self.stdout.write(self.style.SUCCESS(f'\n✅ Seeding completed in {elapsed:.2f}s'))
        self.stdout.write(f'Final Counts: Users={User.objects.count()}, Patients={Patient.objects.count()}, Appointments={Appointment.objects.count()}')
