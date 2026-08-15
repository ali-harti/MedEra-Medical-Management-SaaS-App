"""
Real-time broadcast utilities for the CabinetConsumer.
Call these helpers from any view/signal to push events to all cabinet members.
"""
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_to_cabinet(cabinet_doctor_id: str, event_type: str, data: dict):
    """
    Broadcast a message to all WebSocket clients in a cabinet group.
    
    Args:
        cabinet_doctor_id: The UUID (as string) of the doctor who owns the cabinet.
        event_type: A string label e.g. 'NEW_APPOINTMENT', 'NEW_MESSAGE', 'NOTIFICATION'.
        data: The payload dict that will be JSON-serialized to the frontend.
    """
    channel_layer = get_channel_layer()
    group_name = f"cabinet_{cabinet_doctor_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "cabinet_message",
            "event_type": event_type,
            "message": data,
        }
    )


def broadcast_to_user(user_id: str, event_type: str, data: dict):
    """
    Broadcast a message to a specific user's personal WebSocket group.
    
    Args:
        user_id: The UUID (as string) of the user.
        event_type: A string label e.g. 'NEW_APPOINTMENT', 'NOTIFICATION'.
        data: The payload dict that will be JSON-serialized to the frontend.
    """
    channel_layer = get_channel_layer()
    group_name = f"user_{user_id}"
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "cabinet_message",
            "event_type": event_type,
            "message": data,
        }
    )


def create_and_broadcast_notification(recipient, cabinet_doctor, notif_type: str, title: str, message: str, action_url: str = None):
    """
    Creates a Notification DB record and pushes it to the recipient's cabinet group.
    """
    from apps.messaging.models import Notification

    notif = Notification.objects.create(
        recipient=recipient,
        cabinet=cabinet_doctor,
        type=notif_type,
        title=title,
        message=message,
        action_url=action_url,
    )

    try:
        payload = {
            "id": str(notif.id),
            "type": notif_type,
            "title": title,
            "message": message,
            "action_url": action_url,
            "recipient_id": str(recipient.id),
            "is_read": False,
            "created_at": notif.created_at.isoformat(),
        }
        
        # If the recipient is a PATIENT, they do not belong to a cabinet group
        if recipient.role == 'PATIENT':
            broadcast_to_user(
                str(recipient.id),
                "NOTIFICATION",
                payload
            )
        elif cabinet_doctor:
            broadcast_to_cabinet(
                str(cabinet_doctor.id),
                "NOTIFICATION",
                payload
            )
    except Exception:
        # WebSocket broadcast failure should never break the HTTP flow
        pass

    return notif
