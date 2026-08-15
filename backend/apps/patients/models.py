import uuid
from datetime import date
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError

class Patient(models.Model):
    """
    Patient model — core entity of Medera.
    Every other module references Patient records.
    Business rules enforced here:
    - RG-PAT-01: duplicate detection on (first_name + last_name + birth_date)
    - RG-PAT-02: soft delete only (is_archived) — never DELETE
    - internal_id generated as PAT-YYYYMMDD-XXXX on first save
    """

    GENDER_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
        ('O', 'Autre'),
    ]

    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    internal_id = models.CharField(max_length=20, unique=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_patients'
    )
    cabinet = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cabinet_patients',
        help_text="The doctor who owns this patient record"
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patient_record'
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(max_length=10, default='fr')
    blood_type = models.CharField(max_length=5, blank=True, choices=BLOOD_TYPE_CHOICES)
    allergies = models.JSONField(default=list, blank=True)
    medical_history = models.TextField(blank=True)
    emergency_contact = models.JSONField(default=dict, blank=True)
    # Structure: {"name": str, "phone": str, "relation": str}
    
    nss_encrypted = models.TextField(blank=True)
    # Store AES-256 encrypted NSS. Plain text NSS never stored.
    
    insurance = models.CharField(max_length=100, blank=True)
    health_profile_complete = models.BooleanField(default=False)
    last_visit = models.DateField(null=True, blank=True)
    
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['internal_id']),
        ]

    def save(self, *args, **kwargs):
        if not self.internal_id:
            today = date.today()
            prefix = f"PAT-{today.strftime('%Y%m%d')}-"
            count = Patient.objects.filter(internal_id__startswith=prefix).count()
            self.internal_id = f"{prefix}{str(count+1).zfill(4)}"
        super().save(*args, **kwargs)

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def archive(self):
        """
        Check no future appointments exist for this patient.
        """
        if self.appointments.filter(
            start_datetime__gt=timezone.now(),
            status__in=['PLANNED', 'CONFIRMED']
        ).exists():
            raise ValidationError("L'archivage est impossible car le patient a des rendez-vous futurs planifiés.")
        self.is_archived = True
        self.save()

    @classmethod
    def check_duplicate(cls, first_name, last_name, birth_date, exclude_id=None):
        """
        Returns QuerySet of patients matching all 3 fields.
        Used in serializer for RG-PAT-01.
        """
        qs = cls.objects.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            birth_date=birth_date
        )
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs

    def __str__(self):
        return f"{self.internal_id} - {self.get_full_name()}"


class DoctorReview(models.Model):
    """
    Patient reviews for doctors.
    Used for public profile feedback.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_reviews'
    )
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_reviews'
    )
    rating = models.IntegerField(default=5) # 1-5
    comment = models.TextField(blank=True)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Avis Docteur"
        verbose_name_plural = "Avis Docteurs"

    def __str__(self):
        return f"Review by {self.patient.get_full_name()} for Dr. {self.doctor.last_name}"
