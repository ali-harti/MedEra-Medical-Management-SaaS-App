from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DoctorApplication

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Customizing the admin interface for the Medera User model.
    Using the BaseUserAdmin as a starting point.
    """
    model = User
    list_display = ['email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Security', {'fields': ('failed_login_attempts', 'locked_until')}),
        ('Important Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['email']


@admin.register(DoctorApplication)
class DoctorApplicationAdmin(admin.ModelAdmin):
    list_display = [
        'full_name', 'email', 'specialty', 'city', 
        'status', 'submitted_at', 'reviewed_by'
    ]
    list_filter = ['status', 'specialty', 'city']
    search_fields = ['first_name', 'last_name', 'email', 'license_number']
    readonly_fields = ['submitted_at', 'reviewed_at', 'reviewed_by', 'created_user']
    ordering = ['-submitted_at']
    
    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = 'Nom complet'
    
    actions = ['approve_selected']
    
    def approve_selected(self, request, queryset):
        approved = 0
        errors = []
        for application in queryset.filter(status='PENDING'):
            try:
                application.approve(admin_user=request.user)
                approved += 1
            except Exception as e:
                errors.append(str(e))
        
        if approved:
            self.message_user(
                request, f"{approved} candidature(s) approuvée(s)."
            )
        if errors:
            self.message_user(
                request, f"Erreurs: {'; '.join(errors)}", 
                level='error'
            )
    approve_selected.short_description = "Approuver les candidatures sélectionnées"
