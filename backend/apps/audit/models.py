"""
JournalAudit — append-only audit trail.
Written by Django signals on Patient, Appointment,
Consultation, Prescription changes.
Never deleted. Partitioned by timestamp in production.
"""
import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Immutable audit trail entry."""
    
    ACTION_CHOICES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Modification'),
        ('DELETE', 'Suppression'),
        ('LOGIN', 'Connexion'),
        ('LOGOUT', 'Déconnexion'),
        ('LOGIN_FAILED', 'Tentative échouée'),
        ('LOCKOUT', 'Verrouillage compte'),
        ('FINALIZE', 'Finalisation'),
        ('CANCEL', 'Annulation'),
        ('ARCHIVE', 'Archivage'),
        ('PDF_GENERATED', 'PDF généré'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=50, 
        choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action']),
        ]
    
    def __str__(self):
        return f"{self.action} on {self.model_name}:{self.object_id}"
    
    @classmethod
    def log(cls, user, action, model_name, object_id='', 
            changes=None, ip_address=None):
        """
        Class method to create an audit entry.
        Silently fails — never raises exceptions.
        Audit must never break the main request flow.
        """
        try:
            cls.objects.create(
                user=user,
                action=action,
                model_name=model_name,
                object_id=str(object_id),
                changes=changes or {},
                ip_address=ip_address,
            )
        except Exception:
            # Fallback for when DB might be locked or other transient errors
            pass
