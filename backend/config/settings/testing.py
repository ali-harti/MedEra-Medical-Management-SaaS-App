"""Testing settings — uses PostgreSQL test database."""
from .base import *  # noqa: F401, F403
import dj_database_url
import os

# Use PostgreSQL for tests - same as production
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL", "postgresql://medera:medera@db:5432/medera_test"),
        conn_max_age=600,
    )
}

# Disable Celery during tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Speed up hashing
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Disable email
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Disable cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}

MEDIA_ROOT = "/tmp/medera_test_media/"
STATIC_ROOT = "/tmp/medera_test_static/"
