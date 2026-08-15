from django.apps import AppConfig

class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    verbose_name = 'Journal d\'audit'
    
    def ready(self):
        # Register signals
        try:
            import apps.audit.signals  # noqa: F401
        except ImportError:
            pass
