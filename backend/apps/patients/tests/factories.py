import factory
from factory.django import DjangoModelFactory
from apps.patients.models import Patient
from apps.authentication.tests.factories import UserFactory
import uuid

class PatientFactory(DjangoModelFactory):
    class Meta:
        model = Patient
    
    id = factory.LazyFunction(uuid.uuid4)
    first_name = factory.Faker('first_name', locale='fr_FR')
    last_name = factory.Faker('last_name', locale='fr_FR')
    birth_date = factory.Faker('date_of_birth', minimum_age=1, maximum_age=95)
    gender = 'M'
    phone = factory.Faker('phone_number', locale='fr_FR')
    created_by = factory.SubFactory(UserFactory)
