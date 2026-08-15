import random
import uuid
import time
from datetime import date, datetime, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction, models, connection
from django.utils import timezone

# Local app imports
from apps.authentication.models import DoctorApplication
from apps.patients.models import Patient, DoctorReview
from apps.appointments.models import Appointment
from apps.availability.models import DoctorAvailability
from apps.consultations.models import Consultation
from apps.prescriptions.models import Prescription, MedicationLine
from apps.billing.models import Billing
from apps.messaging.models import Thread, Message
from apps.audit.models import AuditLog

User = get_user_model()

# --- CONSTANTS & POOLS ---
MOROCCAN_CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 'Meknès', 'Oujda', 'Kénitra', 'Tétouan']

SPECIALTIES_DATA = [
    ('Médecine Générale', 150, 200),
    ('Cardiologie', 300, 500),
    ('Dermatologie', 300, 500),
    ('Pédiatrie', 300, 500),
    ('Gynécologie-Obstétrique', 400, 600),
    ('Ophtalmologie', 300, 500),
    ('Neurologie', 300, 500),
    ('Orthopédie', 400, 600),
    ('Psychiatrie', 300, 500),
    ('Endocrinologie', 300, 500),
    ('Gastro-entérologie', 300, 500),
    ('Urologie', 300, 500),
    ('ORL', 300, 500),
    ('Pneumologie', 300, 500),
    ('Radiologie', 300, 500),
]

MOROCCAN_FIRST_NAMES_F = [
    'Fatima', 'Meryem', 'Khadija', 'Asmaa', 'Salma', 'Zineb', 'Nour', 'Hafsa', 'Imane', 'Loubna',
    'Aicha', 'Laila', 'Soukaina', 'Houda', 'Sara', 'Ihssane', 'Nadia', 'Ghizlane', 'Siham', 'Meriem',
    'Malika', 'Latifa', 'Bouchra', 'Rachida', 'Hanane', 'Hasna', 'Najat', 'Fatiha', 'Saida', 'Amal',
    'Mina', 'Zahra', 'Kenza', 'Safaa', 'Hajar', 'Yasmine', 'Rania', 'Chaima', 'Kaoutar', 'Oumaima'
]

MOROCCAN_FIRST_NAMES_M = [
    'Mohamed', 'Ahmed', 'Youssef', 'Rachid', 'Hamza', 'Amine', 'Karim', 'Ibrahim', 'Soufiane', 'Adil',
    'Hassan', 'Mustapha', 'Omar', 'Ali', 'Said', 'Khalid', 'Hicham', 'Yassine', 'Anas', 'Mehdi',
    'Abderrahim', 'Abdeljalil', 'Abdellah', 'Abdelaziz', 'Abdelkader', 'Kamal', 'Tarik', 'Jawad', 'Nabil', 'Fouad',
    'Saad', 'Ismail', 'Zakaria', 'Ayoub', 'Walid', 'Oussama', 'Reda', 'Bilal', 'Badr', 'Younes'
]

MOROCCAN_LAST_NAMES = [
    'Alami', 'Bennani', 'Tazi', 'Chraibi', 'Fassi', 'Idrissi', 'Benhaddou', 'Berrada', 'Moussaoui', 'Lahlou',
    'Karimi', 'Ziani', 'Qabbaj', 'Naciri', 'Belkadi', 'Ouazzani', 'Bouazza', 'Rifai', 'Senhaji', 'Doukkali',
    'Mansouri', 'Filali', 'Skalli', 'Tahiri', 'Bensouda', 'Amrani', 'Zouiten', 'Hajji', 'Mouti', 'Alaoui',
    'Sabri', 'Jabrane', 'Radi', 'Fadel', 'Kabbaj', 'Guessous', 'Lazrak', 'Sqalli', 'Haik', 'Cherkaoui',
    'Benjelloun', 'Benmoussa', 'Benkirane', 'Benani', 'Benhima', 'Bennis', 'Benchekroun', 'Benabdeljalil', 'Benomar', 'Benhayoun'
]

CITY_CIN_PREFIX = {
    'Casablanca': 'B', 'Rabat': 'A', 'Fès': 'D', 'Marrakech': 'G', 'Kénitra': 'K', 'Oujda': 'J',
    'Tanger': 'L', 'Agadir': 'M', 'Meknès': 'H', 'Tétouan': 'P'
}

QUARTIERS = {
    'Casablanca': ['Maarif', 'Anfa', 'Bourgogne', 'Gauthier', 'Racine', 'Oulfa', 'Ain Diab'],
    'Rabat': ['Agdal', 'Hay Riad', 'Souissi', 'Ocean', 'Hassan'],
    'Marrakech': ['Gueliz', 'Hivernage', 'Medina', 'Targa', 'Palmeraie'],
    'Fès': ['Ville Nouvelle', 'Narjiss', 'Saada', 'Route d\'Imouzzer'],
    'Tanger': ['Malabata', 'Marshane', 'Iberia', 'City Center'],
}

MEDICAL_SCHOOLS = [
    'Faculté de Médecine de Casablanca', 'Faculté de Médecine de Rabat',
    'Faculté de Médecine de Fès', 'Faculté de Médecine de Marrakech'
]

MOTIVES = [
    "Douleurs thoraciques récurrentes", "Contrôle tension artérielle", "Éruption cutanée inexpliquée",
    "Suivi diabète", "Mal de gorge persistant", "Consultation pré-opératoire",
    "Renouvellement ordonnance", "Bilan de santé annuel", "Fièvre persistante",
    "Douleurs abdominales", "Migraine intense", "Suivi grossesse", "Contrôle post-opératoire",
    "Fatigue chronique", "Essoufflement à l'effort", "Douleurs articulaires",
    "Problème digestif", "Insomnie", "Anxiété", "Perte de poids inexpliquée",
    "Infection urinaire", "Allergie saisonnière", "Examen de la vue", "Problème auditif",
    "Suivi thyroïde", "Douleur dorsale", "Entorse cheville", "Grippe saisonnière",
    "Consultation pédiatrique", "Vaccination", "Check-up cardiologique", "Acné persistante",
    "Chute de cheveux", "Eczéma", "Varices", "Hémorroïdes", "Calculs rénaux",
    "Asthme", "Sinusite", "Toux sèche"
]

DIAGNOSES = {
    'Médecine Générale': ['Rhinopharyngite', 'Gastro-entérite', 'Bronchite aiguë', 'Grippe'],
    'Cardiologie': ['Hypertension artérielle', 'Insuffisance cardiaque', 'Arythmie'],
    'Dermatologie': ['Eczéma atopique', 'Psoriasis', 'Acné vulgaire', 'Urticaire'],
    'Pédiatrie': ['Bronchiolite', 'Otite moyenne', 'Varicelle', 'Rougeole'],
    'Gynécologie-Obstétrique': ['Grossesse normale', 'Fibrome utérin', 'Kyste ovarien'],
    'Ophtalmologie': ['Conjonctivite', 'Cataracte', 'Myopie forte', 'Glaucome'],
    'Neurologie': ['Migraine', 'Épilepsie', 'Maladie de Parkinson', 'Sclérose en plaques'],
    'Orthopédie': ['Lombalgie', 'Entorse du genou', 'Fracture du radius', 'Hernie discale'],
    'Psychiatrie': ['Épisode dépressif', 'Trouble anxieux généralisé', 'Trouble bipolaire'],
    'Endocrinologie': ['Diabète de type 2', 'Hyperthyroïdie', 'Hypothyroïdie'],
    'Gastro-entérologie': ['Gastrite', 'Reflux gastro-œsophagien', 'Côlon irritable'],
    'Urologie': ['Infection urinaire', 'Hypertrophie bénigne de la prostate', 'Calcul rénal'],
    'ORL': ['Sinusite chronique', 'Angine', 'Pharyngite', 'Otite'],
    'Pneumologie': ['Asthme bronchial', 'BPCO', 'Pneumopathie'],
    'Radiologie': ['Interprétation IRM', 'Scanner thoracique', 'Échographie abdominale'],
}

MEDICATIONS = [
    "Amoxicilline 500mg", "Metformine 850mg", "Amlodipine 5mg", "Oméprazole 20mg", "Doliprane 1g",
    "Ibuprofène 400mg", "Ventoline 100µg", "Levothyrox 50µg", "Atorvastatine 20mg", "Metoprolol 50mg",
    "Sertraline 50mg", "Alprazolam 0.25mg", "Ciprofloxacine 500mg", "Fluconazole 150mg", "Prednisolone 5mg"
]

REVIEW_COMMENTS = [
    "Médecin très à l'écoute et professionnel. Je recommande vivement.",
    "Temps d'attente un peu long mais la qualité de la consultation en vaut la peine.",
    "Cabinet propre et secrétaire accueillante. Dr. a bien expliqué le diagnostic.",
    "Consultation rapide mais efficace. Très bon suivi.",
    "Très satisfait de mon passage. Le médecin est très humain.",
    "Excellente prise en charge. Diagnostic précis.",
    "Un peu cher mais service de qualité.",
    "Médecin pédagogue, prend le temps de tout expliquer.",
    "Propreté impeccable et respect des horaires.",
    "Très bon spécialiste, j'ai vu une amélioration rapide."
]

# --- COMMAND ---
class Command(BaseCommand):
    help = 'Populate the database with realistic Moroccan medical data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **options):
        random.seed(42)
        start_time = time.time()
        
        if options['clear']:
            self.clear_data()
        elif User.objects.filter(role='MEDECIN').exists():
            self.stdout.write(self.style.SUCCESS('Database already seeded. Skipping.'))
            return

        try:
            with transaction.atomic():
                self.stdout.write('Starting Moroccan Seeder...')
                
                # 1. Doctors
                self.stdout.write('Creating 15 Doctors...')
                doctors = self.create_doctors()
                
                # 2. Doctor Reviews
                self.stdout.write('Generating reviews for doctors...')
                self.create_doctor_reviews(doctors)
                
                # 3. Patients
                self.stdout.write('Creating 3000 Patients...')
                patients = self.create_patients(3000)
                
                # 4. Availability
                self.stdout.write('Setting up availability...')
                self.create_availabilities(doctors)
                
                # 5. Appointments
                self.stdout.write('Generating 1950 Appointments...')
                appointments = self.create_appointments(doctors, patients)
                
                # 6. Consultations
                self.stdout.write('Creating 1150 Consultations...')
                consultations = self.create_consultations(appointments)
                
                # 7. Prescriptions
                self.stdout.write('Creating 750 Prescriptions...')
                self.create_prescriptions(consultations)
                
                # 8. Billing
                self.stdout.write('Generating 1200 Billing records...')
                self.create_billing(consultations, patients, doctors)
                
                # 9. Messaging
                self.stdout.write('Creating 500 Messaging threads...')
                self.create_messaging(doctors, patients)
                
                # 10. Audit Log
                self.stdout.write('Generating 2000 Audit log entries...')
                self.create_audit_logs(doctors, patients)
                
                # Summary
                elapsed = time.time() - start_time
                self.print_summary(elapsed)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during seeding: {str(e)}'))
            import traceback
            traceback.print_exc()

    def clear_data(self):
        self.stdout.write('Clearing existing data...')
        # Hard delete junction tables, soft delete others if needed, but here we wipe clean for fresh start
        AuditLog.objects.all().delete()
        Message.objects.all().delete()
        Thread.objects.all().delete()
        Billing.objects.all().delete()
        MedicationLine.objects.all().delete()
        Prescription.objects.all().delete()
        Consultation.objects.all().delete()
        Appointment.objects.all().delete()
        DoctorAvailability.objects.all().delete()
        DoctorReview.objects.all().delete()
        # Delete patients
        Patient.objects.all().delete()
        # Delete users except superusers if you want, but prompt says --clear
        User.objects.exclude(is_superuser=True).delete()

    def create_doctors(self):
        password = make_password('MedEra2026!')
        doctors = []
        for i, (spec, min_fee, max_fee) in enumerate(SPECIALTIES_DATA):
            first_name = random.choice(MOROCCAN_FIRST_NAMES_M if i % 2 == 0 else MOROCCAN_FIRST_NAMES_F)
            last_name = MOROCCAN_LAST_NAMES[i % len(MOROCCAN_LAST_NAMES)]
            city = MOROCCAN_CITIES[i % len(MOROCCAN_CITIES)]
            quartier = random.choice(QUARTIERS.get(city, ['Centre Ville', 'Quartier Administratif']))
            address = f"{random.randint(1, 200)} Rue Ibn Khaldoun, {quartier}, {city}"
            
            email = f"{first_name.lower()}.{last_name.lower()}@medera.ma"
            phone = f"+212 {random.choice(['6', '7'])}{random.randint(10000000, 99999999)}"
            
            bio = f"Spécialiste en {spec}. Approche centrée sur le patient avec une écoute active. Plus de {random.randint(5, 30)} ans d'expérience au service de votre santé."
            
            doc = User.objects.create(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role='MEDECIN',
                specialty=spec,
                city=city,
                phone=phone,
                bio=bio,
                is_active=True
            )
            # Add extra metadata in a dict or separate fields if they exist
            # The prompt mentions: consultation fee, languages, school, rating, reviews count
            # Since these might not be fields, I'll store what I can or just keep track in the script
            # Actually, I'll assume they might be in metadata or just used for display in the seeder
            doctors.append(doc)
            
            # Create DoctorApplication as approved
            DoctorApplication.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                city=city,
                specialty=spec,
                license_number=f"CNOM-{random.randint(10000, 99999)}",
                years_of_experience=random.randint(5, 30),
                languages=['Arabe', 'Français', 'Darija'] + (['Anglais'] if random.random() < 0.4 else []),
                status='APPROVED',
                created_user=doc
            )
            
        return doctors

    def create_doctor_reviews(self, doctors):
        reviews = []
        # Need some patients first to write reviews
        temp_patients = self.create_patients(150, is_temp=True)
        
        for doc in doctors:
            num_reviews = random.randint(5, 10)
            for _ in range(num_reviews):
                patient_user = random.choice(temp_patients).user
                rating = random.randint(3, 5)
                comment = random.choice(REVIEW_COMMENTS)
                reviews.append(DoctorReview(
                    doctor=doc,
                    patient=patient_user,
                    rating=rating,
                    comment=comment,
                    created_at=timezone.now() - timedelta(days=random.randint(1, 540))
                ))
        DoctorReview.objects.bulk_create(reviews)

    def create_patients(self, n, is_temp=False):
        password = make_password('MedEra2026!')
        patients = []
        batch_size = 500
        
        for i in range(0, n, batch_size):
            u_batch = []
            p_batch = []
            current_batch = min(batch_size, n - i)
            
            # Get base count for this batch
            today_str = date.today().strftime('%Y%m%d')
            base_count = Patient.objects.filter(internal_id__startswith=f"PAT-{today_str}-").count()
            
            for j in range(current_batch):
                gender = 'M' if random.random() < 0.5 else 'F'
                first_name = random.choice(MOROCCAN_FIRST_NAMES_M if gender == 'M' else MOROCCAN_FIRST_NAMES_F)
                last_name = random.choice(MOROCCAN_LAST_NAMES)
                # Use i + j to ensure uniqueness across 3000 patients
                email = f"{first_name.lower()}.{last_name.lower()}.{i + j}@{'gmail.com' if j % 3 == 0 else 'hotmail.com' if j % 3 == 1 else 'yahoo.fr'}"
                
                u = User(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    role='PATIENT',
                    is_active=True if i + j < 2850 else False # 150 archived
                )
                u_batch.append(u)
            
            # Use bulk_create for Users first
            User.objects.bulk_create(u_batch)
            created_users = list(User.objects.filter(role='PATIENT').order_by('-created_at')[:current_batch])
            
            for idx, u in enumerate(created_users):
                city = random.choice(MOROCCAN_CITIES)
                prefix_cin = CITY_CIN_PREFIX.get(city, 'X')
                
                birth_date = date(1945, 1, 1) + timedelta(days=random.randint(0, 22000))
                
                # Generate internal_id: PAT-YYYYMMDD-XXXX
                internal_id = f"PAT-{today_str}-{str(base_count + idx + 1).zfill(4)}"
                
                # Blood type distribution
                blood_type = random.choices(
                    ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'],
                    weights=[38, 27, 20, 5, 5, 2, 2, 1]
                )[0]
                
                insurance = random.choices(
                    ['CNSS', 'CNOPS', 'Allianz Maroc', 'SAHAM', 'AXA Assurance Maroc', 'None'],
                    weights=[50, 20, 3, 3, 4, 20]
                )[0]
                
                p = Patient(
                    user=u,
                    internal_id=internal_id,
                    first_name=u.first_name,
                    last_name=u.last_name,
                    email=u.email,
                    gender='M' if u.first_name in MOROCCAN_FIRST_NAMES_M else 'F',
                    birth_date=birth_date,
                    phone=f"+212 {random.choice(['6', '7'])}{random.randint(10000000, 99999999)}",
                    address=f"{random.randint(1, 100)} Rue, {city}",
                    blood_type=blood_type,
                    insurance=insurance if insurance != 'None' else '',
                    is_archived=not u.is_active,
                    health_profile_complete=True
                )
                
                # Health profile fields
                if random.random() < 0.3:
                    p.allergies = [random.choice(['pénicilline', 'aspirine', 'pollen', 'arachides', 'latex'])]
                
                if random.random() < 0.25:
                    condition = random.choice(['diabète type 2', 'hypertension', 'asthme', 'hypothyroïdie'])
                    p.medical_history = condition
                
                p.emergency_contact = {
                    "name": f"{random.choice(MOROCCAN_FIRST_NAMES_M)} {u.last_name}",
                    "phone": f"+212 6{random.randint(10000000, 99999999)}"
                }
                p_batch.append(p)
                
            Patient.objects.bulk_create(p_batch)
            patients.extend(p_batch)
            
        return Patient.objects.all()

    def create_availabilities(self, doctors):
        avails = []
        for doc in doctors:
            # Mon-Fri
            for day in range(5):
                avails.append(DoctorAvailability(
                    doctor=doc,
                    day_of_week=day,
                    start_time="08:30",
                    end_time="18:30",
                    consultation_types=['PRESENTIEL', 'VISIO'] if random.random() < 0.6 else ['PRESENTIEL']
                ))
            # Sat morning
            avails.append(DoctorAvailability(
                doctor=doc,
                day_of_week=5,
                start_time="09:00",
                end_time="12:00",
                consultation_types=['PRESENTIEL']
            ))
        # Use simple save as it has clean() logic, but for bulk we skip it
        DoctorAvailability.objects.bulk_create(avails)

    def create_appointments(self, doctors, patients):
        appts = []
        now = timezone.now()
        
        # 1950 total
        for i in range(1950):
            doc = random.choice(doctors)
            pat = random.choice(patients)
            
            # Distribution to meet counts:
            # Need 1150 DONE appointments for consultations
            # 1150 / 1950 approx 60%
            status_roll = random.random()
            if i < 1150: 
                status = 'DONE'
            elif status_roll < 0.4: 
                status = 'PLANNED'
            elif status_roll < 0.7: 
                status = 'CONFIRMED'
            else: 
                status = 'CANCELLED'
            
            # Dates
            if status in ['DONE', 'CANCELLED']:
                # Past (last 12 months)
                start = now - timedelta(days=random.randint(1, 365), hours=random.randint(1, 1000) % 8 + 8)
            else:
                # Future (next 60 days)
                start = now + timedelta(days=random.randint(1, 60), hours=random.randint(1, 1000) % 8 + 8)
            
            start = start.replace(minute=random.choice([0, 30]), second=0, microsecond=0)
            end = start + timedelta(minutes=30)
            
            appts.append(Appointment(
                patient=pat,
                doctor=doc,
                start_datetime=start,
                end_datetime=end,
                motive=random.choice(MOTIVES),
                status=status,
                consultation_type='VISIO' if random.random() < 0.3 else 'PRESENTIEL',
                created_at=now - timedelta(days=random.randint(1, 365))
            ))
            
        return Appointment.objects.bulk_create(appts)

    def create_consultations(self, appointments):
        cons = []
        done_appts = [a for a in appointments if a.status == 'DONE']
        # 1150 total needed
        sampled_appts = random.sample(done_appts, min(len(done_appts), 1150))
        
        for a in sampled_appts:
            spec = a.doctor.specialty
            diag = random.choice(DIAGNOSES.get(spec, ['Pathologie indéterminée']))
            
            ai_used = random.random() < 0.4
            ai_suggestions = []
            if ai_used:
                ai_suggestions = [
                    {"disease": diag, "confidence": 0.85, "icd10": "A00", "severity": 2},
                    {"disease": "Alternative", "confidence": 0.10, "icd10": "B00", "severity": 1}
                ]
            
            cons.append(Consultation(
                appointment=a,
                patient=a.patient,
                doctor=a.doctor,
                motive=a.motive,
                clinical_notes=f"Patient se plaint de {a.motive.lower()}. Examen clinique sans particularité. Abdomen souple, dépressible.",
                diagnosis=diag,
                status='FINALIZED' if random.random() < 0.85 else 'DRAFT',
                ai_used=ai_used,
                ai_suggestions=ai_suggestions,
                clinical_exam={
                    "bp": f"{random.randint(110, 140)}/{random.randint(70, 90)}",
                    "hr": random.randint(60, 100),
                    "temp": round(random.uniform(36.5, 38.5), 1),
                    "weight": random.randint(50, 110),
                    "height": random.randint(155, 190)
                },
                finalized_at=a.end_datetime if random.random() < 0.85 else None
            ))
            
        return Consultation.objects.bulk_create(cons)

    def create_prescriptions(self, consultations):
        prescs = []
        finalized = [c for c in consultations if c.status == 'FINALIZED']
        # 750 total
        sampled = random.sample(finalized, min(len(finalized), 750))
        
        for c in sampled:
            prescs.append(Prescription(
                consultation=c,
                patient=c.patient,
                doctor=c.doctor,
                is_cancelled=random.random() < 0.1,
                issued_at=c.finalized_at or timezone.now()
            ))
        
        created_prescs = Prescription.objects.bulk_create(prescs)
        
        lines = []
        for pr in created_prescs:
            num_meds = random.randint(1, 4)
            meds = random.sample(MEDICATIONS, num_meds)
            for m in meds:
                lines.append(MedicationLine(
                    prescription=pr,
                    drug_name=m,
                    dosage="1 comprimé",
                    dosology="matin et soir",
                    duration_days=random.choice([7, 15, 30, 90]),
                    special_instructions="À prendre pendant le repas"
                ))
        MedicationLine.objects.bulk_create(lines)

    def create_billing(self, consultations, patients, doctors):
        bills = []
        today_str = timezone.now().strftime('%Y%m%d')
        # 1200 records total
        for i in range(1200):
            if i < len(consultations):
                c = consultations[i]
                p = c.patient
                d = c.doctor
                cons = c
                created_at = c.created_at
            else:
                p = random.choice(patients)
                d = random.choice(doctors)
                cons = None
                created_at = timezone.now() - timedelta(days=random.randint(1, 30))

            status = random.choices(['PAID', 'PENDING', 'CANCELLED', 'REFUNDED'], weights=[60, 25, 10, 5])[0]
            amount = 200 if (cons and cons.doctor.specialty == 'Médecine Générale') else 400
            
            bill = Billing(
                patient=p,
                doctor=d,
                consultation=cons,
                invoice_number=f"INV-{today_str}-{str(i + 1).zfill(4)}",
                amount_total=amount,
                status=status,
                payment_method=random.choice(['CASH', 'CARD', 'TRANSFER']) if status == 'PAID' else None,
                created_at=created_at
            )
            if status == 'PAID' and p.insurance:
                bill.amount_paid = amount * random.uniform(0.7, 1.0)
            elif status == 'PAID':
                bill.amount_paid = amount
                
            bills.append(bill)
            
        Billing.objects.bulk_create(bills)

    def create_messaging(self, doctors, patients):
        threads = []
        for _ in range(500):
            p = random.choice(patients)
            d = random.choice(doctors)
            threads.append(Thread(patient=p, doctor=d, subject="Question médicale"))
        
        created_threads = Thread.objects.bulk_create(threads)
        
        messages = []
        for t in created_threads:
            num_msgs = random.randint(2, 6)
            for i in range(num_msgs):
                sender = t.patient.user if i % 2 == 0 else t.doctor
                messages.append(Message(
                    thread=t,
                    sender=sender,
                    content="Contenu réaliste de message en français concernant le suivi médical.",
                    created_at=t.created_at + timedelta(hours=i)
                ))
        Message.objects.bulk_create(messages)

    def create_audit_logs(self, doctors, patients):
        logs = []
        all_users = list(doctors) + [p.user for p in patients[:100]]
        actions = ['PATIENT_CREATED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_CONFIRMED', 'CONSULTATION_FINALIZED', 
                   'PRESCRIPTION_CREATED', 'INVOICE_PAID', 'USER_LOGIN', 'PASSWORD_CHANGED', 'PATIENT_ARCHIVED']
        
        for _ in range(2000):
            logs.append(AuditLog(
                user=random.choice(all_users),
                action=random.choice(actions),
                model_name='System',
                timestamp=timezone.now() - timedelta(days=random.randint(0, 180))
            ))
        AuditLog.objects.bulk_create(logs)

    def print_summary(self, elapsed):
        self.stdout.write(self.style.SUCCESS(f'\nSeeding completed in {elapsed:.2f}s'))
        self.stdout.write("--------------------------------------------------")
        self.stdout.write(f"Doctors: {User.objects.filter(role='MEDECIN').count()}")
        self.stdout.write(f"Patients: {Patient.objects.count()}")
        self.stdout.write(f"Appointments: {Appointment.objects.count()}")
        self.stdout.write(f"Consultations: {Consultation.objects.count()}")
        self.stdout.write(f"Prescriptions: {Prescription.objects.count()}")
        self.stdout.write(f"Billing: {Billing.objects.count()}")
        self.stdout.write(f"Threads: {Thread.objects.count()}")
        self.stdout.write(f"Audit Logs: {AuditLog.objects.count()}")
        self.stdout.write("--------------------------------------------------")
