from rest_framework import serializers
from .models import Patient, DoctorReview

class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'id', 'internal_id', 'created_by', 'user', 'first_name', 
            'last_name', 'birth_date', 'gender', 'phone', 'email', 
            'address', 'blood_type', 'allergies', 'medical_history', 
            'emergency_contact', 'insurance', 'health_profile_complete',
            'is_archived', 'created_at', 'updated_at', 'last_visit'
        ]
        read_only_fields = ['id', 'internal_id', 'created_by', 'created_at', 'updated_at', 'last_visit']

    def validate(self, attrs):
        # On create only: call Patient.check_duplicate()
        if not self.instance:
            first_name = attrs.get('first_name')
            last_name = attrs.get('last_name')
            birth_date = attrs.get('birth_date')
            
            duplicates = Patient.check_duplicate(first_name, last_name, birth_date)
            if duplicates.exists():
                # Add duplicate info to validated_data for the view
                attrs['_duplicates'] = [
                    {'id': str(p.id), 'name': p.get_full_name(), 'internal_id': p.internal_id}
                    for p in duplicates
                ]
        return attrs

    def create(self, validated_data):
        # Remove '_duplicates' from validated_data before creating
        validated_data.pop('_duplicates', None)
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class PatientListSerializer(serializers.ModelSerializer):
    """Lightweight version for list views."""
    class Meta:
        model = Patient
        fields = [
            'id', 'internal_id', 'first_name', 'last_name',
            'birth_date', 'gender', 'phone', 'is_archived',
            'created_at', 'blood_type', 'insurance', 'last_visit'
        ]
        read_only_fields = ['id', 'internal_id', 'created_at', 'last_visit']

class PatientArchiveSerializer(serializers.Serializer):
    """No fields — just triggers archive() on the patient instance."""
    pass

class TimelineEventSerializer(serializers.Serializer):
    """Generic serializer for timeline events."""
    id = serializers.UUIDField()
    event_type = serializers.CharField()
    date = serializers.DateTimeField()
    title = serializers.CharField()
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    reference_id = serializers.UUIDField(required=False, allow_null=True)
    metadata = serializers.JSONField(required=False)


class DoctorReviewSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorReview
        fields = ['id', 'patient_name', 'rating', 'comment', 'created_at']

    def get_patient_name(self, obj):
        # Return only first name as per privacy requirement
        return obj.patient.first_name
