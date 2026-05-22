from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.integrations'
    verbose_name = 'Integrations System'
    
    def ready(self):
        # Importer les signaux et configurations par défaut
        from . import defaults
