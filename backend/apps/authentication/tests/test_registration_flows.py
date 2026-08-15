import pytest
from django.urls import reverse
from django.core import mail
from django.contrib.auth import get_user_model
from apps.authentication.models import DoctorApplication

User = get_user_model()

@pytest.mark.django_db
class TestDoctorApplicationFlow:
    """Tests for the doctor onboarding application flow."""
    
    def test_public_can_submit_doctor_application(self, api_client):
        """POST /api/auth/applications/ without any auth token creates a new DoctorApplication with status=PENDING."""
        url = reverse('authentication:doctor-application-list')
        data = {
            "first_name": "Jean",
            "last_name": "Dupont",
            "email": "jean.dupont@test.com",
            "phone": "0601020304",
            "city": "Paris",
            "specialty": "Cardiologue",
            "license_number": "123456789",
            "years_of_experience": 10,
            "languages": ["Français", "Anglais"],
            "motivation_message": "Je souhaite rejoindre Medera."
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 201
        assert DoctorApplication.objects.filter(email="jean.dupont@test.com", status='PENDING').exists()

    def test_doctor_application_validates_duplicate_email(self, api_client, medecin_user):
        """Submitting an application with an email already used by an existing User account returns 400."""
        url = reverse('authentication:doctor-application-list')
        data = {
            "first_name": "Existing",
            "last_name": "Doctor",
            "email": medecin_user.email,
            "phone": "0102030405",
            "city": "Lyon",
            "specialty": "Généraliste",
            "license_number": "987654321"
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
        assert "already exists" in str(response.data['email'])

    def test_doctor_application_validates_duplicate_pending(self, api_client):
        """Submitting a second application with the same email while a PENDING application exists returns 400."""
        # Create initial application
        DoctorApplication.objects.create(
            email="pending@test.com", first_name="P", last_name="T", license_number="L1"
        )
        url = reverse('authentication:doctor-application-list')
        data = {
            "first_name": "Another",
            "last_name": "Attempt",
            "email": "pending@test.com",
            "license_number": "L2"
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
        assert "already in progress" in str(response.data['email'])

    def test_doctor_application_validates_duplicate_license(self, api_client):
        """Submitting an application with a license_number already in a PENDING or APPROVED application returns 400."""
        DoctorApplication.objects.create(
            email="doc1@test.com", first_name="D1", last_name="T1", license_number="DUP123"
        )
        url = reverse('authentication:doctor-application-list')
        data = {
            "first_name": "D2",
            "last_name": "T2",
            "email": "doc2@test.com",
            "license_number": "DUP123"
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
        assert "already associated" in str(response.data['license_number'])

    def test_patient_cannot_list_applications(self, api_client, patient_user):
        """GET /api/auth/applications/ with PATIENT token returns 403."""
        api_client.force_authenticate(user=patient_user)
        url = reverse('authentication:doctor-application-list')
        response = api_client.get(url)
        assert response.status_code == 403

    def test_admin_can_list_applications(self, api_client, admin_user):
        """GET /api/auth/applications/ with ADMIN token returns 200 with a list of applications."""
        DoctorApplication.objects.create(email="app1@test.com", first_name="A", last_name="B")
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) >= 1

    def test_admin_can_approve_application(self, api_client, admin_user):
        """POST /api/auth/applications/{id}/approve/ creates a User with role=MEDECIN and updates application status to APPROVED."""
        app = DoctorApplication.objects.create(
            email="approved@test.com", first_name="App", last_name="Roved"
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-approve', kwargs={'pk': app.id})
        response = api_client.post(url)
        
        assert response.status_code == 200
        app.refresh_from_db()
        assert app.status == 'APPROVED'
        assert User.objects.filter(email="approved@test.com", role='MEDECIN').exists()

    def test_approve_creates_user_with_correct_role(self, api_client, admin_user):
        """After approval, the created User has role=MEDECIN and is_active=True."""
        app = DoctorApplication.objects.create(
            email="role.test@test.com", first_name="Role", last_name="Test"
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-approve', kwargs={'pk': app.id})
        api_client.post(url)
        
        user = User.objects.get(email="role.test@test.com")
        assert user.role == 'MEDECIN'
        assert user.is_active is True

    def test_approve_same_application_twice_returns_400(self, api_client, admin_user):
        """Approving an already-approved application returns 400."""
        app = DoctorApplication.objects.create(
            email="twice@test.com", first_name="T", last_name="W", status='APPROVED'
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-approve', kwargs={'pk': app.id})
        response = api_client.post(url)
        
        assert response.status_code == 400
        assert "already approved" in str(response.data['detail'])

    def test_admin_can_reject_application_with_reason(self, api_client, admin_user):
        """POST /api/auth/applications/{id}/reject/ with a reason sets status=REJECTED and stores the reason."""
        app = DoctorApplication.objects.create(
            email="reject@test.com", first_name="R", last_name="J"
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-reject', kwargs={'pk': app.id})
        data = {"reason": "Not enough experience."}
        response = api_client.post(url, data)
        
        assert response.status_code == 200
        app.refresh_from_db()
        assert app.status == 'REJECTED'
        assert app.rejection_reason == "Not enough experience."

    def test_reject_non_pending_application_returns_400(self, api_client, admin_user):
        """Rejecting an already-approved application returns 400."""
        app = DoctorApplication.objects.create(
            email="notpending@test.com", first_name="N", last_name="P", status='APPROVED'
        )
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:doctor-application-reject', kwargs={'pk': app.id})
        response = api_client.post(url, {"reason": "fail"})
        
        assert response.status_code == 400

@pytest.mark.django_db
class TestPatientRegistration:
    """Tests for patient self-registration."""

    def test_patient_can_self_register(self, api_client):
        """POST /api/auth/register/patient/ creates a User with role=PATIENT and returns 201."""
        url = reverse('authentication:patient_register')
        data = {
            "email": "new.patient@test.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "New",
            "last_name": "Patient"
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        assert User.objects.filter(email="new.patient@test.com", role='PATIENT').exists()

    def test_patient_registration_password_validation(self, api_client):
        """Registering with a weak password (< 8 chars or no uppercase) returns 400 with validation error."""
        url = reverse('authentication:patient_register')
        # Weak password (too short, no uppercase)
        data = {
            "email": "weak@test.com",
            "password": "weak",
            "password_confirm": "weak",
            "first_name": "W",
            "last_name": "E"
        }
        response = api_client.post(url, data)
        assert response.status_code == 400
        assert "password" in response.data

    def test_patient_registration_password_mismatch(self, api_client):
        """Registering with non-matching passwords returns 400."""
        url = reverse('authentication:patient_register')
        data = {
            "email": "mismatch@test.com",
            "password": "StrongPass123!",
            "password_confirm": "WrongPass123!",
            "first_name": "M",
            "last_name": "I"
        }
        response = api_client.post(url, data)
        assert response.status_code == 400
        assert "password_confirm" in response.data

    def test_patient_can_login_after_registration(self, api_client):
        """After self-registering, patient can immediately login via POST /api/auth/token/ and receives a valid JWT."""
        # 1. Register
        register_url = reverse('authentication:patient_register')
        register_data = {
            "email": "login_test@test.com",
            "password": "StrongPass123!",
            "password_confirm": "StrongPass123!",
            "first_name": "Login",
            "last_name": "Test"
        }
        api_client.post(register_url, register_data)

        # 2. Login
        login_url = reverse('authentication:token_obtain_pair')
        login_data = {
            "email": "login_test@test.com",
            "password": "StrongPass123!"
        }
        response = api_client.post(login_url, login_data)
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data

@pytest.mark.django_db
class TestSecretaryCreation:
    """Tests for secretary account creation by doctors."""

    def test_doctor_can_create_secretary(self, api_client, medecin_user):
        """POST /api/auth/register/secretary/ with MEDECIN token creates a User with role=SECRETAIRE and returns 201."""
        api_client.force_authenticate(user=medecin_user)
        url = reverse('authentication:secretary_create')
        data = {
            "email": "secretary@clinic.test",
            "first_name": "Alice",
            "last_name": "Sec",
            "phone": "0601010101"
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        assert User.objects.filter(email="secretary@clinic.test", role='SECRETAIRE').exists()

    def test_patient_cannot_create_secretary(self, api_client, patient_user):
        """POST /api/auth/register/secretary/ with PATIENT token returns 403."""
        api_client.force_authenticate(user=patient_user)
        url = reverse('authentication:secretary_create')
        data = {
            "email": "bad@clinic.test",
            "first_name": "Bad",
            "last_name": "Patient"
        }
        response = api_client.post(url, data)
        assert response.status_code == 403

    from django.test import override_settings
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_secretary_creation_sends_email(self, api_client, medecin_user):
        """Creating a secretary sends a welcome email (verify via Django's mail.outbox in tests)."""
        api_client.force_authenticate(user=medecin_user)
        url = reverse('authentication:secretary_create')
        data = {
            "email": "email_test@clinic.test",
            "first_name": "Email",
            "last_name": "Test"
        }
        mail.outbox = [] # Clear outbox
        response = api_client.post(url, data)
        assert response.status_code == 201
        
        assert len(mail.outbox) == 1
        assert "Medera" in mail.outbox[0].subject
        assert "compte secrétaire" in mail.outbox[0].subject.lower()
        assert "email_test@clinic.test" in mail.outbox[0].to
