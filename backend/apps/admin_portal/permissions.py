from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """Allows access only to admin users."""
    message = "Accès réservé aux administrateurs."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')