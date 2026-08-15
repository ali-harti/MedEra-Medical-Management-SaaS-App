"""DRF serializers for authentication app."""
import re
from django.utils.crypto import get_random_string
from .tasks import send_welcome_email
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, DoctorApplication


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "phone", "role", "avatar", "is_active", "created_at", "last_login", "locked_until", "specialty", "city", "bio", "consultation_fee", "slot_duration_minutes"]
        read_only_fields = ["id", "created_at"]


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "role", "password", "password_confirm"]

    def validate_password(self, value):
        """Validate password strength (RG-AUTH-01)."""
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least 1 uppercase letter")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least 1 digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise serializers.ValidationError("Password must contain at least 1 special character")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["role"] = user.role
        return token

    def validate(self, attrs):
        # Check if account is locked before attempting authentication
        try:
            user = User.objects.get(email=attrs.get("email"))
            if user.locked_until and user.locked_until > __import__('django.utils.timezone').timezone.now():
                raise serializers.ValidationError(
                    {"error": "account_locked", "detail": "Account locked due to too many failed attempts. Try again in 15 minutes."},
                    code="account_locked"
                )
        except User.DoesNotExist:
            pass  # Don't reveal if email exists

        result = super().validate(attrs)

        # Add extra user info to response
        result["user_id"] = self.user.id
        result["email"] = self.user.email
        result["full_name"] = self.user.full_name
        result["role"] = self.user.role

        return result

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        reg = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$")
        if not re.fullmatch(reg, value):
            raise serializers.ValidationError(
                "Password must contain uppercase, lowercase, number and special character."
            )
        return value


class DoctorApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorApplication
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'city',
            'specialty', 'license_number', 'clinic_name', 'clinic_address',
            'years_of_experience', 'languages', 'motivation_message'
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        
        if DoctorApplication.objects.filter(email=value, status='PENDING').exists():
            raise serializers.ValidationError("An application is already in progress for this email.")
        return value

    def validate_license_number(self, value):
        if DoctorApplication.objects.filter(
            license_number=value, 
            status__in=['PENDING', 'APPROVED']
        ).exists():
            raise serializers.ValidationError("This license number is already associated with an application.")
        return value


class DoctorApplicationListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorApplication
        fields = [
            'id', 'first_name', 'last_name', 'email', 'specialty',
            'city', 'license_number', 'status', 'submitted_at'
        ]


class DoctorApplicationDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorApplication
        fields = '__all__'
        read_only_fields = [
            'status', 'reviewed_at', 'reviewed_by', 
            'created_user', 'submitted_at'
        ]


class ApprovalSerializer(serializers.Serializer):
    """Used for approval action - no body required."""
    pass


class RejectionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, max_length=500)


class PatientRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 
            'first_name', 'last_name', 'phone'
        ]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain at least one uppercase letter.")
        if not re.search(r'\d', value):
            raise serializers.ValidationError("Password must contain at least one digit.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        phone = validated_data.get('phone', '')
        
        from apps.patients.models import Patient
        
        patient = None
        if phone:
            # Clean phone if needed or just exact match
            patient = Patient.objects.filter(phone=phone).first()
            if not patient and phone.startswith('0'):
                patient = Patient.objects.filter(phone='+212' + phone[1:]).first()

        # If we found a WhatsApp patient, update their user account instead of creating a new one
        if patient and patient.user and patient.user.email.startswith('whatsapp_'):
            user = patient.user
            user.email = validated_data.get('email')
            user.first_name = validated_data.get('first_name')
            user.last_name = validated_data.get('last_name')
            user.phone = phone
            user.set_password(password)
            user.save()
            return user
            
        # Create new user
        user = User.objects.create_user(
            role='PATIENT',
            is_active=True,
            **validated_data
        )
        user.set_password(password)
        user.save()
        
        # Link to existing patient without user or create new
        if patient and not patient.user:
            patient.user = user
            patient.save()
        elif not patient:
            Patient.objects.create(
                user=user,
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                phone=user.phone,
                birth_date='2000-01-01', # Default
                gender='O' # Default
            )
            
        return user


class SecretaryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value

    def create(self, validated_data):
        temp_password = get_random_string(12)
        request = self.context.get('request')
        doctor = request.user
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=temp_password,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role='SECRETAIRE',
            is_active=True,
            created_by=doctor
        )
        
        # Offload email sending to Celery
        send_welcome_email.delay(
            user_id=str(user.id), 
            temp_password=temp_password,
            creator_name=f"{doctor.first_name} {doctor.last_name}"
        )
        
        return user
