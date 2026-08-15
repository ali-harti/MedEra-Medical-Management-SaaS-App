import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.contrib.auth import get_user_model
from apps.authentication.models import DoctorApplication
from apps.appointments.models import Appointment
from apps.billing.models import Billing
from apps.audit.models import AuditLog

User = get_user_model()

def trigger_admin_dashboard_refresh():
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "admin_dashboard",
            {
                "type": "dashboard_update",
                "event_type": "REFRESH"
            }
        )

@receiver(post_save, sender=User)
@receiver(post_delete, sender=User)
def user_changed(sender, instance, **kwargs):
    trigger_admin_dashboard_refresh()

@receiver(post_save, sender=DoctorApplication)
@receiver(post_delete, sender=DoctorApplication)
def application_changed(sender, instance, **kwargs):
    trigger_admin_dashboard_refresh()

@receiver(post_save, sender=Appointment)
@receiver(post_delete, sender=Appointment)
def appointment_changed(sender, instance, **kwargs):
    trigger_admin_dashboard_refresh()

@receiver(post_save, sender=Billing)
@receiver(post_delete, sender=Billing)
def billing_changed(sender, instance, **kwargs):
    trigger_admin_dashboard_refresh()

@receiver(post_save, sender=AuditLog)
@receiver(post_delete, sender=AuditLog)
def audit_changed(sender, instance, **kwargs):
    trigger_admin_dashboard_refresh()
