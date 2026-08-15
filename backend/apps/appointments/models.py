import uuid
from datetime import timedelta
from django.db import models
from django.db.models import Q, Index
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.patients.models import Patient

class Appointment(models.Model):
    """
    RendezVous model — scheduling core.
    Business rules enforced here:
    - RG-RDV-01: no overlapping appointments for same doctor
    - RG-RDV-03: DONE status is terminal — no modifications
    - Auto-creates DRAFT consultation when status → DONE
    """

    TYPE_CHOICES = [
        ('FIRST', 'Première consultation'),
        ('FOLLOW_UP', 'Suivi'),
        ('EMERGENCY', 'Urgence'),
    ]

    STATUS_CHOICES = [
        ('REQUESTED', 'Demande'),
        ('PLANNED', 'Planifié'),
        ('CONFIRMED', 'Confirmé'),
        ('IN_PROGRESS', 'En cours'),
        ('DONE', 'Terminé'),
        ('CANCELLED', 'Annulé'),
        ('REJECTED', 'Refusé'),
    ]

    CONSULTATION_TYPE_CHOICES = [
        ('PRESENTIEL', 'Présentiel'),
        ('VISIO', 'Vidéo-consultation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='doctor_appointments'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_appointments'
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    duration_minutes = models.PositiveSmallIntegerField(default=30)
    motive = models.CharField(max_length=255)
    appointment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='FIRST')
    consultation_type = models.CharField(
        max_length=20, 
        choices=CONSULTATION_TYPE_CHOICES, 
        default='PRESENTIEL'
    )
    room = models.CharField(max_length=50, null=True, blank=True, default='Salle 1')
    online_meeting_url = models.URLField(max_length=500, null=True, blank=True)
    video_link = models.URLField(max_length=500, null=True, blank=True)
    booked_via_whatsapp = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    cancellation_reason = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.end_datetime and self.start_datetime:
            self.end_datetime = self.start_datetime + timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-start_datetime']
        indexes = [
            Index(fields=['doctor', 'start_datetime']),
            Index(fields=['patient', 'start_datetime']),
            Index(fields=['status']),
        ]

    @classmethod
    def get_conflicting_appointments(cls, doctor, start_datetime, end_datetime, exclude_id=None):
        """
        Returns QuerySet of overlapping active appointments for a doctor.
        """
        qs = cls.objects.filter(
            doctor=doctor,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime
        ).exclude(status__in=['CANCELLED', 'REJECTED'])
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
        return qs

    @classmethod
    def get_next_available_slots(cls, doctor, preferred_datetime, count=3, duration_minutes=30):
        """
        Starting from preferred_datetime, scan forward in 30-min increments.
        """
        slots = []
        current_start = preferred_datetime
        if current_start < timezone.now():
            current_start = timezone.now()
        
        # Round to nearest 15 mins for cleaner slots if needed, but here we just go forward
        while len(slots) < count:
            current_end = current_start + timedelta(minutes=duration_minutes)
            if not cls.get_conflicting_appointments(doctor, current_start, current_end).exists():
                slots.append((current_start, current_end))
            current_start += timedelta(minutes=30)
        return slots

    def transition_to(self, new_status, reason=None):
        """
        Validates state machine transitions.
        """
        valid_transitions = {
            'REQUESTED': ['PLANNED', 'REJECTED'],
            'PLANNED': ['CONFIRMED', 'CANCELLED'],
            'CONFIRMED': ['IN_PROGRESS', 'CANCELLED'],
            'IN_PROGRESS': ['DONE'],
            'DONE': [],
            'CANCELLED': [],
            'REJECTED': [],
        }

        if new_status not in valid_transitions.get(self.status, []):
            raise ValidationError(f"Transition de {self.status} vers {new_status} impossible.")

        if new_status in ['CANCELLED', 'REJECTED']:
            if not reason:
                raise ValidationError("Raison d'annulation requise.")
            self.cancellation_reason = reason
        
        self.status = new_status
        self.save()

        if new_status == 'DONE':
            self._create_draft_consultation()
        
        return self

    def _create_draft_consultation(self):
        from apps.consultations.models import Consultation
        if not Consultation.objects.filter(appointment=self).exists():
            Consultation.objects.create(
                appointment=self,
                patient=self.patient,
                doctor=self.doctor,
                status='DRAFT'
            )

    def __str__(self):
        return f"{self.patient} w/ Dr. {self.doctor.last_name} @ {self.start_datetime}"
