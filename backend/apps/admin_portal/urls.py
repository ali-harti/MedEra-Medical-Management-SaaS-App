from django.urls import path
from . import views

app_name = 'admin_portal'

urlpatterns = [
    # Dashboard stats
    path('stats/', views.AdminStatsAPIView.as_view(), name='admin-stats'),

    # User management
    path('users/', views.AdminUserListAPIView.as_view(), name='admin-users'),
    path('users/<uuid:pk>/', views.AdminUserDetailAPIView.as_view(), name='admin-user-detail'),
    path('users/<uuid:pk>/status/', views.AdminUserStatusAPIView.as_view(), name='admin-user-status'),

    # Activity logs
    path('logs/', views.AdminLogsAPIView.as_view(), name='admin-logs'),

    # Permissions
    path('permissions/', views.AdminPermissionsAPIView.as_view(), name='admin-permissions'),

    # Settings
    path('settings/', views.AdminSettingsAPIView.as_view(), name='admin-settings'),

    # Reports
    path('reports/', views.AdminReportsAPIView.as_view(), name='admin-reports'),
    path('export/csv/', views.AdminExportCSVAPIView.as_view(), name='admin-export-csv'),

    # Appointments
    path('appointments/', views.AdminAppointmentListAPIView.as_view(), name='admin-appointments'),

    # Doctor Applications
    path('applications/', views.AdminApplicationListAPIView.as_view(), name='admin-applications'),
    path('applications/<int:pk>/<str:action>/', views.AdminApplicationActionAPIView.as_view(), name='admin-application-action'),

    # Backup
    path('backup/', views.AdminBackupAPIView.as_view(), name='admin-backup'),
    path('backups/', views.AdminBackupsAPIView.as_view(), name='admin-backups'),

    # Cabinet
    path('cabinet/', views.AdminCabinetAPIView.as_view(), name='admin-cabinet'),
]