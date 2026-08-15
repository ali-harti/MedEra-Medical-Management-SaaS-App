import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta
from apps.appointments.models import Appointment
from apps.patients.tests.factories import PatientFactory
from apps.authentication.tests.factories import UserFactory
import uuid

class AppointmentFactory(DjangoModelFactory):
    class Meta:
        model = Appointment
    
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory, role='MEDECIN')
    start_datetime = factory.LazyFunction(lambda: timezone.now() + timedelta(days=1))
    end_datetime = factory.LazyAttribute(lambda o: o.start_datetime + timedelta(minutes=30))
    status = 'PLANNED'
    motive = "Consultation générale"
