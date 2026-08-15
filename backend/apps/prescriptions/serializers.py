from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Prescription, MedicationLine

class MedicationLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationLine
        fields = [
            'id', 'drug_name', 'dosage', 'form', 
            'dosology', 'duration_days', 'special_instructions'
        ]

class PrescriptionSerializer(serializers.ModelSerializer):
    medication_lines = MedicationLineSerializer(many=True)
    is_valid = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ['id', 'issued_at', 'created_at', 'pdf_path', 'doctor']
        extra_kwargs = {
            'patient': {'required': False}
        }

    def get_is_valid(self, obj):
        return not obj.is_cancelled

    def get_patient_name(self, obj):
        if obj.patient:
            return f"{obj.patient.first_name} {obj.patient.last_name}"
        return None

    def get_doctor_name(self, obj):
        if obj.doctor:
            return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}".strip()
        return None

    def validate(self, attrs):
        consultation = attrs.get('consultation')
        request = self.context.get('request')
        
        if consultation:
            # 1. Check that consultation exists and is FINALIZED
            if consultation.status != 'FINALIZED':
                raise ValidationError(
                    "Ordonnance uniquement depuis consultation finalisée."
                )
            
            # 2. Check that consultation doctor matches current user
            if request and consultation.doctor != request.user:
                raise ValidationError(
                    "Vous ne pouvez prescrire que vos propres consultations."
                )
                
        return attrs

    def create(self, validated_data):
        lines_data = validated_data.pop('medication_lines', [])
        request = self.context.get('request')
        
        # Ensure doctor is set
        validated_data.setdefault('doctor', request.user)
        
        # If consultation is present, ensure patient matches consultation's patient
        if validated_data.get('consultation'):
            validated_data['patient'] = validated_data['consultation'].patient
        elif 'patient' not in validated_data:
            raise ValidationError("Le patient est requis s'il n'y a pas de consultation associée.")
            
        prescription = Prescription.objects.create(**validated_data)
        
        for line in lines_data:
            MedicationLine.objects.create(
                prescription=prescription, 
                **line
            )
            
        return prescription

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('medication_lines', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if lines_data is not None:
            instance.medication_lines.all().delete()
            for line in lines_data:
                from .models import MedicationLine
                MedicationLine.objects.create(
                    prescription=instance, 
                    **line
                )
                
        # Clear pdf_path to force regeneration
        instance.pdf_path = ''
        instance.save()
        
        return instance
