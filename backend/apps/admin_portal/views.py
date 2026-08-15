"""
API Views for Admin Portal.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from django.db.models.functions import TruncDate

from apps.authentication.models import User, DoctorApplication
from apps.authentication.permissions import IsAdminUser
from apps.appointments.models import Appointment
from apps.patients.models import Patient
from apps.consultations.models import Consultation
from apps.audit.models import AuditLog
from .models import SystemSettings, CabinetConfig, PermissionMatrix, Backup
from .serializers import (
    UserSerializer, UserCreateSerializer, AdminStatsSerializer,
    ActivityLogSerializer, PermissionMatrixSerializer,
    CabinetConfigSerializer, SystemSettingsSerializer, BackupSerializer,
    DoctorApplicationSerializer
)


class AdminStatsAPIView(APIView):
    """Get admin dashboard statistics."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = None  # We'll return raw data for flexibility

    def get(self, request):
        total_users = User.objects.count()
        active_doctors = User.objects.filter(role='MEDECIN', is_active=True).count()
        active_secretaries = User.objects.filter(role='SECRETAIRE', is_active=True).count()
        active_patients = User.objects.filter(role='PATIENT', is_active=True).count()
        
        # Pending applications (from DoctorApplication table)
        pending_applications = DoctorApplication.objects.filter(status='PENDING').count()

        # Role breakdown for the donut chart
        role_breakdown = {
            'ADMIN': User.objects.filter(role='ADMIN').count(),
            'MEDECIN': User.objects.filter(role='MEDECIN').count(),
            'SECRETAIRE': User.objects.filter(role='SECRETAIRE').count(),
            'PATIENT': User.objects.filter(role='PATIENT').count(),
        }

        # System health
        from django.core.cache import cache
        from django.db import connection
        try:
            cache.set('ping', 'pong', timeout=1)
            redis_ok = cache.get('ping') == 'pong'
        except Exception:
            redis_ok = False
            
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            db_ok = True
        except Exception:
            db_ok = False
            
        system_health = {
            'status': 'HEALTHY' if redis_ok and db_ok else 'DEGRADED',
            'services': {
                'api': True,
                'redis': redis_ok,
                'db': db_ok,
            }
        }

        # Total Revenue
        from apps.billing.models import Billing
        from django.db.models import Sum
        revenue_agg = Billing.objects.filter(status='PAID').aggregate(total=Sum('amount_paid'))
        total_revenue = revenue_agg['total'] or 0

        # Recent activity (last 10)
        recent_activity = AuditLog.objects.select_related('user')[:10]
        activity_data = [
            {
                'id': log.id,
                'actor_email': log.user.email if log.user else 'system',
                'action': log.action,
                'model_name': log.model_name,
                'timestamp': log.timestamp.isoformat(),
            }
            for log in recent_activity
        ]

        # Stats for the last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        new_users_week = User.objects.filter(created_at__gte=seven_days_ago).count()
        new_apps_week = DoctorApplication.objects.filter(submitted_at__gte=seven_days_ago).count()

        # Daily activity for the last 7 days
        daily_stats = []
        for i in range(7):
            date = (timezone.now() - timedelta(days=i)).date()
            users_count = User.objects.filter(created_at__date=date).count()
            apps_count = DoctorApplication.objects.filter(submitted_at__date=date).count()
            appointments_count = Appointment.objects.filter(created_at__date=date).count()
            consultations_count = Consultation.objects.filter(created_at__date=date).count()
            daily_stats.append({
                'name': date.strftime('%a'),
                'users': users_count,
                'applications': apps_count,
                'appointments': appointments_count,
                'consultations': consultations_count
            })
        daily_stats.reverse()

        data = {
            'total_users': total_users,
            'new_users_week': new_users_week,
            'active_doctors': active_doctors,
            'active_secretaries': active_secretaries,
            'active_patients': active_patients,
            'pending_applications': pending_applications,
            'new_apps_week': new_apps_week,
            'role_breakdown': role_breakdown,
            'system_health': system_health,
            'total_revenue': total_revenue,
            'recent_activity': activity_data,
            'daily_stats': daily_stats,
        }

        return Response(data)


from rest_framework import generics
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class AdminUserListAPIView(generics.ListCreateAPIView):
    """
    Standardized list and create for users with advanced filtering and search.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = User.objects.all().order_by('-created_at')
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['created_at', 'last_name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def list(self, request, *args, **kwargs):
        # Apply standard filters first
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply custom filters for status mapping and dates
        status_filter = request.query_params.get('status')
        if status_filter == 'ACTIVE':
            queryset = queryset.filter(is_active=True)
        elif status_filter == 'INACTIVE':
            queryset = queryset.filter(is_active=False)

        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        if from_date:
            queryset = queryset.filter(created_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__date__lte=to_date)

        # DRF Pagination logic
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailAPIView(APIView):
    """Get, update, delete a single user."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)

        return Response(UserSerializer(user).data)

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)

        serializer = UserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserStatusAPIView(APIView):
    """Toggle user status."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=404)

        new_status = request.data.get('status', 'ACTIVE')
        user.is_active = (new_status == 'ACTIVE')
        user.save()

        AuditLog.log(
            user=request.user,
            action='UPDATE',
            model_name='User',
            object_id=str(user.id),
            changes={'is_active': user.is_active},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'status': 'ok'})


class AdminLogsAPIView(APIView):
    """Get activity logs."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = ActivityLogSerializer

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 20))
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')
        actor = request.query_params.get('actor')
        action_type = request.query_params.get('action')
        status_filter = request.query_params.get('status')

        queryset = AuditLog.objects.select_related('user').all()

        if from_date:
            queryset = queryset.filter(timestamp__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(timestamp__date__lte=to_date)
        if actor:
            queryset = queryset.filter(user__email__icontains=actor)
        if action_type:
            queryset = queryset.filter(action=action_type)

        total = queryset.count()
        offset = (page - 1) * limit
        logs = queryset[offset:offset + limit]

        return Response({
            'results': [
                {
                    'id': log.id,
                    'actorId': str(log.user_id) if log.user else '',
                    'actorName': f"{log.user.first_name} {log.user.last_name}" if log.user else 'Système',
                    'actorRole': log.user.role if log.user else 'SYSTEM',
                    'action': log.action,
                    'resource': log.model_name,
                    'resourceId': log.object_id,
                    'ipAddress': log.ip_address or '',
                    'status': 'SUCCESS',
                    'payload': log.changes,
                    'createdAt': log.timestamp.isoformat(),
                }
                for log in logs
            ],
            'count': total,
            'page': page,
            'limit': limit,
        })


class AdminPermissionsAPIView(APIView):
    """Get and update permission matrix."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = PermissionMatrixSerializer

    def get(self, request):
        matrices = PermissionMatrix.objects.all()
        return Response(PermissionMatrixSerializer(matrices, many=True).data)

    def put(self, request):
        for role_data in request.data:
            role = role_data.get('role')
            permissions = role_data.get('permissions', {})

            matrix, _ = PermissionMatrix.objects.update_or_create(
                role=role,
                defaults={'permissions': permissions}
            )

        return Response({'status': 'ok'})


class AdminSettingsAPIView(APIView):
    """Get and update system settings."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = CabinetConfigSerializer

    def get(self, request):
        cabinet, _ = CabinetConfig.objects.get_or_create(
            defaults={
                'name': 'MedEra Clinique',
                'working_hours': {},
                'default_duration': 30,
                'max_advance_days': 30,
                'buffer_minutes': 15,
                'email_notifications': True,
                'sms_notifications': False,
                'reminder_timings': [24, 2],
                'session_timeout': 60,
                'min_password_length': 8,
                'require_special_chars': True,
                'two_factor_enabled': False,
                'ip_whitelist': [],
                'backup_schedule': 'WEEKLY',
                'backup_time': '02:00',
                'rooms': [],
                'specialties': [],
                'insurances': [],
                'holidays': [],
            }
        )
        return Response(CabinetConfigSerializer(cabinet).data)

    def put(self, request):
        cabinet, _ = CabinetConfig.objects.get_or_create(
            defaults={
                'name': 'MedEra Clinique',
            }
        )
        serializer = CabinetConfigSerializer(cabinet, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminReportsAPIView(APIView):
    """Get reports data."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = None

    def get(self, request):
        report_type = request.query_params.get('type', 'appointments')
        from_date = request.query_params.get('from')
        to_date = request.query_params.get('to')

        if report_type == 'appointments':
            data = list(
                Appointment.objects.values('doctor__last_name', 'doctor__first_name')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            )
        elif report_type == 'patients':
            data = list(
                Patient.objects.filter(created_at__date__gte=from_date, created_at__date__lte=to_date)
                .annotate(date=TruncDate('created_at'))
                .values('date')
                .annotate(count=Count('id'))
                .order_by('date')
            )
        elif report_type == 'consultations':
            data = list(
                Consultation.objects.filter(created_at__date__gte=from_date, created_at__date__lte=to_date)
                .values('status')
                .annotate(count=Count('id'))
                .order_by('status')
            )
        else:
            data = []

        return Response({
            'type': report_type,
            'data': data,
            'from': from_date,
            'to': to_date,
        })


class AdminBackupAPIView(APIView):
    """Trigger manual backup."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BackupSerializer

    def post(self, request):
        backup = Backup.objects.create(status='RUNNING')
        # In production, this would trigger actual backup process
        backup.status = 'COMPLETED'
        backup.save()
        return Response({'id': backup.id, 'status': 'completed'})


class AdminBackupsAPIView(APIView):
    """List backup history."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = BackupSerializer

    def get(self, request):
        backups = Backup.objects.all()[:20]
        return Response(BackupSerializer(backups, many=True).data)


class AdminApplicationListAPIView(generics.ListAPIView):
    """List doctor applications with filtering."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = DoctorApplicationSerializer
    queryset = DoctorApplication.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email', 'specialty']
    ordering_fields = ['submitted_at']


class AdminApplicationActionAPIView(APIView):
    """Approve or reject a doctor application."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk, action):
        try:
            application = DoctorApplication.objects.get(pk=pk)
        except DoctorApplication.DoesNotExist:
            return Response({'error': 'Candidature non trouvée'}, status=404)

        if action == 'approve':
            try:
                user = application.approve(admin_user=request.user)
                return Response({'status': 'approved', 'userId': str(user.id)})
            except Exception as e:
                return Response({'error': str(e)}, status=400)
        
        elif action == 'reject':
            reason = request.data.get('reason', 'Critères non remplis.')
            try:
                application.reject(admin_user=request.user, reason=reason)
                return Response({'status': 'rejected'})
            except Exception as e:
                return Response({'error': str(e)}, status=400)

        return Response({'error': 'Action invalide'}, status=400)


class AdminCabinetAPIView(APIView):
    """Get and update cabinet configuration."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = CabinetConfigSerializer

    def get(self, request):
        cabinet, _ = CabinetConfig.objects.get_or_create(
            defaults={
                'name': 'MedEra Clinique',
                'rooms': [
                    {'id': '1', 'name': 'Salle 1', 'capacity': 1, 'equipment': ['stéthoscope', 'ECG']},
                    {'id': '2', 'name': 'Salle 2', 'capacity': 1, 'equipment': ['stéthoscope']},
                    {'id': '3', 'name': 'Salle d\'attente', 'capacity': 5, 'equipment': []},
                ],
                'specialties': ['Cardiologie', 'Généraliste', 'Pédiatrie', 'Dermatologie', 'Neurologie'],
                'insurances': ['CNOPS', 'CNOUM', 'AXA'],
                'holidays': [],
            }
        )
        return Response(CabinetConfigSerializer(cabinet).data)

    def put(self, request):
        cabinet, _ = CabinetConfig.objects.get_or_create(
            defaults={'name': 'MedEra Clinique'}
        )
        serializer = CabinetConfigSerializer(cabinet, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class AdminAppointmentListAPIView(generics.ListAPIView):
    """List appointments globally with restricted data (no clinical details)."""
    from .serializers import AdminAppointmentSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminAppointmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['start_datetime']
    ordering = ['-start_datetime']

    def get_queryset(self):
        from django.db.models import Q, Value
        from django.db.models.functions import Concat
        
        queryset = Appointment.objects.select_related('patient__user', 'doctor').all()
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.annotate(
                search_patient_name=Concat('patient__first_name', Value(' '), 'patient__last_name'),
                search_doctor_name=Concat('doctor__first_name', Value(' '), 'doctor__last_name')
            ).filter(
                Q(search_patient_name__icontains=search) | 
                Q(search_doctor_name__icontains=search) |
                Q(patient__first_name__icontains=search) | 
                Q(patient__last_name__icontains=search) | 
                Q(doctor__first_name__icontains=search) | 
                Q(doctor__last_name__icontains=search)
            )
            
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        if request.query_params.get('export') == 'true':
            import csv
            from django.http import HttpResponse
            
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="appointments_export.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['ID', 'Patient Name', 'Patient Phone', 'Doctor Name', 'Type', 'Start Date', 'End Date', 'Status'])
            
            for apt in queryset:
                patient_name = f"{apt.patient.first_name} {apt.patient.last_name}".strip() if apt.patient else 'Unknown'
                patient_phone = apt.patient.phone if (apt.patient and apt.patient.phone) else ''
                doctor_name = apt.doctor.get_full_name() if apt.doctor else ''
                writer.writerow([
                    apt.id, patient_name, patient_phone, doctor_name, 
                    apt.appointment_type, apt.start_datetime.isoformat() if apt.start_datetime else '',
                    apt.end_datetime.isoformat() if apt.end_datetime else '', apt.status
                ])
                
            return response

        return super().list(request, *args, **kwargs)

import csv
from django.http import HttpResponse

class AdminExportCSVAPIView(APIView):
    """Export historical audit data as CSV."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, *args, **kwargs):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="medera_historical_data.csv"'

        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'Action', 'Model', 'Object ID', 'User', 'IP Address', 'Details'])

        logs = AuditLog.objects.select_related('user').all().order_by('-timestamp')
        for log in logs:
            user_str = f"{log.user.email}" if log.user else "System"
            writer.writerow([
                log.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                log.action,
                log.model_name,
                log.object_id,
                user_str,
                log.ip_address,
                log.changes
            ])

        return response