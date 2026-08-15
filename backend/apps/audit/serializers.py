from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'model_name', 
            'object_id', 'changes', 'ip_address', 'timestamp'
        ]

    def get_user_email(self, obj):
        if obj.user:
            return obj.user.email
        return 'Système'
