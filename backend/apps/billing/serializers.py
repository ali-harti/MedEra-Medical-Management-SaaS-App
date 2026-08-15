from rest_framework import serializers
from .models import Billing, OnlinePayment

class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    
    class Meta:
        model = Billing
        fields = '__all__'
        read_only_fields = ['id', 'invoice_number', 'doctor', 'created_at', 'updated_at', 'paid_at']

class BillingKPIsSerializer(serializers.Serializer):
    revenue_today = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_count = serializers.IntegerField()
    monthly_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    collection_rate = serializers.FloatField()
