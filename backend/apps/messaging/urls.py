from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ThreadViewSet, NotificationViewSet

router = DefaultRouter()
router.register('threads', ThreadViewSet)
router.register('notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
