from django.apps import AppConfig


class CurrenciesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.currencies'
    verbose_name = 'Currencies System'
    
    def ready(self):
        # Importer les configurations par défaut
        from . import defaults
