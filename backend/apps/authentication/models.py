"""Custom User model for Medera authentication."""
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for Medera.
    Email used for login; role-based access control.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)

    # Role field with choices
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MEDECIN = 'MEDECIN', 'Médecin'
        SECRETAIRE = 'SECRETAIRE', 'Secrétaire'
        PATIENT = 'PATIENT', 'Patient'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
    )

    phone = models.CharField(max_length=20, blank=True)
    avatar = models.FileField(upload_to='avatars/', null=True, blank=True)
    specialty = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    consultation_fee = models.PositiveIntegerField(default=300)
    slot_duration_minutes = models.PositiveIntegerField(default=30)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')
    
    # Hierarchy for secretary-doctor linkage
    created_by = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL, 
        related_name='created_users'
    )
    
    # Link secretary to a specific doctor
    employer = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='secretaries'
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} <{self.email}>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_full_name(self):
        return self.full_name

    def get_cabinet_doctor(self):
        """Returns the doctor who acts as the tenant owner for this user."""
        if self.role == self.Role.MEDECIN:
            return self
        if self.role == self.Role.SECRETAIRE and self.employer:
            return self.employer
        return None


class DoctorApplication(models.Model):
    """
    Pre-authentication table for doctor onboarding applications.

    Flow:
      1. Doctor fills public form → DoctorApplication created (PENDING)
      2. Admin reviews in dashboard → approves or rejects
      3. On approval → User account created automatically with role=MEDECIN
      4. Doctor receives email with credentials

    Business rules:
      - One active application per email (unique on email + PENDING/APPROVED)
      - Admin cannot approve same email twice
      - Rejected applications can be resubmitted after 7 days
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    # Personal info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=False)  # unique per PENDING only
    phone = models.CharField(max_length=20)
    city = models.CharField(max_length=100)

    # Professional info
    specialty = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50)
    clinic_name = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    years_of_experience = models.PositiveSmallIntegerField(default=0)

    # Languages spoken (for patient search later)
    languages = models.JSONField(default=list)

    # Application metadata
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    motivation_message = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    # Tracking
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='reviewed_applications'
    )

    # Link to created user (set on approval)
    created_user = models.OneToOneField(
        'User',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='doctor_application'
    )

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email}) — {self.status}"

    def approve(self, admin_user):
        """
        Approve this application:
        1. Create User with role=MEDECIN and temporary password
        2. Send welcome email with credentials
        3. Update application status to APPROVED

        Returns the created User instance.
        """
        from django.core.exceptions import ValidationError
        from django.utils.crypto import get_random_string
        from django.core.mail import send_mail
        from django.utils import timezone

        if self.status == self.Status.APPROVED:
            raise ValidationError("This candidacy is already approved.")

        if User.objects.filter(email=self.email).exists():
            raise ValidationError(
                f"An account with email {self.email} already exists."
            )

        # Generate secure temporary password
        temp_password = get_random_string(12)

        # Create the doctor account
        user = User.objects.create_user(
            email=self.email,
            password=temp_password,
            first_name=self.first_name,
            last_name=self.last_name,
            role='MEDECIN',
            is_active=True,
        )

        # Update application
        self.status = self.Status.APPROVED
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.created_user = user
        self.save()

        # Send welcome email
        send_mail(
            subject='Medera — Your doctor account has been approved',
            message=(
                f"Hello Dr. {self.first_name} {self.last_name},\n\n"
                f"Your candidacy on Medera has been approved.\n\n"
                f"Your login credentials:\n"
                f"  Email : {self.email}\n"
                f"  Temporary Password : {temp_password}\n\n"
                f"Log in at http://localhost:3000/login\n"
                f"Please change your password upon your first login.\n\n"
                f"The Medera Team"
            ),
            from_email='noreply@medera.com',
            recipient_list=[self.email],
            fail_silently=True,
        )

        return user

    def reject(self, admin_user, reason=''):
        """
        Reject this application.
        Sets status to REJECTED and stores the reason.
        """
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        if self.status != self.Status.PENDING:
            raise ValidationError(
                "Only pending applications can be rejected."
            )

        self.status = self.Status.REJECTED
        self.rejection_reason = reason
        self.reviewed_at = timezone.now()
        self.reviewed_by = admin_user
        self.save()

        # Send rejection email
        from django.core.mail import send_mail
        send_mail(
            subject='Medera — Regarding your doctor application',
            message=(
                f"Hello Dr. {self.first_name} {self.last_name},\n\n"
                f"Thank you for your interest in joining Medera.\n\n"
                f"After reviewing your candidacy, we regret to inform you that "
                f"we cannot approve your registration at this time.\n\n"
                f"Reason: {reason if reason else 'Documentation incomplete or criteria not met.'}\n\n"
                f"Best regards,\n"
                f"The Medera Team"
            ),
            from_email='noreply@medera.com',
            recipient_list=[self.email],
            fail_silently=True,
        )


class SecretaryInvitation(models.Model):
    """
    Stores a pending invitation for a secretary to join a doctor's cabinet.
    The token is emailed to the secretary; they use it to set their password.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    doctor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    email = models.EmailField()
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def is_expired(self):
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(hours=72)

    def __str__(self):
        return f"Invitation to {self.email} from Dr. {self.doctor.get_full_name()}"
