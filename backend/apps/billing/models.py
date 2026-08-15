import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.patients.models import Patient
from apps.consultations.models import Consultation

class Billing(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PAID', 'Payé'),
        ('CANCELLED', 'Annulé'),
        ('REFUNDED', 'Remboursé'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Espèces'),
        ('CARD', 'Carte Bancaire'),
        ('CHECK', 'Chèque'),
        ('TRANSFER', 'Virement'),
        ('ONLINE', 'Paiement en ligne'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='bills')
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='doctor_bills'
    )
    consultation = models.OneToOneField(
        Consultation, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='billing'
    )
    
    amount_total = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=2, default=0) # e.g. 0.20 for 20%
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    
    notes = models.TextField(blank=True)
    items = models.JSONField(default=list) # List of {description, price}
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
        ]

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            date_str = timezone.now().strftime('%Y%m%d')
            count = Billing.objects.filter(created_at__date=timezone.now().date()).count() + 1
            self.invoice_number = f"INV-{date_str}-{count:04d}"
        
        if self.status == 'PAID' and not self.paid_at:
            self.paid_at = timezone.now()
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} — {self.patient.get_full_name()} ({self.amount_total} MAD)"

class OnlinePayment(models.Model):
    """
    Stub for tracking external gateway payments (PayTech, Stripe).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    billing = models.ForeignKey(Billing, on_delete=models.CASCADE, related_name='online_payments')
    transaction_id = models.CharField(max_length=255, unique=True)
    provider = models.CharField(max_length=50) # 'PayTech', 'Stripe'
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50)
    raw_response = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.transaction_id} ({self.provider})"
