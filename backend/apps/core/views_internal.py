import base64
import logging
from django.core.mail import EmailMessage
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
import json

logger = logging.getLogger(__name__)

from apps.patients.models import Patient, DoctorReview
from apps.authentication.models import User
from apps.appointments.models import Appointment
from apps.availability.views import DoctorPublicViewSet
from rest_framework.request import Request as RFRequest

@csrf_exempt
@require_POST
def send_internal_email(request):
    """
    Internal-only endpoint to send emails via MedEra infrastructure.
    Bypasses normal JWT auth but requires X-Internal-Secret header.
    """
    internal_secret = request.headers.get('X-Internal-Secret')
    if internal_secret != 'medera-internal-secret-token-dev':
        return JsonResponse({'error': 'Unauthorized'}, status=403)

    try:
        data = json.loads(request.body)
        to_email = data.get('to_email')
        subject = data.get('subject')
        html_body = data.get('html_body')
        attachment_base64 = data.get('attachment_base64')
        attachment_filename = data.get('attachment_filename', 'document.pdf')

        if not all([to_email, subject, html_body]):
            return JsonResponse({'error': 'Missing required fields'}, status=400)

        email = EmailMessage(
            subject=subject,
            body=html_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[to_email],
        )
        email.content_subtype = "html"

        if attachment_base64:
            try:
                content = base64.b64decode(attachment_base64)
                email.attach(attachment_filename, content, 'application/pdf')
            except Exception as e:
                logger.error(f"Failed to decode attachment: {e}")
                return JsonResponse({'error': f'Invalid attachment: {str(e)}'}, status=400)

        email.send()
        return JsonResponse({'status': 'ok'})

    except Exception as e:
        logger.error(f"Error sending internal email: {e}")
        return JsonResponse({'error': str(e)}, status=500)

def find_patient_by_phone(phone):
    from apps.patients.models import Patient
    if not phone:
        return None
    patient = Patient.objects.filter(phone=phone).first()
    if not patient and phone.startswith('+212'):
        local_phone = '0' + phone[4:]
        patient = Patient.objects.filter(phone=local_phone).first()
    if not patient and phone.startswith('+212'):
        spaced_phone = '+212 +0' + phone[4:]
        patient = Patient.objects.filter(phone=spaced_phone).first()
    if not patient and phone.startswith('+212'):
        spaced_phone2 = '+212 ' + phone[4:]
        patient = Patient.objects.filter(phone=spaced_phone2).first()
    return patient

@csrf_exempt
@require_POST
def chatbot_proxy(request):
    """
    Unified proxy for chatbot operations to bypass JWT auth via internal secret.
    """
    import os
    internal_secret = request.headers.get('X-Internal-Secret')
    expected_secret = os.getenv('INTERNAL_API_SECRET', 'medera-internal-secret-token-dev')
    if not internal_secret or internal_secret != expected_secret:
        return JsonResponse({'error': 'Unauthorized'}, status=403)

    try:
        data = json.loads(request.body)
        action = data.get('action')
        
        if action == 'find_patient':
            phone = data.get('phone')
            patient = find_patient_by_phone(phone)
            if patient:
                return JsonResponse({
                    'id': str(patient.id),
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'preferred_language': patient.preferred_language
                })
            return JsonResponse({'error': 'Not found'}, status=404)

        elif action == 'create_patient':
            p_data = data.get('patient_data')
            
            # Fetch a default MEDECIN to set as cabinet for the new patient
            from apps.authentication.models import User
            doctor = User.objects.filter(role='MEDECIN').first()
            if doctor:
                p_data['cabinet'] = doctor
                
            patient = Patient.objects.create(**p_data)
            
            # Automatically create the User account for the portal
            import secrets
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            
            email = patient.email or f"whatsapp_{patient.phone}@medera.ma"
            existing_user = User.objects.filter(email=email).first()
            if not existing_user:
                patient_user = User.objects.create_user(
                    email=email,
                    password=secrets.token_hex(16),
                    first_name=patient.first_name,
                    last_name=patient.last_name,
                    role=User.Role.PATIENT,
                    phone=patient.phone
                )
                patient.user = patient_user
                patient.save()
            else:
                patient.user = existing_user
                patient.save()

            uid = urlsafe_base64_encode(force_bytes(patient.user.pk))
            token = default_token_generator.make_token(patient.user)
            
            # Get frontend URL from env or fallback to lvh.me (resolves to 127.0.0.1, making it clickable)
            frontend_url = os.getenv('FRONTEND_URL', 'http://lvh.me')
            setup_link = f"{frontend_url}/reset-password/{uid}/{token}/"

            # Send the welcome email immediately upon creation
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                from django.template.loader import render_to_string
                from django.utils.html import strip_tags
                
                context = {
                    'first_name': patient.first_name,
                    'portal_url': setup_link
                }
                html_message = render_to_string('emails/patient_welcome.html', context)
                plain_message = strip_tags(html_message)
                
                send_mail(
                    subject="Bienvenue chez MedEra",
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[patient_user.email],
                    html_message=html_message,
                    fail_silently=True,
                )
            except Exception as email_err:
                logger.error(f"Failed to send welcome email on creation: {email_err}")

            return JsonResponse({
                'id': str(patient.id),
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'portal_access': True,
                'setup_link': setup_link
            })

        elif action == 'generate_password_reset_link':
            phone = data.get('phone')
            patient = find_patient_by_phone(phone)
            if not patient:
                return JsonResponse({'error': 'Patient not found'}, status=404)
                
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            import secrets
            
            if not patient.user:
                email = patient.email or f"whatsapp_{patient.phone}@medera.ma"
                existing_user = User.objects.filter(email=email).first()
                if not existing_user:
                    patient_user = User.objects.create_user(
                        email=email,
                        password=secrets.token_hex(16),
                        first_name=patient.first_name,
                        last_name=patient.last_name,
                        role=User.Role.PATIENT,
                        phone=patient.phone
                    )
                else:
                    patient_user = existing_user
                patient.user = patient_user
                patient.save()
            
            uid = urlsafe_base64_encode(force_bytes(patient.user.pk))
            token = default_token_generator.make_token(patient.user)
            
            frontend_url = os.getenv('FRONTEND_URL', 'http://lvh.me')
            setup_link = f"{frontend_url}/reset-password/{uid}/{token}/"
            login_link = f"{frontend_url}/login"
            
            has_logged_in = patient.user.last_login is not None
            
            return JsonResponse({
                'setup_link': setup_link, 
                'login_link': login_link,
                'has_logged_in': has_logged_in
            })

        elif action == 'get_doctors':
            specialty = data.get('specialty')
            city = data.get('city')
            max_fee = data.get('max_fee')
            
            qs = User.objects.filter(role=User.Role.MEDECIN, is_active=True)
            if specialty:
                qs = qs.filter(specialty__icontains=specialty)
            if city:
                qs = qs.filter(city__icontains=city)
            if max_fee:
                try:
                    qs = qs.filter(consultation_fee__lte=int(max_fee))
                except ValueError:
                    pass
            
            if not qs.exists():
                qs = User.objects.filter(role=User.Role.MEDECIN, is_active=True)[:3]
            
            results = []
            for d in qs:
                results.append({
                    'id': str(d.id),
                    'full_name': f"{d.first_name} {d.last_name}",
                    'specialty': d.specialty,
                    'city': d.city or "Maroc",
                    'consultation_fee': d.consultation_fee
                })
            return JsonResponse(results, safe=False)

        elif action == 'get_slots':
            doctor_id = data.get('doctor_id')
            days = data.get('days', 7)
            from datetime import datetime, timedelta
            from django.utils import timezone
            
            doctor = User.objects.get(id=doctor_id)
            slots = {}
            for i in range(days):
                date = (timezone.now() + timedelta(days=i)).date()
                date_str = date.isoformat()
                
                day_slots = []
                for hour in range(9, 17):
                    for minute in [0, 30]:
                        dt = timezone.make_aware(datetime.combine(date, datetime.min.time().replace(hour=hour, minute=minute)))
                        if not Appointment.objects.filter(doctor=doctor, start_datetime=dt).exists():
                            day_slots.append({
                                'time': dt.strftime('%H:%M'),
                                'datetime': dt.isoformat()
                            })
                if day_slots:
                    slots[date_str] = day_slots
            return JsonResponse(slots)

        elif action == 'create_appointment':
            app_data = data.get('appointment_data')
            app_data['patient'] = Patient.objects.get(id=app_data['patient'])
            app_data['doctor'] = User.objects.get(id=app_data['doctor'])
            
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            
            start_dt_str = app_data.get('start_datetime')
            if start_dt_str:
                dt = parse_datetime(start_dt_str)
                if dt:
                    if timezone.is_naive(dt):
                        dt = timezone.make_aware(dt)
                    app_data['start_datetime'] = dt
            
            # All chatbot appointments start as REQUESTED (pending secretary approval)
            app_data['status'] = 'REQUESTED'
            app_data['booked_via_whatsapp'] = True
                    
            app = Appointment.objects.create(**app_data)
            return JsonResponse({'id': str(app.id), 'status': 'requested'})


        elif action == 'store_language':
            phone = data.get('phone')
            language = data.get('language', 'fr')
            patient = find_patient_by_phone(phone)
            if patient:
                patient.preferred_language = language
                patient.save()
                return JsonResponse({'status': 'ok', 'language': patient.preferred_language})
            return JsonResponse({'error': 'Patient not found'}, status=404)

        elif action == 'get_upcoming_bookings':
            phone = data.get('phone')
            patient = find_patient_by_phone(phone)
            if not patient:
                return JsonResponse({'error': 'Patient not found'}, status=404)
            
            from django.utils import timezone
            appointments = Appointment.objects.filter(
                patient=patient,
                start_datetime__gte=timezone.now(),
                status__in=['PLANNED', 'CONFIRMED', 'IN_PROGRESS']
            ).order_by('start_datetime')
            
            results = []
            for app in appointments:
                results.append({
                    'id': str(app.id),
                    'doctor_name': f"{app.doctor.first_name} {app.doctor.last_name}",
                    'specialty': app.doctor.specialty,
                    'datetime': app.start_datetime.isoformat(),
                    'type': app.consultation_type,
                    'status': app.status
                })
            return JsonResponse(results, safe=False)

        elif action == 'cancel_booking':
            appointment_id = data.get('appointment_id')
            try:
                app = Appointment.objects.get(id=appointment_id)
                app.status = 'CANCELLED'
                app.save()
                return JsonResponse({'status': 'cancelled', 'id': str(app.id)})
            except Appointment.DoesNotExist:
                return JsonResponse({'error': 'Appointment not found'}, status=404)

        elif action == 'store_rating':
            phone = data.get('phone')
            doctor_id = data.get('doctor_id')
            rating = int(data.get('rating', 5))
            comment = data.get('comment', '')
            
            if rating < 1 or rating > 5:
                return JsonResponse({'error': 'Rating must be between 1 and 5'}, status=400)
            
            patient = find_patient_by_phone(phone)
            if not patient:
                return JsonResponse({'error': 'Patient not found'}, status=404)
                
            patient_user = patient.user
            if not patient_user:
                import secrets
                email = patient.email or f"whatsapp_{patient.phone}@medera.ma"
                existing_user = User.objects.filter(email=email).first()
                if existing_user:
                    patient_user = existing_user
                else:
                    patient_user = User.objects.create_user(
                        email=email,
                        password=secrets.token_hex(16),
                        first_name=patient.first_name,
                        last_name=patient.last_name,
                        role=User.Role.PATIENT,
                        phone=patient.phone
                    )
                patient.user = patient_user
                patient.save()
                
            try:
                doctor = User.objects.get(id=doctor_id, role=User.Role.MEDECIN)
            except User.DoesNotExist:
                return JsonResponse({'error': 'Doctor not found'}, status=404)
                
            review = DoctorReview.objects.create(
                doctor=doctor,
                patient=patient_user,
                rating=rating,
                comment=comment,
                is_verified=True
            )
            return JsonResponse({
                'status': 'created',
                'id': str(review.id),
                'doctor_name': f"{doctor.first_name} {doctor.last_name}",
                'rating': review.rating
            })

        elif action == 'get_patient_profile':
            phone = data.get('phone')
            patient = find_patient_by_phone(phone)
            if patient:
                return JsonResponse({
                    'id': str(patient.id),
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'birth_date': patient.birth_date.isoformat() if patient.birth_date else None,
                    'city': patient.city or "Maroc",
                    'email': patient.email,
                    'preferred_language': patient.preferred_language
                })
            return JsonResponse({'error': 'Not found'}, status=404)

        return JsonResponse({'error': 'Invalid action'}, status=400)

    except Exception as e:
        logger.error(f"Chatbot proxy error: {e}")
        return JsonResponse({'error': str(e)}, status=500)
