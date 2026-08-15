"""
Onboarding views:
  POST /api/auth/doctor/register/   — public Doctor self-registration (sends welcome email)
  POST /api/auth/invite-secretary/  — Doctor invites a secretary (sends invite email with token link)
  POST /api/auth/secretary-signup/  — Secretary sets password using invite token
"""
import uuid
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.password_validation import validate_password
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import User, SecretaryInvitation
from .permissions import IsMedecin


class DoctorRegisterView(APIView):
    """
    Public endpoint. A real doctor registers themselves.
    Creates the account (inactive=False for now so they can login immediately),
    and sends a welcome email.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        required = ['email', 'password', 'first_name', 'last_name']
        for field in required:
            if not data.get(field):
                return Response({field: 'This field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        email = data['email'].lower().strip()

        if User.objects.filter(email=email).exists():
            return Response({'email': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(data['password'])
        except Exception as e:
            return Response({'password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=email,
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role='MEDECIN',
            specialty=data.get('specialty', ''),
            phone=data.get('phone', ''),
            is_active=True,
        )

        # Send welcome email
        try:
            send_mail(
                subject='Welcome to Medera — Your Cabinet is Ready',
                message=f"""Dear Dr. {user.first_name} {user.last_name},

Your Medera account has been created successfully.

You can now log in at: http://localhost:5173/login

Email: {user.email}

To invite your secretary, log in and go to Settings > Staff Management.

Best regards,
The Medera Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Email failure should not block registration

        return Response({
            'detail': 'Doctor account created. Welcome to Medera!',
            'email': user.email,
            'role': user.role,
        }, status=status.HTTP_201_CREATED)


class InviteSecretaryView(APIView):
    """
    Doctor invites a secretary by email.
    Creates a SecretaryInvitation token and emails the invite link.
    """
    permission_classes = [IsMedecin]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not email:
            return Response({'email': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'email': 'A user with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        # Revoke any existing pending invite for this doctor+email
        SecretaryInvitation.objects.filter(
            doctor=request.user, email=email, is_used=False
        ).delete()

        invitation = SecretaryInvitation.objects.create(
            doctor=request.user,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        signup_link = f"http://localhost:5173/secretary-signup?token={invitation.token}"

        try:
            send_mail(
                subject=f'You are invited to join Dr. {request.user.get_full_name()}\'s cabinet on Medera',
                message=f"""Hello {first_name or email},

Dr. {request.user.get_full_name()} has invited you to join their medical cabinet on Medera as a Secretary.

Click the link below to create your account:
{signup_link}

This link expires in 72 hours.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
The Medera Team
""",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        # Notify the doctor in real-time
        try:
            from apps.core.broadcast import create_and_broadcast_notification
            create_and_broadcast_notification(
                recipient=request.user,
                cabinet_doctor=request.user,
                notif_type='SYSTEM',
                title='Secretary Invitation Sent',
                message=f'An invitation has been sent to {email}.',
            )
        except Exception:
            pass

        return Response({
            'detail': f'Invitation sent to {email}.',
            'token': str(invitation.token),
        }, status=status.HTTP_201_CREATED)


class SecretarySignupView(APIView):
    """
    Secretary sets their password using the invite token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        password = request.data.get('password')

        if not token or not password:
            return Response({'detail': 'token and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = SecretaryInvitation.objects.get(token=token, is_used=False)
        except SecretaryInvitation.DoesNotExist:
            return Response({'detail': 'Invalid or expired invitation token.'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.is_expired():
            return Response({'detail': 'This invitation link has expired. Please ask your doctor to resend.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except Exception as e:
            return Response({'password': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        # Create the secretary user
        user = User.objects.create_user(
            email=invitation.email,
            password=password,
            first_name=invitation.first_name,
            last_name=invitation.last_name,
            role='SECRETAIRE',
            is_active=True,
            employer=invitation.doctor,
            created_by=invitation.doctor,
        )

        invitation.is_used = True
        invitation.save()

        # Notify the doctor
        try:
            from apps.core.broadcast import create_and_broadcast_notification
            create_and_broadcast_notification(
                recipient=invitation.doctor,
                cabinet_doctor=invitation.doctor,
                notif_type='SYSTEM',
                title='Secretary Joined',
                message=f'{user.get_full_name()} has accepted your invitation and joined your cabinet.',
            )
        except Exception:
            pass

        return Response({
            'detail': 'Account created successfully. You can now log in.',
            'email': user.email,
            'role': user.role,
        }, status=status.HTTP_201_CREATED)


class ValidateInviteTokenView(APIView):
    """
    GET /api/auth/secretary-signup/?token=xxx — validate token before showing signup form.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token')
        if not token:
            return Response({'valid': False, 'detail': 'No token provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = SecretaryInvitation.objects.get(token=token, is_used=False)
        except SecretaryInvitation.DoesNotExist:
            return Response({'valid': False, 'detail': 'Invalid or already used token.'}, status=status.HTTP_400_BAD_REQUEST)

        if invitation.is_expired():
            return Response({'valid': False, 'detail': 'Token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'valid': True,
            'email': invitation.email,
            'first_name': invitation.first_name,
            'last_name': invitation.last_name,
            'doctor_name': invitation.doctor.get_full_name(),
        })
