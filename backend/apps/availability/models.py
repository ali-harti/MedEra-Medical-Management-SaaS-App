import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class DoctorAvailability(models.Model):
    DAYS = [
        (0, 'Lundi'),
        (1, 'Mardi'),
        (2, 'Mercredi'),
        (3, 'Jeudi'),
        (4, 'Vendredi'),
        (5, 'Samedi'),
        (6, 'Dimanche')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='availabilities'
    )
    day_of_week = models.SmallIntegerField(choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    consultation_types = models.JSONField(default=list)  # ['PRESENTIEL', 'VISIO']
    slot_duration_minutes = models.SmallIntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = [['doctor', 'day_of_week']]
        verbose_name = 'Disponibilité Docteur'
        verbose_name_plural = 'Disponibilités Docteurs'
        ordering = ['day_of_week', 'start_time']
    
    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("L'heure de début doit être antérieure à l'heure de fin.")
            
    def save(self, *args, **kwargs):
        self.full_clean()
        if not self.consultation_types:
            self.consultation_types = ['PRESENTIEL']
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.doctor.last_name} — {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"
