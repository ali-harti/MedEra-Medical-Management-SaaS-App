from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, OpenApiRequest, OpenApiResponse

from .models import User, DoctorApplication
from .serializers import (
    UserSerializer, UserRegisterSerializer, 
    CustomTokenObtainPairSerializer, ChangePasswordSerializer,
    DoctorApplicationSerializer, DoctorApplicationListSerializer,
    DoctorApplicationDetailSerializer, ApprovalSerializer,
    RejectionSerializer, PatientRegisterSerializer,
    SecretaryCreateSerializer
)
from .permissions import IsMedecin, IsAdminUser


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['auth'],
        summary='Login — obtain JWT tokens',
        description='Returns access and refresh JWT tokens. Access token expires in 60 minutes.',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'email': {'type': 'string', 'example': 'medecin@medera.com'},
                    'password': {'type': 'string', 'example': 'Medecin123!'},
                },
                'required': ['email', 'password'],
            }
        },
        responses={
            200: OpenApiResponse(description='Tokens returned successfully'),
            401: OpenApiResponse(description='Invalid credentials'),
            400: OpenApiResponse(description='Account locked after 5 failed attempts'),
        },
    )
    def post(self, request, *args, **kwargs):
        email = request.data.get("email")
        is_first_login = False
        user_obj = None

        if email:
            try:
                user_obj = User.objects.get(email=email)
                if user_obj.locked_until and user_obj.locked_until > timezone.now():
                    return Response(
                        {"error": "account_locked", "detail": "Account locked due to too many failed attempts. Try again in 15 minutes."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if user_obj.last_login is None and user_obj.role == User.Role.PATIENT:
                    is_first_login = True
            except User.DoesNotExist:
                pass

        try:
            response = super().post(request, *args, **kwargs)
            if response.status_code == 200 and user_obj:
                user_obj.failed_login_attempts = 0
                user_obj.locked_until = None
                user_obj.save(update_fields=['failed_login_attempts', 'locked_until'])

            return response
        except Exception as e:
            # Handle failed authentication (e.g. 401 Unauthorized)
            if user_obj:
                user_obj.failed_login_attempts += 1
                if user_obj.failed_login_attempts >= 5:
                    user_obj.locked_until = timezone.now() + timedelta(minutes=15)
                user_obj.save(update_fields=['failed_login_attempts', 'locked_until'])
                
                if user_obj.failed_login_attempts >= 5:
                    return Response(
                        {"error": "account_locked", "detail": "Account locked due to too many failed attempts. Try again in 15 minutes."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            # Rethrow the original simplejwt exception response or raise it
            raise e


class LogoutView(APIView):
    @extend_schema(
        tags=['auth'],
        summary='Logout / Revoke Token',
        description='Blacklists the provided refresh token to invalidate the session.',
        request={'application/json': {'type': 'object', 'properties': {'refresh': {'type': 'string'}}}},
        responses={
            200: OpenApiResponse(description='Successfully logged out'),
            400: OpenApiResponse(description='Invalid or missing refresh token'),
        }
    )
    def post(self, request):
        try:
            refresh = request.data["refresh"]
            token = RefreshToken(refresh)
            token.blacklist()
            return Response({"detail": "Successfully logged out."})
        except KeyError:
            return Response({"detail": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        if request.data.get('remove_avatar') == 'true':
            user = self.get_object()
            user.avatar = None
            user.save()
        return super().patch(request, *args, **kwargs)

class ChangePasswordView(generics.UpdateAPIView):
    """
    Endpoint for a user to change their own password.
    Requires old password verification.
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        serializer = self.get_serializer(data=request.data)

        if serializer.is_valid():
            # Check old password
            if not self.object.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            # set_password also hashes the password that the user will get
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            return Response({"detail": "Password updated successfully"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DoctorApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for administrative management of doctor applications.
    
    Permissions:
      - Create: Public (AllowAny)
      - Others: Admin Only (IsAdminUser)
    """
    queryset = DoctorApplication.objects.all()
    filterset_fields = ['status', 'specialty', 'city']
    ordering_fields = ['submitted_at', 'status']

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminUser()]

    def get_serializer_class(self):
        if self.action == 'list':
            return DoctorApplicationListSerializer
        if self.action == 'retrieve':
            return DoctorApplicationDetailSerializer
        if self.action == 'approve':
            return ApprovalSerializer
        if self.action == 'reject':
            return RejectionSerializer
        return DoctorApplicationSerializer

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        application = self.get_object()
        try:
            user = application.approve(admin_user=request.user)
            return Response({
                'detail': f'Application approved. Account created for {user.email}.',
                'user_id': str(user.id),
                'email': user.email,
            }, status=200)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        application = self.get_object()
        serializer = RejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            application.reject(
                admin_user=request.user,
                reason=serializer.validated_data.get('reason', '')
            )
            return Response({'detail': 'Application rejected.'}, status=200)
        except ValidationError as e:
            return Response({'detail': str(e)}, status=400)


class PatientRegisterView(generics.CreateAPIView):
    """Public endpoint for patient self-registration."""
    permission_classes = [AllowAny]
    serializer_class = PatientRegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'detail': 'Account created successfully. You can now log in.',
            'email': user.email,
            'role': user.role,
        }, status=status.HTTP_201_CREATED)


class SecretaryCreateView(generics.CreateAPIView):
    """Endpoint for doctors to create secretary accounts."""
    permission_classes = [IsMedecin]
    serializer_class = SecretaryCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'detail': f'Secretary account created for {user.email}. Credentials have been sent via email.',
            'user_id': str(user.id),
            'email': user.email,
        }, status=status.HTTP_201_CREATED)

class SecretaryListView(generics.ListAPIView):
    """Endpoint for doctors to list their secretary accounts."""
    permission_classes = [IsMedecin]
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(created_by=self.request.user, role='SECRETAIRE')


class EmployerView(APIView):
    """
    GET /api/auth/employer/ — Returns the doctor profile this secretary is linked to.
    Only usable by SECRETAIRE role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role != 'SECRETAIRE':
            return Response({'detail': 'Not a secretary account.'}, status=status.HTTP_403_FORBIDDEN)
        employer = getattr(user, 'employer', None)
        if not employer:
            return Response({'detail': 'No employer linked.'}, status=status.HTTP_404_NOT_FOUND)
        data = UserSerializer(employer, context={'request': request}).data
        return Response(data)


class SecretaryDeleteView(generics.DestroyAPIView):
    """Endpoint for doctors to delete a secretary account."""
    permission_classes = [IsMedecin]

    def get_queryset(self):
        return User.objects.filter(created_by=self.request.user, role='SECRETAIRE')


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for full user management by Admins.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-created_at')
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        
        if role:
            queryset = queryset.filter(role=role)
        if search:
            from django.db.models import Q, Value
            from django.db.models.functions import Concat
            queryset = queryset.annotate(
                search_full_name=Concat('first_name', Value(' '), 'last_name')
            ).filter(
                Q(search_full_name__icontains=search) | 
                Q(first_name__icontains=search) | 
                Q(last_name__icontains=search) | 
                Q(email__icontains=search)
            )
            
        return queryset

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'detail': 'Compte activé avec succès.'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        target_user = self.get_object()
        if target_user.id == request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas désactiver votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        target_user.is_active = False
        target_user.save()
        return Response({'detail': 'Compte désactivé avec succès.'})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'detail': 'Le mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({'detail': 'Mot de passe réinitialisé.'})

    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        user = self.get_object()
        if user.id == request.user.id:
            return Response(
                {'detail': 'Vous ne pouvez pas changer votre propre rôle.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        role = request.data.get('role')
        if role not in User.Role.values:
            return Response(
                {'detail': 'Rôle invalide.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.role = role
        user.save()
        return Response({'detail': f'Rôle mis à jour vers {role}.'})

    @action(detail=True, methods=['patch'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        # Create AuditLog entry
        from apps.audit.models import AuditLog
        AuditLog.objects.create(
            user=request.user,
            action='ACTIVATE' if user.is_active else 'DEACTIVATE',
            model_name='User',
            object_id=user.id,
            ip_address=request.META.get('REMOTE_ADDR'),
            changes={'is_active': user.is_active}
        )
        
        return Response({
            'detail': f"Compte {'activé' if user.is_active else 'désactivé'} avec succès.",
            'is_active': user.is_active
        })

    @action(detail=True, methods=['get'])
    def activity(self, request, pk=None):
        user = self.get_object()
        from apps.audit.models import AuditLog
        from apps.audit.serializers import AuditLogSerializer
        
        logs = AuditLog.objects.filter(user=user).order_by('-timestamp')[:20]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        user = self.get_object()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.save()
        
        return Response({'detail': 'Compte déverrouillé avec succès.'})

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uidb64 or not token or not new_password:
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'detail': 'Mot de passe réinitialisé avec succès.'})
        else:
            return Response({'error': 'Lien invalide ou expiré.'}, status=status.HTTP_400_BAD_REQUEST)
