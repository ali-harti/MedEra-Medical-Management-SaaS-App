"""
Admin Portal models.
Stores system settings, cabinet configuration, and RBAC.
"""
from django.db import models
from django.conf import settings


class SystemSettings(models.Model):
    """Global system settings."""
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='settings_updates'
    )

    class Meta:
        verbose_name = "Paramètre système"
        verbose_name_plural = "Paramètres système"

    def __str__(self):
        return self.key


class CabinetConfig(models.Model):
    """Cabinet configuration."""
    name = models.CharField(max_length=255, default="MedEra Clinique")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    timezone = models.CharField(max_length=50, default="Africa/Casablanca")
    language = models.CharField(max_length=10, default="fr")

    # Working hours stored as JSON
    working_hours = models.JSONField(default=dict)

    # Default appointment settings
    default_duration = models.IntegerField(default=30)
    max_advance_days = models.IntegerField(default=30)
    buffer_minutes = models.IntegerField(default=15)

    # Notification settings
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    reminder_timings = models.JSONField(default=list)

    # Security settings
    session_timeout = models.IntegerField(default=60)
    min_password_length = models.IntegerField(default=8)
    require_special_chars = models.BooleanField(default=True)
    two_factor_enabled = models.BooleanField(default=False)
    ip_whitelist = models.JSONField(default=list)

    # Backup settings
    backup_schedule = models.CharField(
        max_length=20,
        choices=[
            ('DAILY', 'Quotidien'),
            ('WEEKLY', 'Hebdomadaire'),
            ('MONTHLY', 'Mensuel'),
        ],
        default='WEEKLY'
    )
    backup_time = models.TimeField(default='02:00')

    # Consultation rooms
    rooms = models.JSONField(default=list)

    # Specialties
    specialties = models.JSONField(default=list)

    # Insurance providers
    insurances = models.JSONField(default=list)

    # Holidays
    holidays = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration cabinet"
        verbose_name_plural = "Configurations cabinet"

    def __str__(self):
        return self.name


class PermissionMatrix(models.Model):
    """Role-based access control matrix."""
    role = models.CharField(
        max_length=20,
        choices=[
            ('ADMIN', 'Administrateur'),
            ('MEDECIN', 'Médecin'),
            ('SECRETAIRE', 'Secrétaire'),
        ],
        unique=True
    )
    permissions = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Matrice de permissions"
        verbose_name_plural = "Matrices de permissions"

    def __str__(self):
        return self.role


class Backup(models.Model):
    """Backup history."""
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('RUNNING', 'En cours'),
        ('COMPLETED', 'Terminé'),
        ('FAILED', 'Échoué'),
    ]

    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Sauvegarde"
        verbose_name_plural = "Sauvegardes"

    def __str__(self):
        return f"Backup {self.created_at} - {self.status}"