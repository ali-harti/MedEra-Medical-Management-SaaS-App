import uuid
from django.db import models
from django.conf import settings
from apps.patients.models import Patient
from apps.consultations.models import Consultation

class Prescription(models.Model):
    """
    Prescription model — medical orders entity.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consultation = models.ForeignKey(
        Consultation, 
        on_delete=models.CASCADE, 
        related_name='prescriptions',
        null=True,
        blank=True
    )
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='prescriptions')
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='prescriptions'
    )
    
    general_instructions = models.TextField(blank=True)
    is_renewable = models.BooleanField(default=False)
    renewal_count = models.PositiveSmallIntegerField(default=0)
    is_cancelled = models.BooleanField(default=False)
    pdf_path = models.CharField(max_length=512, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-issued_at']

    def cancel(self):
        self.is_cancelled = True
        self.save(update_fields=['is_cancelled'])
        self._regenerate_cancelled_pdf()

    def _regenerate_cancelled_pdf(self):
        """Regenerate PDF with 'ANNULÉE' watermark after cancellation."""
        from .pdf_generator import generate_prescription_pdf
        from django.core.files.base import ContentFile
        from django.core.files.storage import default_storage
        import os
        
        # In a real environment, we would save to S3 or similar
        # Here we use the default storage
        pdf_bytes = generate_prescription_pdf(self, cancelled=True)
        filename = f"prescriptions/cancelled_{self.id}.pdf"
        
        # Save to storage
        path = default_storage.save(filename, ContentFile(pdf_bytes))
        self.pdf_path = path
        self.save(update_fields=['pdf_path'])

    def __str__(self):
        return f"Prescription {self.id} for {self.patient}"

class MedicationLine(models.Model):
    """
    Line items for a prescription.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        Prescription, 
        on_delete=models.CASCADE, 
        related_name='medication_lines'
    )
    drug_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    form = models.CharField(max_length=50, blank=True)
    # e.g., "comprimé", "sirop", "injectable"
    dosology = models.CharField(max_length=200)
    # e.g., "1 comprimé matin et soir"
    duration_days = models.PositiveSmallIntegerField(null=True, blank=True)
    special_instructions = models.TextField(blank=True)

    def __str__(self):
        return f"{self.drug_name} - {self.dosage}"
