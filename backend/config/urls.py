from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
import apps.patients.views
import apps.core.views_internal

schema_view = get_schema_view(
   openapi.Info(
      title="Medera API",
      default_version='v1',
      description="API pour Medera - Medical SaaS",
      contact=openapi.Contact(email="contact@medera.io"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    # API Schema and Documentation (Spectacular)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Auth & Identity
    path('api/auth/', include('apps.authentication.urls')),
    
    # Core Medical Apps
    path('api/patients/', include('apps.patients.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/consultations/', include('apps.consultations.urls')),
    path('api/prescriptions/', include('apps.prescriptions.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
    path('api/audit/', include('apps.audit.urls')),
    
    # Patient Portal (GAP 4)
    path('api/patient-portal/', include('apps.patient_portal.urls')),

    # Admin Portal
    path('api/admin/', include('apps.admin_portal.urls')),

    # Billing, Messaging, Availability
    path('api/billing/', include('apps.billing.urls')),
    path('api/messaging/', include('apps.messaging.urls')),
    path('api/availability/', include('apps.availability.urls')),

    # Health Check
    path('api/health/', include('health_check.urls')),

    # Public Reviews
    path('api/reviews/doctor/<uuid:doctor_id>/', 
         apps.patients.views.DoctorReviewViewSet.as_view({'get': 'list'}), 
         name='doctor-reviews-list'),

    # Internal API (for Chatbot/Celery)
    path('api/internal/send-email/', 
         apps.core.views_internal.send_internal_email, 
         name='internal-send-email'),
    path('api/internal/chatbot-gateway/', 
         apps.core.views_internal.chatbot_proxy, 
         name='chatbot-gateway'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
