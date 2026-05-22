from django.apps import AppConfig


class FiscalConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.fiscal'
    verbose_name = 'Fiscal System'
    
    def ready(self):
        # Importer les signaux et configurations par défaut
        from . import defaults
