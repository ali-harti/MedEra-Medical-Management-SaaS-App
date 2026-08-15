import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model

User = get_user_model()

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f'user{n}@medera.com')
    first_name = factory.Faker('first_name', locale='fr_FR')
    last_name = factory.Faker('last_name', locale='fr_FR')
    role = 'ADMIN'
    is_active = True
    is_staff = factory.LazyAttribute(lambda o: o.role == 'ADMIN')

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if create:
            self.set_password('password123')
            self.save()
