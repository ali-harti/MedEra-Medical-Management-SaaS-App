from django.urls import path
from .views import (
    DashboardKPIView,
    DashboardWeeklyTrendView,
    DashboardTopDiagnosesView,
    DashboardExportPDFView,
    AdminStatsView,
    DashboardAgendaView,
)

urlpatterns = [
    path('kpis/', DashboardKPIView.as_view(), name='dashboard-kpis'),
    path('trend/', DashboardWeeklyTrendView.as_view(), name='dashboard-weekly-trend'),
    path('top-diagnoses/', DashboardTopDiagnosesView.as_view(), name='dashboard-top-diagnoses'),
    path('agenda/', DashboardAgendaView.as_view(), name='dashboard-agenda'),
    path('export/pdf/', DashboardExportPDFView.as_view(), name='dashboard-export-pdf'),
    path('admin-stats/', AdminStatsView.as_view(), name='dashboard-admin-stats'),
]
