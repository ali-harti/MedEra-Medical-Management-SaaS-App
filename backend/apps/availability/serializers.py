from rest_framework import serializers
from .models import DoctorAvailability
from apps.authentication.models import User

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'
        read_only_fields = ['id', 'doctor', 'created_at']

class DoctorPublicSerializer(serializers.ModelSerializer):
    """
    Publicly visible doctor info.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    availabilities = AvailabilitySerializer(many=True, read_only=True)
    address = serializers.SerializerMethodField()
    languages = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'specialty', 'city', 'email', 'phone', 
            'bio', 'consultation_fee', 'avatar', 'address', 'languages', 
            'rating', 'reviews_count', 'availabilities'
        ]

    def get_address(self, obj):
        if hasattr(obj, 'doctor_application'):
            return obj.doctor_application.clinic_address
        return ""

    def get_languages(self, obj):
        if hasattr(obj, 'doctor_application'):
            return obj.doctor_application.languages
        return []

    def get_rating(self, obj):
        from django.db.models import Avg
        rating = obj.doctor_reviews.aggregate(Avg('rating'))['rating__avg']
        return round(rating, 1) if rating else 5.0

    def get_reviews_count(self, obj):
        return obj.doctor_reviews.count()
