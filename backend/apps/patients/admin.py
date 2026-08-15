from django.contrib import admin
from .models import Patient, DoctorReview

@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('internal_id', 'first_name', 'last_name', 'birth_date', 'gender', 'is_archived')
    search_fields = ('internal_id', 'first_name', 'last_name', 'email')
    list_filter = ('gender', 'is_archived', 'blood_type', 'insurance')
    ordering = ('-created_at',)

@admin.register(DoctorReview)
class DoctorReviewAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'patient', 'rating', 'is_verified', 'created_at')
    list_filter = ('rating', 'is_verified', 'created_at')
    search_fields = ('doctor__last_name', 'patient__last_name', 'comment')
