"""
Configurations par défaut pour le module d'intégrations
Création automatique des sources et configurations standards
"""

from django.db.models.signals import post_migrate
from django.dispatch import receiver
from apps.organizations.models import Organization
from .models import IntegrationSource


@receiver(post_migrate)
def create_default_integration_sources(sender, **kwargs):
    """
    Créer les sources d'intégration par défaut pour chaque organisation
    """
    if sender.name == 'apps.integrations':
        create_default_sources()


def create_default_sources():
    """
    Créer les sources d'intégration par défaut pour chaque organisation
    """
    # Définition des sources par défaut
    default_sources = [
        {
            'name': 'Excel Standard',
            'source_type': 'excel',
            'description': 'Importation depuis fichiers Excel/CSV standards',
            'config': {
                'auto_detect_columns': True,
                'date_formats': ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'],
                'decimal_separator': ',',
                'encoding': 'utf-8'
            }
        },
        {
            'name': 'Banque Sénégalaise',
            'source_type': 'csv_bank',
            'description': 'Export CSV des banques sénégalaises',
            'config': {
                'auto_detect_columns': True,
                'date_formats': ['%d/%m/%Y'],
                'decimal_separator': ',',
                'encoding': 'latin-1'
            }
        },
        {
            'name': 'Mobile Money',
            'source_type': 'momo',
            'description': 'Transactions Mobile Money (Orange, Wave, etc.)',
            'config': {
                'auto_detect_columns': True,
                'date_formats': ['%Y-%m-%d %H:%M:%S'],
                'decimal_separator': '.',
                'encoding': 'utf-8'
            }
        }
    ]
    
    # Pour chaque organisation, créer les sources par défaut
    for organization in Organization.objects.all():
        for source_data in default_sources:
            IntegrationSource.objects.get_or_create(
                organization=organization,
                name=source_data['name'],
                defaults={
                    'source_type': source_data['source_type'],
                    'description': source_data['description'],
                    'config': source_data['config'],
                    'status': 'active'
                }
            )
