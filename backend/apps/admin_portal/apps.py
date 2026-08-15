from django.apps import AppConfig


class AdminPortalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.admin_portal"
    label = "admin_portal"
    verbose_name = "Admin Portal"

    def ready(self):
        import apps.admin_portal.signals