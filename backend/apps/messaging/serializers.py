from rest_framework import serializers
from .models import Thread, Message, Notification

class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    is_me = serializers.SerializerMethodField()
    sent_at = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'thread', 'sender', 'sender_name', 'content', 'is_read', 'sent_at', 'attachment', 'is_me']
        read_only_fields = ['id', 'sender', 'sent_at', 'thread']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request:
            return obj.sender == request.user
        return False

class ThreadSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    secretary_name = serializers.CharField(source='secretary.get_full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    other_party_name = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_party_name(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        
        if obj.thread_type == 'INTERNAL':
            if user == obj.doctor and obj.secretary:
                return f"Sec. {obj.secretary.get_full_name()}"
            elif user == obj.secretary and obj.doctor:
                return f"Dr. {obj.doctor.get_full_name()}"
            return "Internal Staff"
        else:
            if user and user.role == 'PATIENT':
                return f"Dr. {obj.doctor.get_full_name()}" if obj.doctor else "Doctor"
            return obj.patient.get_full_name() if obj.patient else "Patient"

    def get_last_message(self, obj):
        msg = obj.messages.last()
        if msg:
            return msg.content
        return None

    def get_last_message_at(self, obj):
        msg = obj.messages.last()
        if msg:
            return msg.created_at
        return obj.created_at

    def get_is_read(self, obj):
        request = self.context.get('request')
        if not request:
            return True
        return not obj.messages.exclude(sender=request.user).filter(is_read=False).exists()

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
