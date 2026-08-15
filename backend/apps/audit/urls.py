from django.urls import path
from .views import AuditLogListView, AuditLogStatsView, AuditLogExportCsvView

urlpatterns = [
    path('', AuditLogListView.as_view(), name='audit-log-list'),
    path('stats/', AuditLogStatsView.as_view(), name='audit-log-stats'),
    path('export/', AuditLogExportCsvView.as_view(), name='audit-log-export-csv'),
]
