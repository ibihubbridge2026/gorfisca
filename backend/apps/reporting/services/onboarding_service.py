"""
Services utilitaires pour l'onboarding
Gère la validation des données fiscales et l'initialisation du plan comptable OHADA
"""
import re
from typing import Dict, Any, Optional
from django.db import transaction
from django.utils import timezone

from apps.organizations.models import Organization
from apps.accounting.models import Account


class OnboardingValidationError(Exception):
    """Exception levée lors d'une erreur de validation d'onboarding"""
    pass


class FiscalValidator:
    """Valide les formats fiscaux selon le pays"""
    
    # Patterns simplifiés pour les différents pays OHADA
    PATTERNS = {
        'CD': {  # RDC
            'nif': r'^\d{9}[A-Z]$',  # 9 chiffres + 1 lettre
            'rccm': r'^CD/\w{4}/\d{6}\sB\d{5}$',  # Format standard
        },
        'CI': {  # Côte d'Ivoire
            'nif': r'^\d{10}-\d$',  # 10 chiffres - 1 chiffre
            'rccm': r'^ABJ\d{6}\s\w{4}$',
        },
        'SN': {  # Sénégal
            'nif': r'^\d{9}$',
            'rccm': r'^SN\d{9}$',
        },
        'CM': {  # Cameroun
            'nif': r'^M\d{10}$',
            'rccm': r'^CM/\w+/\d{4}',
        },
        'DEFAULT': {
            'nif': r'^.{5,20}$',  # Validation générique si pays inconnu
            'rccm': r'^.{5,30}$',
        }
    }

    @classmethod
    def validate_nif(cls, nif: str, country_code: str) -> bool:
        """Valide le format du Numéro d'Identification Fiscale"""
        pattern = cls.PATTERNS.get(country_code, cls.PATTERNS['DEFAULT'])['nif']
        if not re.match(pattern, nif.upper()):
            return False
        return True

    @classmethod
    def validate_rccm(cls, rccm: str, country_code: str) -> bool:
        """Valide le format du RCCM"""
        pattern = cls.PATTERNS.get(country_code, cls.PATTERNS['DEFAULT'])['rccm']
        if not re.match(pattern, rccm.upper()):
            return False
        return True


class OHADASeeder:
    """Initialise le Plan Comptable OHADA par défaut"""
    
    # Extrait simplifié des classes principales OHADA
    DEFAULT_ACCOUNTS = [
        # Classe 1 : Capitaux Propres
        {'code': '101', 'name': 'Capital social', 'type': 'equity', 'class': '1'},
        {'code': '106', 'name': 'Réserves', 'type': 'equity', 'class': '1'},
        {'code': '120', 'name': 'Résultat de l\'exercice (bénéfice)', 'type': 'equity', 'class': '1'},
        
        # Classe 2 : Immobilisations
        {'code': '211', 'name': 'Terrains', 'type': 'asset', 'class': '2'},
        {'code': '213', 'name': 'Constructions', 'type': 'asset', 'class': '2'},
        {'code': '233', 'name': 'Matériel informatique', 'type': 'asset', 'class': '2'},
        {'code': '281', 'name': 'Amortissements des immobilisations', 'type': 'contra_asset', 'class': '2'},
        
        # Classe 3 : Stocks
        {'code': '301', 'name': 'Marchandises', 'type': 'asset', 'class': '3'},
        {'code': '311', 'name': 'Matières premières', 'type': 'asset', 'class': '3'},
        
        # Classe 4 : Tiers
        {'code': '401', 'name': 'Fournisseurs', 'type': 'liability', 'class': '4'},
        {'code': '409', 'name': 'Fournisseurs débiteurs', 'type': 'asset', 'class': '4'},
        {'code': '411', 'name': 'Clients', 'type': 'asset', 'class': '4'},
        {'code': '419', 'name': 'Clients créditeurs', 'type': 'liability', 'class': '4'},
        {'code': '421', 'name': 'Personnel - Rémunérations dues', 'type': 'liability', 'class': '4'},
        {'code': '431', 'name': 'Sécurité sociale', 'type': 'liability', 'class': '4'},
        {'code': '442', 'name': 'État - Impôts et taxes recouvrables', 'type': 'asset', 'class': '4'},
        {'code': '443', 'name': 'État - Impôts et taxes à payer', 'type': 'liability', 'class': '4'},
        
        # Classe 5 : Financier
        {'code': '511', 'name': 'Banque', 'type': 'asset', 'class': '5'},
        {'code': '521', 'name': 'Chèques postaux', 'type': 'asset', 'class': '5'},
        {'code': '571', 'name': 'Caisse', 'type': 'asset', 'class': '5'},
        
        # Classe 6 : Charges
        {'code': '601', 'name': 'Achats de marchandises', 'type': 'expense', 'class': '6'},
        {'code': '611', 'name': 'Sous-traitance générale', 'type': 'expense', 'class': '6'},
        {'code': '621', 'name': 'Personnel extérieur à l\'entreprise', 'type': 'expense', 'class': '6'},
        {'code': '631', 'name': 'Impôts et taxes', 'type': 'expense', 'class': '6'},
        
        # Classe 7 : Produits
        {'code': '701', 'name': 'Ventes de marchandises', 'type': 'revenue', 'class': '7'},
        {'code': '706', 'name': 'Prestations de services', 'type': 'revenue', 'class': '7'},
    ]

    @classmethod
    @transaction.atomic
    def seed_chart_of_accounts(cls, organization: Organization) -> int:
        """
        Crée le plan comptable par défaut pour une organisation.
        Retourne le nombre de comptes créés.
        """
        created_count = 0
        
        # Vérifier si déjà existant pour éviter doublons
        existing_count = Account.objects.filter(
            organization=organization,
            is_system=True
        ).count()
        
        if existing_count > 0:
            return 0  # Déjà seedé

        accounts_to_create = []
        for acc_data in cls.DEFAULT_ACCOUNTS:
            accounts_to_create.append(
                Account(
                    organization=organization,
                    code=acc_data['code'],
                    name=acc_data['name'],
                    account_type=acc_data['type'],
                    account_class=acc_data['class'],
                    is_system=True,  # Marque comme compte système
                    is_active=True
                )
            )
        
        if accounts_to_create:
            Account.objects.bulk_create(accounts_to_create)
            created_count = len(accounts_to_create)
            
        return created_count
