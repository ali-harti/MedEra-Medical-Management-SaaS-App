from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from .admin_serializers import AdminUserSerializer

User = get_user_model()

class AdminUserListCreateView(generics.ListCreateAPIView):
    """List all users or create a new user (Staff/Doctor/Secretary/Patient)."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('created_at')
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']

class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update user details."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()

class AdminActivateUserView(APIView):
    """Activate a user account."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            user.is_active = True
            user.save()
            return Response(
                {"detail": "Compte activé.", "user_id": str(user.id)},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

class AdminDeactivateUserView(APIView):
    """Deactivate a user account. Cannot deactivate yourself."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            if request.user == user:
                return Response(
                    {"detail": "Vous ne pouvez pas désactiver votre propre compte."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.is_active = False
            user.save()
            return Response(
                {"detail": "Compte désactivé.", "user_id": str(user.id)},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

class AdminResetPasswordView(APIView):
    """Admin resets a user's password."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            new_password = request.data.get('new_password')
            
            # Simple validation check (logic also in serializer but implemented here as requested)
            if not new_password or len(new_password) < 8:
                return Response({"detail": "Mot de passe invalide."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(new_password)
            user.failed_login_attempts = 0
            user.locked_until = None
            user.save()
            return Response({"detail": "Mot de passe réinitialisé."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

class AdminChangeRoleView(APIView):
    """Change user role. Cannot change your own role."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            if request.user == user:
                return Response(
                    {"detail": "Vous ne pouvez pas changer votre propre rôle."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            new_role = request.data.get('role')
            
            if new_role not in User.Role.values:
                return Response({"detail": "Rôle invalide."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.role = new_role
            user.save()
            return Response(
                {"detail": "Rôle mis à jour.", "new_role": new_role},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"detail": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)
