import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from apps.prescriptions.models import Prescription, MedicationLine
from apps.patients.tests.factories import PatientFactory
from apps.consultations.tests.factories import ConsultationFactory
from apps.authentication.tests.factories import UserFactory
import uuid

class PrescriptionFactory(DjangoModelFactory):
    class Meta:
        model = Prescription
    
    id = factory.LazyFunction(uuid.uuid4)
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory, role='MEDECIN')
    consultation = factory.SubFactory(ConsultationFactory, patient=factory.SelfAttribute('..patient'), doctor=factory.SelfAttribute('..doctor'), status='FINALIZED')
    issued_at = factory.LazyFunction(timezone.now)
    is_cancelled = False
