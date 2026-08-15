"""
Audit signals — automatically log model changes.
The current user is stored in thread-local storage
by AuditMiddleware and read here.
"""
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver

_thread_locals = threading.local()


def get_current_user():
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    _thread_locals.user = user


class AuditMiddleware:
    """
    Middleware that stores the current request user
    in thread-local storage for signal access.
    """
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_current_user(request.user)
        else:
            set_current_user(None)
        response = self.get_response(request)
        set_current_user(None)
        return response


def _get_ip(request=None):
    return None  # IP captured at view level if needed, usually null here


@receiver(post_save, sender='patients.Patient')
def log_patient_change(sender, instance, created, **kwargs):
    from .models import AuditLog
    action = 'CREATE' if created else 'UPDATE'
    AuditLog.log(
        user=get_current_user(),
        action=action,
        model_name='Patient',
        object_id=instance.pk,
        changes={
            'internal_id': instance.internal_id,
            'full_name': instance.get_full_name(),
            'is_archived': getattr(instance, 'is_archived', False),
        }
    )


@receiver(post_save, sender='appointments.Appointment')
def log_appointment_change(sender, instance, created, **kwargs):
    from .models import AuditLog
    action = 'CREATE' if created else 'UPDATE'
    AuditLog.log(
        user=get_current_user(),
        action=action,
        model_name='Appointment',
        object_id=instance.pk,
        changes={
            'status': instance.status,
            'start_datetime': instance.start_datetime.isoformat() if instance.start_datetime else None,
            'patient_id': str(instance.patient_id),
        }
    )


@receiver(post_save, sender='consultations.Consultation')
def log_consultation_change(sender, instance, created, **kwargs):
    from .models import AuditLog
    action = 'FINALIZE' if instance.status == 'FINALIZED' else (
        'CREATE' if created else 'UPDATE')
    AuditLog.log(
        user=get_current_user(),
        action=action,
        model_name='Consultation',
        object_id=instance.pk,
        changes={
            'status': instance.status,
            'patient_id': str(instance.patient_id),
        }
    )


@receiver(post_save, sender='prescriptions.Prescription')
def log_prescription_change(sender, instance, created, **kwargs):
    from .models import AuditLog
    action = 'CANCEL' if instance.is_cancelled else (
        'CREATE' if created else 'UPDATE')
    AuditLog.log(
        user=get_current_user(),
        action=action,
        model_name='Prescription',
        object_id=instance.pk,
        changes={
            'is_cancelled': instance.is_cancelled,
            'patient_id': str(instance.patient_id),
        }
    )
