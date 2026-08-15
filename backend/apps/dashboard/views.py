from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count
from apps.authentication.permissions import IsMedecin, IsAdminUser, IsMedicalStaff
from apps.appointments.models import Appointment
from apps.patients.models import Patient
from apps.consultations.models import Consultation
from django.contrib.auth import get_user_model

User = get_user_model()

class DashboardKPIView(APIView):
    """
    Retourne les indicateurs de performance clés pour le médecin connecté ou le médecin employeur de la secrétaire.
    """
    permission_classes = [IsAuthenticated, IsMedicalStaff]
    serializer_class = None

    def get(self, request):
        user = request.user
        doctor = user.employer if user.role == 'SECRETAIRE' else user
        if not doctor:
            return Response({'error': 'No doctor associated'}, status=400)

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today_start.replace(day=1)
        
        # Today's appointments
        today_appointments = Appointment.objects.filter(
            doctor=doctor, 
            start_datetime__gte=today_start,
            start_datetime__lt=today_start + timedelta(days=1)
        ).exclude(status='CANCELLED').count()
        
        # Next appointment time
        next_appointment = Appointment.objects.filter(
            doctor=doctor,
            start_datetime__gte=now,
            status__in=['PLANNED', 'CONFIRMED']
        ).order_by('start_datetime').first()
        next_appointment_time = next_appointment.start_datetime.strftime('%H:%M') if next_appointment else None
        
        # Active Patients (Total)
        from django.db.models import Q
        total_patients = Patient.objects.filter(
            Q(created_by=doctor) | 
            Q(appointments__doctor=doctor) | 
            Q(consultations__doctor=doctor),
            is_archived=False
        ).distinct().count()
        
        # New patients this month
        new_patients_this_month = Patient.objects.filter(
            Q(created_by=doctor) | 
            Q(appointments__doctor=doctor) | 
            Q(consultations__doctor=doctor),
            created_at__gte=month_start,
            is_archived=False
        ).distinct().count()
        
        # Pending Consultations (appointments completed but not finalized)
        pending_consultations = Consultation.objects.filter(
            doctor=doctor,
            status__in=['DRAFT', 'IN_PROGRESS']
        ).count()
        
        draft_count = Consultation.objects.filter(doctor=doctor, status='DRAFT').count()
        in_progress_count = Consultation.objects.filter(doctor=doctor, status='IN_PROGRESS').count()
        
        # Unpaid Invoices
        from apps.billing.models import Billing
        unpaid_invoices = Billing.objects.filter(consultation__doctor=doctor, status='PENDING').count()
        unpaid_amount_mad = sum(b.amount_total for b in Billing.objects.filter(consultation__doctor=doctor, status='PENDING')) or 0.0
        
        # Performance Stats
        monthly_consultations = Consultation.objects.filter(
            doctor=doctor,
            created_at__gte=month_start
        ).count()
        
        total_prescriptions = Consultation.objects.filter(doctor=doctor).aggregate(
            total=Count('prescriptions')
        )['total'] or 0
        
        from django.db.models import Avg
        avg_visit = Appointment.objects.filter(doctor=doctor, status='DONE').aggregate(Avg('duration_minutes'))['duration_minutes__avg']
        avg_visit_duration = int(avg_visit) if avg_visit else 30
        
        # Taux de présence
        done_appts = Appointment.objects.filter(doctor=doctor, status='DONE').count()
        cancelled_appts = Appointment.objects.filter(doctor=doctor, status='CANCELLED').count()
        attendance_rate = 0.0
        if (done_appts + cancelled_appts) > 0:
            attendance_rate = round((done_appts / (done_appts + cancelled_appts)) * 100, 1)

        return Response({
            'appointments_today': today_appointments,
            'next_appointment_time': next_appointment_time,
            'active_patients': total_patients,
            'new_patients_this_month': new_patients_this_month,
            'pending_consultations': pending_consultations,
            'draft_count': draft_count,
            'in_progress_count': in_progress_count,
            'unpaid_invoices': unpaid_invoices,
            'unpaid_amount_mad': unpaid_amount_mad,
            'monthly_consultations': monthly_consultations,
            'total_prescriptions': total_prescriptions,
            'avg_visit_duration': avg_visit_duration,
            'attendance_rate': attendance_rate,
        })

class DashboardWeeklyTrendView(APIView):
    """Retourne le volume de consultations filtré par période."""
    permission_classes = [IsAuthenticated, IsMedicalStaff]
    serializer_class = None

    def get(self, request):
        user = request.user
        doctor = user.employer if user.role == 'SECRETAIRE' else user
        if not doctor:
            return Response({'error': 'No doctor associated'}, status=400)
            
        now = timezone.now()
        period = request.query_params.get('period', '7d')
        
        data = []
        days = 7
        if period == '30d': days = 30
        elif period == '90d': days = 90
        elif period == 'last_month': days = 30
        elif period == 'last_year': days = 365
        elif period == 'all_time': days = 365
        
        for i in range(days-1, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            count = Consultation.objects.filter(
                doctor=doctor, created_at__gte=day_start, created_at__lt=day_end
            ).count()
            data.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'count': count
            })
            
        return Response(data)

class DashboardAgendaView(APIView):
    """Retourne l'agenda d'aujourd'hui pour le médecin connecté."""
    permission_classes = [IsAuthenticated, IsMedicalStaff]
    serializer_class = None

    def get(self, request):
        user = request.user
        doctor = user.employer if user.role == 'SECRETAIRE' else user
        if not doctor:
            return Response({'error': 'No doctor associated'}, status=400)
            
        today = timezone.now().date()
        
        appts = Appointment.objects.filter(
            doctor=doctor,
            start_datetime__date=today,
            status__in=['PLANNED', 'CONFIRMED', 'PENDING']
        ).select_related('patient').distinct().order_by('start_datetime')
        
        res = []
        for a in appts:
            res.append({
                'id': str(a.id),
                'start_time': a.start_datetime.strftime('%H:%M'),
                'room': a.room if a.room else 'N/A',
                'patient_name': f"{a.patient.first_name} {a.patient.last_name}" if hasattr(a, 'patient') and a.patient else 'Inconnu',
                'patient_id': str(a.patient.id) if hasattr(a, 'patient') and a.patient else None,
                'motive': a.motive or 'Consultation',
                'status': a.status,
                'appointment_type': a.consultation_type,
                'has_consultation': hasattr(a, 'consultation') and a.consultation is not None
            })
        return Response(res)


class DashboardTopDiagnosesView(APIView):
    """Retourne les diagnostics les plus fréquents (données anonymisées)."""
    permission_classes = [IsAuthenticated, IsMedecin]
    serializer_class = None

    def get(self, request):
        doctor = request.user
        stats = Consultation.objects.filter(
            doctor=doctor,
            status='FINALIZED',
            diagnosis__isnull=False
        ).exclude(diagnosis='').values('diagnosis').annotate(count=Count('id')).order_by('-count')[:5]
        
        return Response({'data': list(stats)})

class DashboardExportPDFView(APIView):
    """
    UC-MEDECIN-14: Export dashboard as PDF.
    Deferred to post-MVP — returns 501.
    """
    permission_classes = [IsAuthenticated, IsMedecin]
    serializer_class = None

    def get(self, request):
        return Response(
            {
                'detail': 'Export PDF tableau de bord disponible en v1.1.',
                'status': 'not_implemented'
            },
            status=501
        )


class AdminStatsView(APIView):
    """Return admin dashboard statistics."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = None

    def get(self, request):
        total_users = User.objects.count()
        
        # Role Breakdown
        role_breakdown = {
            'ADMIN': User.objects.filter(role='ADMIN').count(),
            'MEDECIN': User.objects.filter(role='MEDECIN').count(),
            'SECRETAIRE': User.objects.filter(role='SECRETAIRE').count(),
            'PATIENT': User.objects.filter(role='PATIENT').count(),
        }

        now = timezone.now()
        week_start = now - timedelta(days=7)
        new_users_week = User.objects.filter(created_at__gte=week_start).count()
        
        # We don't have Application model yet, mock pending
        pending_applications = 0
        new_apps_week = 0
        
        # We don't have revenue calculated, mock total revenue
        total_revenue = 0

        return Response({
            'total_users': total_users,
            'role_breakdown': role_breakdown,
            'new_users_week': new_users_week,
            'pending_applications': pending_applications,
            'new_apps_week': new_apps_week,
            'total_revenue': total_revenue,
            'system_health': 99.8,
        })
