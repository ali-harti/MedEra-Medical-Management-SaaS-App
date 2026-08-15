from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.utils import timezone
from django.db.models import Sum, Count
from .models import Billing
from .serializers import BillingSerializer, BillingKPIsSerializer
from apps.authentication.permissions import IsMedicalStaff

class BillingViewSet(viewsets.ModelViewSet):
    queryset = Billing.objects.all().select_related('patient', 'doctor', 'consultation')
    serializer_class = BillingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'patient', 'doctor', 'payment_method']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']

    def get_queryset(self):
        user = self.request.user
        cabinet_doctor = user.get_cabinet_doctor()
        if cabinet_doctor:
            return self.queryset.filter(doctor=cabinet_doctor)
        elif user.role == 'PATIENT':
            # Patients only see their own billing records
            return self.queryset.filter(patient__user=user)
        return self.queryset.none()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'kpis']:
            return [IsMedicalStaff()]
        if self.action == 'mark_paid':
            # Patients can pay their own invoices; medical staff can pay any invoice
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        doctor = self.request.user.get_cabinet_doctor()
        serializer.save(doctor=doctor)

    @extend_schema(
        tags=['billing'],
        summary='Mark invoice as paid',
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'payment_method': {
                        'type': 'string',
                        'enum': ['CASH', 'CARD', 'INSURANCE'],
                        'example': 'CASH'
                    },
                },
                'required': ['payment_method'],
            }
        },
        responses={
            200: OpenApiResponse(description='Invoice marked as PAID'),
            400: OpenApiResponse(description='Invoice already cancelled or paid'),
        },
    )
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        billing = self.get_object()
        method = request.data.get('payment_method', 'CASH')
        
        billing.status = 'PAID'
        billing.payment_method = method
        billing.amount_paid = billing.amount_total
        billing.save()
        
        return Response(BillingSerializer(billing).data)

    @extend_schema(
        tags=['billing'],
        summary='Billing KPIs',
        description='Returns revenue summary: today, monthly, pending count, collection rate.',
        responses={200: OpenApiResponse(description='KPI summary object')},
    )
    @action(detail=False, methods=['get'])
    def kpis(self, request):
        doctor = request.user.get_cabinet_doctor()
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        doctor_bills = Billing.objects.filter(doctor=doctor)
        
        revenue_today = doctor_bills.filter(
            status='PAID', 
            paid_at__date=today
        ).aggregate(Sum('amount_total'))['amount_total__sum'] or 0
        
        monthly_revenue = doctor_bills.filter(
            status='PAID', 
            paid_at__date__gte=month_start
        ).aggregate(Sum('amount_total'))['amount_total__sum'] or 0
        
        pending_count = doctor_bills.filter(status='PENDING').count()
        
        total_billed = doctor_bills.aggregate(Sum('amount_total'))['amount_total__sum'] or 1
        total_paid = doctor_bills.filter(status='PAID').aggregate(Sum('amount_total'))['amount_total__sum'] or 0
        collection_rate = float(total_paid / total_billed) * 100
        
        data = {
            'revenue_today': revenue_today,
            'pending_count': pending_count,
            'monthly_revenue': monthly_revenue,
            'collection_rate': collection_rate
        }
        
        return Response(data)
