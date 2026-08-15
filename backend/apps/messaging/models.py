import uuid
from django.db import models
from django.conf import settings
from apps.patients.models import Patient


class Thread(models.Model):
    THREAD_TYPES = [
        ('CLINICAL', 'Clinical (Patient)'),
        ('INTERNAL', 'Internal (Staff)')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread_type = models.CharField(max_length=20, choices=THREAD_TYPES, default='CLINICAL')
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='message_threads', null=True, blank=True)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_threads'
    )
    secretary = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='secretary_threads',
        null=True,
        blank=True
    )
    subject = models.CharField(max_length=255)
    is_closed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        if self.thread_type == 'INTERNAL':
            return f"Internal: {self.subject}"
        return f"Thread {self.subject} — {self.patient}"


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional attachment
    attachment = models.FileField(upload_to='messages/attachments/', null=True, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender} @ {self.created_at}"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('APPOINTMENT', 'Appointment'),
        ('MESSAGE', 'Message'),
        ('SYSTEM', 'System'),
        ('PATIENT', 'Patient'),
        ('INVITATION', 'Invitation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    cabinet = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='cabinet_notifications',
        null=True,
        blank=True
    )
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='SYSTEM')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.recipient.email}: {self.title}"
