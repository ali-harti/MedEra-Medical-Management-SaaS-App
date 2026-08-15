from rest_framework import serializers
from django.utils import timezone
from .models import Appointment
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class AppointmentListSerializer(serializers.ModelSerializer):
    patient_full_name = serializers.SerializerMethodField()
    doctor_full_name = serializers.SerializerMethodField()

    def get_patient_full_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}".strip()
        return ''

    def get_doctor_full_name(self, obj):
        if obj.doctor:
            return f"{obj.doctor.first_name} {obj.doctor.last_name}".strip()
        return ''

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_full_name', 'doctor', 'doctor_full_name',
            'start_datetime', 'end_datetime', 'appointment_type', 'consultation_type',
            'status', 'motive', 'cancellation_reason', 'booked_via_whatsapp', 'created_at'
        ]

class AppointmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'online_meeting_url']

    def validate(self, attrs):
        start = attrs.get('start_datetime')
        end = attrs.get('end_datetime')
        doctor = attrs.get('doctor')

        # 1. Past date check (GAP 1 FIX: ADMIN bypass)
        if start and start <= timezone.now():
            request = self.context.get('request')
            if request and request.user.role != 'ADMIN':
                raise serializers.ValidationError(
                    {"start_datetime": "Rendez-vous dans le passé interdit. La date doit être dans le futur."}
                )

        # 2. End date after start date
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "La date de fin doit être après la date de début."}
            )

        # 3. Conflict detection (RG-RDV-01)
        if doctor and start and end:
            exclude_id = self.instance.pk if self.instance else None
            conflicting = Appointment.get_conflicting_appointments(
                doctor=doctor,
                start_datetime=start,
                end_datetime=end,
                exclude_id=exclude_id
            )
                
            if conflicting.exists():
                from datetime import timedelta
                alternatives = []
                last_end = end
                for _ in range(3):
                    alt_start = last_end + timedelta(minutes=15)
                    alt_end = alt_start + timedelta(minutes=30)
                    alternatives.append(alt_start.isoformat())
                    last_end = alt_end

                raise serializers.ValidationError(
                    {
                        "detail": "Le médecin a déjà un rendez-vous sur ce créneau.",
                        "code": ["conflict"],
                        "alternatives": alternatives
                    }
                )

        return attrs

    def create(self, validated_data):
        # created_by is handled by perform_create in the view generally, 
        # but we ensure it's here for consistency if called directly.
        request = self.context.get('request')
        if request and not validated_data.get('created_by'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class AppointmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Appointment.STATUS_CHOICES)
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
