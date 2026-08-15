from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvailabilityViewSet, DoctorPublicViewSet

router = DefaultRouter()
router.register('settings', AvailabilityViewSet, basename='availability-settings')
router.register('directory', DoctorPublicViewSet, basename='doctor-directory')

urlpatterns = [
    path('', include(router.urls)),
]
