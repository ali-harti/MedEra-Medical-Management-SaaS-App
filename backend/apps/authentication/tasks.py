from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from .models import User

@shared_task
def send_welcome_email(user_id, temp_password, creator_name=None):
    """
    Sends welcome email to a new MedEra user (Doctor or Secretary).
    """
    try:
        user = User.objects.get(id=user_id)
        
        if user.role == 'SECRETAIRE':
            subject = 'Medera — Votre compte secrétaire'
            message = (
                f"Bonjour {user.first_name} {user.last_name},\n\n"
                f"Le Dr. {creator_name} a créé votre compte "
                f"secrétaire sur Medera.\n\n"
                f"Vos identifiants :\n"
                f"  Email : {user.email}\n"
                f"  Mot de passe temporaire : {temp_password}\n\n"
                f"Connectez-vous sur : http://localhost:3000/login\n\n"
                f"L'équipe Medera"
            )
        else:
            subject = 'Medera — Bienvenue sur la plateforme'
            message = (
                f"Bonjour {user.first_name} {user.last_name},\n\n"
                f"Votre compte Medera a été créé avec succès.\n\n"
                f"Vos identifiants :\n"
                f"  Email : {user.email}\n"
                f"  Mot de passe temporaire : {temp_password}\n\n"
                f"L'équipe Medera"
            )
            
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Email sent to {user.email}"
    except User.DoesNotExist:
        return f"User {user_id} not found"
    except Exception as e:
        return f"Error sending email: {str(e)}"
