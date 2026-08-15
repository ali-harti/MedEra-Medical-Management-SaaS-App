"""
Serializers for Admin Portal API.
"""
from rest_framework import serializers
from apps.authentication.models import User, DoctorApplication
from .models import SystemSettings, CabinetConfig, PermissionMatrix, Backup


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user management."""
    firstName = serializers.CharField(source='first_name')
    lastName = serializers.CharField(source='last_name')
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastLogin = serializers.DateTimeField(source='last_login', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'firstName', 'lastName', 'role',
            'is_active', 'phone', 'createdAt', 'lastLogin', 'failed_login_attempts', 'locked_until'
        ]
        read_only_fields = ['id', 'createdAt']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'role', 'phone']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AdminStatsSerializer(serializers.Serializer):
    """Serializer for admin dashboard stats."""
    totalUsers = serializers.IntegerField()
    activeDoctors = serializers.IntegerField()
    activeSecretaries = serializers.IntegerField()
    pendingApprovals = serializers.IntegerField()
    systemHealth = serializers.DictField()
    recentActivity = serializers.ListField()
    userGrowth = serializers.ListField()
    appointmentStats = serializers.ListField()


class ActivityLogSerializer(serializers.Serializer):
    """Serializer for audit log entries."""
    id = serializers.IntegerField()
    actorId = serializers.CharField()
    actorName = serializers.CharField()
    actorRole = serializers.CharField()
    action = serializers.CharField()
    resource = serializers.CharField()
    resourceId = serializers.CharField()
    ipAddress = serializers.CharField()
    status = serializers.CharField()
    payload = serializers.DictField()
    createdAt = serializers.DateTimeField()


class PermissionMatrixSerializer(serializers.ModelSerializer):
    """Serializer for permission matrix."""
    class Meta:
        model = PermissionMatrix
        fields = ['role', 'permissions', 'updated_at']


class CabinetConfigSerializer(serializers.ModelSerializer):
    """Serializer for cabinet configuration."""
    class Meta:
        model = CabinetConfig
        fields = '__all__'


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system settings."""
    class Meta:
        model = SystemSettings
        fields = ['key', 'value', 'updated_at']


class BackupSerializer(serializers.ModelSerializer):
    """Serializer for backup history."""
    class Meta:
        model = Backup
        fields = ['id', 'created_at', 'status', 'file_path', 'file_size', 'error_message']


class DoctorApplicationSerializer(serializers.ModelSerializer):
    """Serializer for doctor registration applications."""
    class Meta:
        model = DoctorApplication
        fields = '__all__'
        read_only_fields = ['id', 'submitted_at', 'reviewed_at', 'reviewed_by', 'created_user']


class ReportSerializer(serializers.Serializer):
    """Serializer for reports."""
    type = serializers.CharField()
    data = serializers.DictField()
    from_date = serializers.DateField()
    to_date = serializers.DateField()

class AdminAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for admin appointment listing (restricted data)."""
    patient_name = serializers.SerializerMethodField()
    patient_phone = serializers.SerializerMethodField()
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        from apps.appointments.models import Appointment
        model = Appointment
        fields = [
            'id', 'patient_name', 'patient_phone', 'doctor_name',
            'appointment_type', 'start_datetime', 'end_datetime', 'status'
        ]
        read_only_fields = fields

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return "Unknown"

    def get_patient_phone(self, obj):
        if obj.patient and obj.patient.phone:
            return obj.patient.phone
        return None