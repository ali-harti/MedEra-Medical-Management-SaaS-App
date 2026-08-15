import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from apps.consultations.models import Consultation
from apps.patients.tests.factories import PatientFactory
from apps.appointments.tests.factories import AppointmentFactory
from apps.authentication.tests.factories import UserFactory
import uuid

class ConsultationFactory(DjangoModelFactory):
    class Meta:
        model = Consultation
    
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory, role='MEDECIN')
    appointment = factory.SubFactory(AppointmentFactory, patient=factory.SelfAttribute('..patient'), doctor=factory.SelfAttribute('..doctor'))
    motive = "Contrôle annuel"
    symptoms = ["fatigue", "maux de tête"]
    diagnosis = ""
    status = 'DRAFT'
