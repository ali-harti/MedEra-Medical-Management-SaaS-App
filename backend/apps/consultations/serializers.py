from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Consultation

class ConsultationListSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    patient_details = serializers.SerializerMethodField()
    appointment_details = serializers.SerializerMethodField()
    prescription_id = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = [
            'id', 'patient', 'patient_name', 'doctor_name', 'patient_details', 'appointment_details',
            'status', 'motive', 'consultation_type', 'created_at', 'finalized_at', 'diagnosis',
            'video_session_active', 'video_started_at', 'video_duration', 'video_patient_url',
            'clinical_exam', 'clinical_notes', 'ai_used', 'symptoms', 'ai_suggestions', 'corrective_notes', 'prescription_id'
        ]

    def get_patient_details(self, obj):
        from apps.patients.serializers import PatientSerializer
        return PatientSerializer(obj.patient).data

    def get_appointment_details(self, obj):
        if not obj.appointment:
            return None
        from apps.appointments.serializers import AppointmentSerializer
        return AppointmentSerializer(obj.appointment).data

    def get_prescription_id(self, obj):
        first_presc = obj.prescriptions.first()
        return first_presc.id if first_presc else None

class ConsultationSerializer(serializers.ModelSerializer):
    patient_details = serializers.SerializerMethodField()
    appointment_details = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'finalized_at', 'status', 'ai_suggestions', 'corrective_notes', 'doctor']

    def to_representation(self, instance):
        """Defense-in-depth: Strips AI fields for Patients even if the view allows access."""
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request and hasattr(request.user, 'role') and request.user.role == 'PATIENT':
            ret.pop('ai_suggestions', None)
            ret.pop('ai_used', None)
            ret.pop('metadata', None)
        return ret

    def get_patient_details(self, obj):
        from apps.patients.serializers import PatientSerializer
        return PatientSerializer(obj.patient).data

    def get_appointment_details(self, obj):
        if not obj.appointment:
            return None
        from apps.appointments.serializers import AppointmentSerializer
        return AppointmentSerializer(obj.appointment).data

    def get_prescription_id(self, obj):
        first_presc = obj.prescriptions.first()
        return first_presc.id if first_presc else None

    def update(self, instance, validated_data):
        if instance.status == 'CANCELLED':
            raise ValidationError(
                "Consultation annulée — modification interdite."
            )
        return super().update(instance, validated_data)

class CorrectiveNoteSerializer(serializers.Serializer):
    note = serializers.CharField(required=True, max_length=2000)
