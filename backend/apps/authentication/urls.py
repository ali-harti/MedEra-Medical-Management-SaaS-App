from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from .views import (
    RegisterView, CustomTokenObtainPairView, LogoutView, MeView, ChangePasswordView,
    DoctorApplicationViewSet, PatientRegisterView, SecretaryCreateView, SecretaryListView,
    SecretaryDeleteView, AdminUserViewSet, EmployerView, PasswordResetConfirmView
)
from .onboarding_views import (
    DoctorRegisterView, InviteSecretaryView, SecretarySignupView, ValidateInviteTokenView
)

from .admin_views import (
    AdminUserListCreateView, AdminUserDetailView, AdminActivateUserView,
    AdminDeactivateUserView, AdminResetPasswordView, AdminChangeRoleView
)

app_name = 'authentication'

router = DefaultRouter()
router.register(
    'applications', 
    DoctorApplicationViewSet, 
    basename='doctor-application'
)

urlpatterns = [
    # Auth endpoints
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("me/", MeView.as_view(), name="user_profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("reset-password/confirm/", PasswordResetConfirmView.as_view(), name="reset_password_confirm"),
    
    # New registration endpoints
    path('register/patient/', 
         PatientRegisterView.as_view(), 
         name='patient_register'),
  
    path('medecin/create-secretaire/', 
         SecretaryCreateView.as_view(), 
         name='secretary_create'),
    path('medecin/secretaries/', 
         SecretaryListView.as_view(), 
         name='secretary_list'),
    path('medecin/secretaries/<uuid:pk>/', 
         SecretaryDeleteView.as_view(), 
         name='secretary_delete'),
    path('employer/', EmployerView.as_view(), name='employer_profile'),

    # Onboarding flows
    path('doctor/register/', DoctorRegisterView.as_view(), name='doctor_register'),
    path('invite-secretary/', InviteSecretaryView.as_view(), name='invite_secretary'),
    path('secretary-signup/', SecretarySignupView.as_view(), name='secretary_signup'),
    path('validate-invite/', ValidateInviteTokenView.as_view(), name='validate_invite'),

    # User applications
    path('', include(router.urls)),

    # Admin User Management
    path('admin/users/', AdminUserViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-user-list'),
    path('admin/users/<uuid:pk>/', AdminUserViewSet.as_view({
        'get': 'retrieve', 
        'patch': 'partial_update', 
        'delete': 'destroy'
    }), name='admin-user-detail'),
    path('admin/users/<uuid:pk>/toggle-active/', AdminUserViewSet.as_view({'patch': 'toggle_active'}), name='admin-user-toggle-active'),
    path('admin/users/<uuid:pk>/activate/', AdminUserViewSet.as_view({'post': 'activate'}), name='admin-user-activate'),
    path('admin/users/<uuid:pk>/deactivate/', AdminUserViewSet.as_view({'post': 'deactivate'}), name='admin-user-deactivate'),
    path('admin/users/<uuid:pk>/reset-password/', AdminUserViewSet.as_view({'post': 'reset_password'}), name='admin-reset-password'),
    path('admin/users/<uuid:pk>/role/', AdminUserViewSet.as_view({'post': 'change_role'}), name='admin-change-role'),
    path('admin/users/<uuid:pk>/activity/', AdminUserViewSet.as_view({'get': 'activity'}), name='admin-user-activity'),
    path('admin/users/<uuid:pk>/unlock/', AdminUserViewSet.as_view({'post': 'unlock'}), name='admin-user-unlock'),
]
