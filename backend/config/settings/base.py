"""
Django settings — base.
"""
import os
from pathlib import Path
import environ
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
environ.Env.read_env(os.path.join(BASE_DIR.parent, ".env"))

SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-change-in-production")
DEBUG = env("DEBUG", default=False)

INSTALLED_APPS = [
    "daphne",
    "channels",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "django_celery_beat",
    "health_check",
    "health_check.db",
    "health_check.cache",
    # Local
    "apps.authentication",
    "apps.patients",
    "apps.appointments",
    "apps.consultations",
    "apps.prescriptions",
    "apps.dashboard",
    "apps.audit",
    "apps.admin_portal",
    "apps.availability",
    "apps.billing",
    "apps.messaging",
    "django_extensions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.audit.signals.AuditMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "templates",
            BASE_DIR / "apps" / "prescriptions" / "templates",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

import dj_database_url

DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "authentication.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = False

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/min",
        "user": "200/min",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# JWT
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# CORS
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Redis / Cache
REDIS_URL = env("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# Celery
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'send_24h_reminders': {
        'task': 'apps.appointments.tasks.send_24h_reminders',
        'schedule': crontab(minute='*/15'),  # Run every 15 minutes
    },
    'send_1h_reminders': {
        'task': 'apps.appointments.tasks.send_1h_reminders',
        'schedule': crontab(minute='*/5'),  # Run every 5 minutes
    },
}

WHATSAPP_AGENT_URL = env("WHATSAPP_AGENT_URL", default="http://whatsapp_agent:8001")

# AI Microservice
AI_SERVICE_URL = env("AI_SERVICE_URL", default="http://localhost:5000")
AI_INTERNAL_TOKEN = env("AI_INTERNAL_TOKEN", default="medera-secret-token")
AI_SERVICE_TIMEOUT = env.int("AI_SERVICE_TIMEOUT", default=30)

# Email
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default=EMAIL_HOST_USER or "MedEra@gmail.com")

# ── Swagger / OpenAPI ────────────────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'MedEra API',
    'DESCRIPTION': '''
## Système de Gestion Intelligente de Cabinet Médical

API REST complète pour la gestion de cabinets médicaux au Maroc et en Afrique francophone.

### Authentication
This API uses **JWT Bearer tokens**. To authenticate:
1. Call `POST /api/auth/token/` with your email and password
2. Copy the `access` token from the response
3. Click the **Authorize** button above
4. Enter: `Bearer <your_access_token>`
5. Click Authorize — all protected endpoints are now unlocked

### Test Credentials (development only)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@medera.com | Admin123! |
| Médecin | medecin@medera.com | Medecin123! |
| Secrétaire | secretaire@medera.com | Secretaire123! |
| Patient | patient@medera.com | Patient123! |

### Modules
- **auth** — Authentication, user management, RBAC
- **patients** — Patient records, timeline, search
- **appointments** — Booking, state machine, conflict detection
- **consultations** — Clinical workflow, AI differential diagnosis
- **prescriptions** — Medication lines, PDF generation
- **billing** — Invoicing, payments, KPIs
- **messaging** — Threaded internal messaging
- **availability** — Doctor schedule, slot generator
- **dashboard** — KPIs, trends, system health
- **audit** — Immutable audit log (Admin only)
    ''',
    'VERSION': '1.2.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
        'defaultModelsExpandDepth': 2,
        'defaultModelExpandDepth': 2,
        'docExpansion': 'none',
        'filter': True,
        'showExtensions': True,
    },
    'COMPONENT_SPLIT_REQUEST': True,
    'SORT_OPERATIONS': False,
    'TAGS': [
        {'name': 'auth', 'description': 'Authentication and user management'},
        {'name': 'patients', 'description': 'Patient records and dossiers'},
        {'name': 'appointments', 'description': 'Appointments and scheduling'},
        {'name': 'consultations', 'description': 'Medical consultations and AI analysis'},
        {'name': 'prescriptions', 'description': 'Prescriptions and PDF generation'},
        {'name': 'billing', 'description': 'Invoicing and payments'},
        {'name': 'messaging', 'description': 'Internal messaging between roles'},
        {'name': 'availability', 'description': 'Doctor availability and slot booking'},
        {'name': 'dashboard', 'description': 'KPIs, analytics, system health'},
        {'name': 'audit', 'description': 'Audit log — Admin only'},
    ],
    'SECURITY': [{'BearerAuth': []}],
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Local development'},
    ],
}
