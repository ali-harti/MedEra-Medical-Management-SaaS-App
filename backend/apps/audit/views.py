from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
import csv
from .models import AuditLog
from .serializers import AuditLogSerializer

class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class AuditLogListView(generics.ListAPIView):
    """List all audit logs. Admin only."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AuditLogSerializer
    queryset = AuditLog.objects.select_related('user').all()
    filterset_fields = ['action', 'model_name', 'user']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
    pagination_class = AuditLogPagination


class AuditLogStatsView(APIView):
    """Get audit log statistics."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = None

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)

        today_count = AuditLog.objects.filter(timestamp__gte=today_start).count()
        week_count = AuditLog.objects.filter(timestamp__gte=week_start).count()
        failed_login_count = AuditLog.objects.filter(
            action='FAILED_LOGIN',
            timestamp__gte=week_start
        ).count()
        critical_count = 0  # Could be expanded based on logic

        return Response({
            'today_count': today_count,
            'week_count': week_count,
            'failed_login_count': failed_login_count,
            'critical_count': critical_count,
        })

class AuditLogExportCsvView(APIView):
    """Export audit logs as CSV."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        queryset = AuditLog.objects.select_related('user').all().order_by('-timestamp')
        
        action = request.query_params.get('action')
        model_name = request.query_params.get('model_name')
        
        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name=model_name)
            
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_ledger.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['ID', 'Timestamp', 'Action', 'Model', 'Changes', 'IP Address', 'User'])
        
        for log in queryset.iterator():
            user_str = f"{log.user.first_name} {log.user.last_name} ({log.user.email})" if log.user else "System"
            writer.writerow([
                log.id,
                log.timestamp.isoformat(),
                log.action,
                log.model_name,
                str(log.changes),
                log.ip_address,
                user_str
            ])
            
        return response
