from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """Allows access only to admin users."""
    message = "Accès réservé aux administrateurs."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'ADMIN')

class IsMedecin(permissions.BasePermission):
    """Allows access only to doctors."""
    message = "Accès réservé aux médecins."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'MEDECIN')

class IsSecretaire(permissions.BasePermission):
    """Allows access only to secretaries."""
    message = "Accès réservé aux secrétaires."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'SECRETAIRE')

class IsPatient(permissions.BasePermission):
    """Allows access only to patients."""
    message = "Accès réservé aux patients."
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'PATIENT')

class IsMedecinOrSecretaire(permissions.BasePermission):
    """Allow doctors or secretaries to access."""
    message = "Accès réservé aux médecins et secrétaires."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['MEDECIN', 'SECRETAIRE']
        )

class IsOwnerOrMedecin(permissions.BasePermission):
    """Allow access to owner or doctors."""
    message = "Accès réservé au propriétaire ou aux médecins."

    def has_object_permission(self, request, view, obj):
        # Allow doctors
        if request.user.role == 'MEDECIN':
            return True
        # Allow owner (if obj has created_by or user field)
        owner = getattr(obj, 'created_by', getattr(obj, 'user', None))
        return owner == request.user

class IsMedicalStaff(permissions.BasePermission):
    """Allows access to doctors and secretaries."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['MEDECIN', 'SECRETAIRE', 'ADMIN'])
