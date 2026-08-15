from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Show emails in console during development
# EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Disable throttling in development
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []

# Show SQL queries
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG",
        },
    },
}
