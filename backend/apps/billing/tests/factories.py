import factory
from factory.django import DjangoModelFactory
from apps.billing.models import Billing
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'MEDECIN'

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Faker('email')
    birth_date = factory.Faker('date_of_birth', minimum_age=18)

class BillingFactory(DjangoModelFactory):
    class Meta:
        model = Billing
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory)
    amount_total = 500.00
    status = 'PENDING'
