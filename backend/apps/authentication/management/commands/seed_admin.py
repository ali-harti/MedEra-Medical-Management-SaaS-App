"""
Django management command to seed the MedEra database.
"""
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed the MedEra database with initial data'

    def handle(self, *args, **options):
        from apps.appointments.models import Appointment
        from apps.patients.models import Patient
        from apps.consultations.models import Consultation
        from apps.audit.models import AuditLog
        from apps.admin_portal.models import SystemSettings, CabinetConfig, PermissionMatrix

        User = get_user_model()

        self.stdout.write('=' * 50)
        self.stdout.write('MedEra Database Seeding')
        self.stdout.write('=' * 50)

        # Clear existing data
        self.stdout.write('Clearing existing data...')
        AuditLog.objects.all().delete()
        Consultation.objects.all().delete()
        Appointment.objects.all().delete()
        Patient.objects.all().delete()
        User.objects.filter(email__in=[
            'admin@medera.ma',
            'karim.benali@medera.ma',
            'sara.idrissi@medera.ma',
            'fatima.alaoui@medera.ma'
        ]).delete()

        # Create users
        self.stdout.write('Creating users...')

        admin = User.objects.create_user(
            email='admin@medera.ma',
            password='Admin@2026!',
            first_name='Admin',
            last_name='Principal',
            role='ADMIN',
            is_active=True,
        )

        dr_benali = User.objects.create_user(
            email='karim.benali@medera.ma',
            password='Medecin@2026!',
            first_name='Karim',
            last_name='Benali',
            role='MEDECIN',
            is_active=True,
            phone='+212 6 12 34 56 78',
        )

        dr_idrissi = User.objects.create_user(
            email='sara.idrissi@medera.ma',
            password='Medecin@2026!',
            first_name='Sara',
            last_name='Idrissi',
            role='MEDECIN',
            is_active=True,
            phone='+212 6 23 45 67 89',
        )

        secretary = User.objects.create_user(
            email='fatima.alaoui@medera.ma',
            password='Secretaire@2026!',
            first_name='Fatima Zahra',
            last_name='Alaoui',
            role='SECRETAIRE',
            is_active=True,
            phone='+212 6 34 56 78 90',
        )

        self.stdout.write(self.style.SUCCESS('  Created: admin@medera.ma (ADMIN)'))
        self.stdout.write(self.style.SUCCESS('  Created: karim.benali@medera.ma (MEDECIN - Cardiologie)'))
        self.stdout.write(self.style.SUCCESS('  Created: sara.idrissi@medera.ma (MEDECIN - Médecine Générale)'))
        self.stdout.write(self.style.SUCCESS('  Created: fatima.alaoui@medera.ma (SECRETAIRE)'))

        # Create patients
        self.stdout.write('Creating patients...')
        patients_data = [
            {'first_name': 'Ahmed', 'last_name': 'Mouhcine', 'birth_date': '1985-03-15', 'gender': 'M', 'phone': '+212 6 11 22 33 44'},
            {'first_name': 'Fatima', 'last_name': 'El Amrani', 'birth_date': '1990-07-22', 'gender': 'F', 'phone': '+212 6 22 33 44 55'},
            {'first_name': 'Youssef', 'last_name': 'Benharkat', 'birth_date': '1978-11-08', 'gender': 'M', 'phone': '+212 6 33 44 55 66'},
            {'first_name': 'Nadia', 'last_name': 'Bouchama', 'birth_date': '1995-01-30', 'gender': 'F', 'phone': '+212 6 44 55 66 77'},
            {'first_name': 'Rachid', 'last_name': 'El Fassi', 'birth_date': '1982-09-12', 'gender': 'M', 'phone': '+212 6 55 66 77 88'},
        ]

        patients = []
        for p_data in patients_data:
            patient = Patient.objects.create(
                **p_data,
                created_by=admin,
                email=f"{p_data['first_name'].lower()}.{p_data['last_name'].lower()}@email.ma",
                address='123 Rue Mohammed V, Casablanca',
                blood_type='O+',
            )
            patients.append(patient)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(patients)} patients'))

        # Create appointments
        self.stdout.write('Creating appointments...')
        doctors = [dr_benali, dr_idrissi]
        now = timezone.now()
        statuses = ['PLANNED', 'CONFIRMED', 'DONE', 'CANCELLED']

        appointments = []
        for i, patient in enumerate(patients[:5]):
            num_appointments = random.randint(2, 3)
            for j in range(num_appointments):
                days_offset = random.randint(-30, 30)
                start_time = now + timedelta(days=days_offset, hours=random.randint(9, 16))
                doctor = random.choice(doctors)

                appointment = Appointment.objects.create(
                    patient=patient,
                    doctor=doctor,
                    created_by=admin,
                    start_datetime=start_time,
                    end_datetime=start_time + timedelta(minutes=30),
                    duration_minutes=30,
                    motive='Consultation de routine',
                    appointment_type='FOLLOW_UP',
                    status=random.choice(statuses) if days_offset < 0 else 'CONFIRMED',
                )
                appointments.append(appointment)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(appointments)} appointments'))

        # Create consultations
        self.stdout.write('Creating consultations...')
        consultations = []
        done_appointments = [a for a in appointments if a.status == 'DONE']

        for apt in done_appointments[:5]:
            consultation = Consultation.objects.create(
                appointment=apt,
                patient=apt.patient,
                doctor=apt.doctor,
                symptoms=['fever', 'fatigue', 'headache'],
                clinical_exam={'general': 'patient appear fatigued'},
                anamnesis='Patient presents with symptoms for 3 days',
                diagnosis='Viral infection',
                icd10_code='J00',
                icd10_label='Acute nasopharyngitis',
                clinical_notes='Rest and hydration recommended',
                ai_suggestions=[{'disease': 'Common Cold', 'confidence': 0.75}],
                ai_used=False,
                status='FINALIZED',
                finalized_at=apt.start_datetime + timedelta(minutes=30),
            )
            consultations.append(consultation)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(consultations)} consultations'))

        # Create audit logs
        self.stdout.write('Creating audit logs...')
        users = [admin, dr_benali, dr_idrissi, secretary]
        actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'CONNEXION', 'DECONNEXION']
        models = ['User', 'Patient', 'Appointment', 'Consultation']

        for i in range(30):
            num_logs = random.randint(1, 3)
            for _ in range(num_logs):
                user = random.choice(users)
                action = random.choice(actions)
                model = random.choice(models)
                days_ago = random.randint(0, 30)

                AuditLog.objects.create(
                    user=user,
                    action=action,
                    model_name=model,
                    object_id=str(random.randint(1, 100)),
                    changes={'field': {'before': 'old', 'after': 'new'}},
                    ip_address='192.168.1.100',
                    timestamp=now - timedelta(days=days_ago, hours=random.randint(0, 23)),
                )

        self.stdout.write(self.style.SUCCESS('  Created 30 audit log entries'))

        # Create system settings
        self.stdout.write('Creating system settings...')

        CabinetConfig.objects.update_or_create(
            id=1,
            defaults={
                'name': 'Cabinet Médical MedEra',
                'address': '123 Avenue Mohammed V, Casablanca 20000',
                'phone': '+212 5 22 00 00 00',
                'email': 'contact@medera.ma',
                'timezone': 'Africa/Casablanca',
                'language': 'fr',
                'default_duration': 30,
                'max_advance_days': 90,
                'buffer_minutes': 15,
                'email_notifications': True,
                'sms_notifications': True,
                'reminder_timings': [24, 2],
                'session_timeout': 30,
                'min_password_length': 8,
                'require_special_chars': True,
                'two_factor_enabled': False,
                'ip_whitelist': [],
                'backup_schedule': 'DAILY',
                'backup_time': '02:00',
                'rooms': [
                    {'id': '1', 'name': 'Salle 1 - Cardiologie', 'capacity': 2, 'equipment': ['ECG', 'Stéthoscope', 'Monitoring']},
                    {'id': '2', 'name': 'Salle 2 - Médecine Générale', 'capacity': 2, 'equipment': ['Stéthoscope', 'Otoscope']},
                    {'id': '3', 'name': 'Salle 3 - Urgences', 'capacity': 3, 'equipment': ['Defibrillateur', 'Oxygène', 'Urgences']},
                ],
                'specialties': ['Cardiologie', 'Médecine Générale', 'Pédiatrie', 'Dermatologie', 'Neurologie'],
                'insurances': ['CNSS', 'CNOPS', 'AXA Assurance', 'Sanlam'],
                'holidays': [
                    {'date': '2026-01-01', 'reason': 'Nouvel An'},
                    {'date': '2026-01-11', 'reason': 'Indépendance'},
                    {'date': '2026-05-01', 'reason': 'Fête du Travail'},
                ],
            }
        )

        # Create system settings as key-value pairs (SystemSettings model)
        from apps.admin_portal.models import SystemSettings
        SystemSettings.objects.update_or_create(
            key='general',
            defaults={
                'value': {
                    'cabinet_name': 'Cabinet Médical MedEra',
                    'timezone': 'Africa/Casablanca',
                    'language': 'fr',
                }
            }
        )
        SystemSettings.objects.update_or_create(
            key='appointments',
            defaults={
                'value': {
                    'default_duration': 30,
                    'max_advance_days': 90,
                    'buffer_minutes': 15,
                }
            }
        )
        SystemSettings.objects.update_or_create(
            key='notifications',
            defaults={
                'value': {
                    'email_notifications': True,
                    'sms_notifications': True,
                    'reminder_timings': [24, 2],
                }
            }
        )
        SystemSettings.objects.update_or_create(
            key='security',
            defaults={
                'value': {
                    'session_timeout': 30,
                    'min_password_length': 8,
                    'require_special_chars': True,
                    'two_factor_enabled': False,
                }
            }
        )
        SystemSettings.objects.update_or_create(
            key='backup',
            defaults={
                'value': {
                    'schedule': 'DAILY',
                    'time': '02:00',
                }
            }
        )

        # Permission matrices
        PermissionMatrix.objects.update_or_create(
            role='ADMIN',
            defaults={
                'permissions': {
                    'patients': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'appointments': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'consultations': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'prescriptions': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'reports': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'admin_panel': {'read': True, 'create': True, 'update': True, 'delete': True},
                    'system_settings': {'read': True, 'create': True, 'update': True, 'delete': True},
                }
            }
        )

        PermissionMatrix.objects.update_or_create(
            role='MEDECIN',
            defaults={
                'permissions': {
                    'patients': {'read': True, 'create': True, 'update': True, 'delete': False},
                    'appointments': {'read': True, 'create': True, 'update': True, 'delete': False},
                    'consultations': {'read': True, 'create': True, 'update': True, 'delete': False},
                    'prescriptions': {'read': True, 'create': True, 'update': False, 'delete': False},
                    'reports': {'read': True, 'create': False, 'update': False, 'delete': False},
                    'admin_panel': {'read': False, 'create': False, 'update': False, 'delete': False},
                    'system_settings': {'read': False, 'create': False, 'update': False, 'delete': False},
                }
            }
        )

        PermissionMatrix.objects.update_or_create(
            role='SECRETAIRE',
            defaults={
                'permissions': {
                    'patients': {'read': True, 'create': True, 'update': True, 'delete': False},
                    'appointments': {'read': True, 'create': True, 'update': True, 'delete': False},
                    'consultations': {'read': False, 'create': False, 'update': False, 'delete': False},
                    'prescriptions': {'read': False, 'create': False, 'update': False, 'delete': False},
                    'reports': {'read': False, 'create': False, 'update': False, 'delete': False},
                    'admin_panel': {'read': False, 'create': False, 'update': False, 'delete': False},
                    'system_settings': {'read': False, 'create': False, 'update': False, 'delete': False},
                }
            }
        )

        self.stdout.write(self.style.SUCCESS('  Created system settings'))
        self.stdout.write(self.style.SUCCESS('  Created cabinet configuration'))
        self.stdout.write(self.style.SUCCESS('  Created permission matrices'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write('')
        self.stdout.write('Test credentials:')
        self.stdout.write('  ADMIN: admin@medera.ma / Admin@2026!')
        self.stdout.write('  DOCTOR: karim.benali@medera.ma / Medecin@2026!')
        self.stdout.write('  DOCTOR: sara.idrissi@medera.ma / Medecin@2026!')
        self.stdout.write('  SECRETARY: fatima.alaoui@medera.ma / Secretaire@2026!')