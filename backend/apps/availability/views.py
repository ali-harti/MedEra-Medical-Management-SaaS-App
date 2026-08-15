from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DoctorAvailability
from .serializers import AvailabilitySerializer, DoctorPublicSerializer
from apps.authentication.models import User
from apps.authentication.permissions import IsMedecin

class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    Doctors manage their own availability hours here.
    """
    queryset = DoctorAvailability.objects.all()
    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsMedecin]

    def get_queryset(self):
        return self.queryset.filter(doctor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

class DoctorPublicViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public directory for patients to find doctors and see availability.
    """
    queryset = User.objects.filter(role='MEDECIN', is_active=True)
    serializer_class = DoctorPublicSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['specialty', 'city']
    search_fields = ['first_name', 'last_name', 'specialty']

    @action(detail=True, methods=['get'])
    def slots(self, request, pk=None):
        """
        Génère les créneaux disponibles pour une date donnée.
        Filtre les créneaux déjà occupés par des rendez-vous.
        """
        doctor = self.get_object()
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'detail': 'Paramètre "date" requis (YYYY-MM-DD).'}, status=400)

        from datetime import datetime, timedelta
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Format de date invalide.'}, status=400)

        weekday = target_date.weekday()
        windows = DoctorAvailability.objects.filter(
            doctor=doctor, 
            day_of_week=weekday, 
            is_active=True
        )
        
        if not windows.exists():
            return Response([])

        from apps.appointments.models import Appointment
        # Récupération des rendez-vous existants pour cette date
        existing_appts = Appointment.objects.filter(
            doctor=doctor,
            start_datetime__date=target_date,
            status__in=['PLANNED', 'CONFIRMED', 'ARRIVED']
        ).values_list('start_datetime', flat=True)
        
        occupied_times = [dt.time() for dt in existing_appts]
        
        available_slots = []
        for window in windows:
            curr_time = window.start_time
            delta = timedelta(minutes=window.slot_duration_minutes)
            
            # Pivot datetime pour les calculs de durée
            curr_dt = datetime.combine(target_date, curr_time)
            end_dt = datetime.combine(target_date, window.end_time)
            
            while curr_dt + delta <= end_dt:
                slot_time = curr_dt.time()
                # On vérifie si le début du créneau est libre
                if slot_time not in occupied_times:
                    available_slots.append({
                        'time': slot_time.strftime('%H:%M'),
                        'datetime': curr_dt.isoformat(),
                        'duration': window.slot_duration_minutes,
                        'types': window.consultation_types
                    })
                curr_dt += delta
                
        return Response(available_slots)

    @action(detail=True, methods=['get'])
    def multi_slots(self, request, pk=None):
        """
        Generate available slots for multiple days (default 7).
        Useful for chatbot to show a list of next available times.
        """
        doctor = self.get_object()
        days = int(request.query_params.get('days', 7))
        if days > 14: days = 14 # Limit to 2 weeks

        from datetime import datetime, date, timedelta
        start_date = date.today()
        
        all_slots = {}
        
        for i in range(days):
            target_date = start_date + timedelta(days=i)
            weekday = target_date.weekday()
            
            windows = DoctorAvailability.objects.filter(
                doctor=doctor, 
                day_of_week=weekday, 
                is_active=True
            )
            
            if not windows.exists():
                continue

            from apps.appointments.models import Appointment
            existing_appts = Appointment.objects.filter(
                doctor=doctor,
                start_datetime__date=target_date,
                status__in=['PLANNED', 'CONFIRMED', 'ARRIVED']
            ).values_list('start_datetime', flat=True)
            
            occupied_times = [dt.time() for dt in existing_appts]
            
            day_slots = []
            for window in windows:
                curr_time = window.start_time
                delta = timedelta(minutes=window.slot_duration_minutes)
                
                curr_dt = datetime.combine(target_date, curr_time)
                end_dt = datetime.combine(target_date, window.end_time)
                
                while curr_dt + delta <= end_dt:
                    slot_time = curr_dt.time()
                    if slot_time not in occupied_times:
                        day_slots.append({
                            'time': slot_time.strftime('%H:%M'),
                            'datetime': curr_dt.isoformat(),
                            'types': window.consultation_types
                        })
                    curr_dt += delta
            
            if day_slots:
                all_slots[target_date.strftime('%Y-%m-%d')] = day_slots
                
        return Response(all_slots)
