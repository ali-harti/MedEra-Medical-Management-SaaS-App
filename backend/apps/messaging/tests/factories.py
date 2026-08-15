import pytest
from factory.django import DjangoModelFactory
import factory
from apps.messaging.models import Thread, Message
from apps.patients.models import Patient
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Faker('email')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'MEDECIN'

class PatientFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Patient
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.Faker('email')
    birth_date = factory.Faker('date_of_birth', minimum_age=18)

class ThreadFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Thread
    patient = factory.SubFactory(PatientFactory)
    doctor = factory.SubFactory(UserFactory)
    subject = factory.Faker('sentence')

class MessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Message
    thread = factory.SubFactory(ThreadFactory)
    sender = factory.SubFactory(UserFactory)
    content = factory.Faker('paragraph')
