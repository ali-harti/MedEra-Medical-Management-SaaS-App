from rest_framework import serializers
from django.contrib.auth import get_user_model
import re

User = get_user_model()

class AdminUserSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin-level user management.
    Includes role management and password resetting.
    """
    password = serializers.CharField(
        write_only=True, 
        required=False, 
        min_length=8,
        help_text="Laissez vide pour générer un mot de passe aléatoire."
    )

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role',
            'is_active', 'failed_login_attempts', 'locked_until',
            'created_at', 'updated_at', 'password'
        ]
        read_only_fields = [
            'id', 'failed_login_attempts', 'locked_until', 
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            password = User.objects.make_random_password(length=12)
        
        user = User.objects.create_user(**validated_data, password=password)
        return user

    def validate_password(self, value):
        if value:
            if len(value) < 8:
                raise serializers.ValidationError("Le mot de passe doit faire au moins 8 caractères.")
            if not re.search(r'[A-Z]', value):
                raise serializers.ValidationError("Le mot de passe doit contenir au moins une majuscule.")
            if not re.search(r'[0-9]', value):
                raise serializers.ValidationError("Le mot de passe doit contenir au moins un chiffre.")
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
                raise serializers.ValidationError("Le mot de passe doit contenir au moins un caractère spécial.")
        return value
