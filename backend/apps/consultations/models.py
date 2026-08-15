import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.patients.models import Patient
from apps.appointments.models import Appointment

class Consultation(models.Model):
    """
    Consultation model — clinical core of Medera.
    Business rules:
    - RG-CONS-01: only MEDECIN can create/modify/finalize
    - RG-CONS-02: FINALIZED is read-only except corrective_notes
    - RG-CONS-04: AI analysis requires >= 2 symptoms
    """

    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('IN_PROGRESS', 'En Cours'),
        ('FINALIZED', 'Finalisé'),
        ('CANCELLED', 'Annulée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.ForeignKey(
        Appointment, 
        on_delete=models.SET_NULL,
        null=True, 
        blank=True, 
        related_name='consultations'
    )
    # NULLABLE — consultation can exist without prior appointment.
    
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='consultations')
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='consultations'
    )
    
    motive = models.CharField(max_length=255, blank=True)
    anamnesis = models.TextField(blank=True)
    symptoms = models.JSONField(default=list)
    # List of symptom strings: ["fever", "headache", "fatigue"]
    
    clinical_exam = models.JSONField(default=dict)
    # Structure: {"bp": "120/80", "hr": 72, "temp": 37.2, "weight": 70, "height": 175, "spo2": 98, "notes": ""}
    
    diagnosis = models.TextField(blank=True)
    icd10_code = models.CharField(max_length=10, blank=True)
    icd10_label = models.CharField(max_length=255, blank=True)
    clinical_notes = models.TextField(blank=True)
    
    ai_suggestions = models.JSONField(default=list)
    # Stored even if ignored by doctor.
    ai_used = models.BooleanField(default=False)
    
    metadata = models.JSONField(default=dict, blank=True)
    # v3.0.0: Store coverage, version, clinical notes, recognized symptoms
    
    corrective_notes = models.JSONField(default=list)
    # Append-only after finalization.
    # Structure: [{"note": str, "added_by": str, "added_at": ISO datetime str}]
    
    consultation_type = models.CharField(max_length=20, choices=[('IN_PERSON', 'Présentiel'), ('VIDEO', 'Vidéo')], default='IN_PERSON')
    
    # Video Session Tracking
    video_session_active = models.BooleanField(default=False)
    video_patient_url = models.URLField(max_length=500, null=True, blank=True)
    video_started_at = models.DateTimeField(null=True, blank=True)
    video_duration = models.IntegerField(null=True, blank=True) # in seconds
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def finalize(self):
        if self.status == 'FINALIZED':
            raise ValidationError("Déjà finalisée.")
        self.status = 'FINALIZED'
        self.finalized_at = timezone.now()
        self.save()
        
        # Trigger WhatsApp prescription delivery if applicable
        try:
            prescription = self.prescriptions.first()
            if prescription and not prescription.is_cancelled:
                import os
                from django.conf import settings
                from django.core.files.base import ContentFile
                from django.core.files.storage import default_storage
                import requests as http_requests
                
                # generate PDF if not exists
                if not prescription.pdf_path:
                    from apps.prescriptions.pdf_generator import generate_prescription_pdf
                    pdf_bytes = generate_prescription_pdf(prescription, cancelled=False)
                    filename = f"prescriptions/prescription_{prescription.id}.pdf"
                    path = default_storage.save(filename, ContentFile(pdf_bytes))
                    prescription.pdf_path = path
                    prescription.save(update_fields=['pdf_path'])
                
                # send to WhatsApp
                if self.patient.phone:
                    whatsapp_url = f"{getattr(settings, 'WHATSAPP_AGENT_URL', 'http://whatsapp_agent:8001')}/send-notification"
                    base_backend_url = getattr(settings, 'API_PUBLIC_URL', getattr(settings, 'BACKEND_URL', 'http://localhost:8000'))
                    pdf_url = f"{base_backend_url}{settings.MEDIA_URL}{prescription.pdf_path}"
                    
                    payload = {
                        "whatsapp_number": self.patient.phone,
                        "event": "prescription_ready",
                        "prescription_url": pdf_url,
                        "doctor_name": f"Dr. {self.doctor.last_name}"
                    }
                    http_requests.post(whatsapp_url, json=payload, timeout=10)
        except Exception as e:
            # Do not block finalization if WhatsApp delivery fails
            print(f"Failed to send prescription via WhatsApp: {e}")

    def add_corrective_note(self, note_text, user):
        if self.status != 'FINALIZED':
            raise ValidationError("Notes correctives uniquement sur consultation finalisée.")
        note = {
            "note": note_text,
            "added_by": user.get_full_name(),
            "added_at": timezone.now().isoformat()
        }
        # Correctly handle list mutation
        notes = list(self.corrective_notes)
        notes.append(note)
        self.corrective_notes = notes
        self.save(update_fields=['corrective_notes'])

    def __str__(self):
        return f"Consultation {self.id} - {self.patient}"
