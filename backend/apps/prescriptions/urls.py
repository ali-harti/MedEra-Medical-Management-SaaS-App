from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrescriptionViewSet

router = DefaultRouter()
router.register("", PrescriptionViewSet, basename="prescription")

urlpatterns = [path("", include(router.urls))]
