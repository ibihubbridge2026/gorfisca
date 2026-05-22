from abc import ABC, abstractmethod
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple
from datetime import date, datetime
from django.core.exceptions import ValidationError
from .models import TaxRule, TaxConfiguration, Country


class BaseTaxCalculator(ABC):
    """
    Interface abstraite pour les calculateurs de taxes
    Permet d'implémenter des règles fiscales différentes par pays
    """
    
    def __init__(self, organization, country=None):
        self.organization = organization
        self.country = country or self._get_country()
        self.tax_config = self._get_tax_configuration()
    
    @abstractmethod
    def calculate_vat(self, amount: Decimal, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Dict[str, Decimal]:
        """
        Calculer la TVA
        
        Args:
            amount: Montant HT
            product_category: Catégorie de produit (optionnel)
            vat_rate_type: Type de taux de TVA (normal, reduced, etc.)
            
        Returns:
            Dictionnaire avec 'vat_amount', 'total_ttc', 'tax_rate'
        """
        pass
    
    @abstractmethod
    def calculate_withholding_tax(self, amount: Decimal, 
                                 tax_type: str = 'standard') -> Dict[str, Decimal]:
        """
        Calculer la retenue à la source
        
        Args:
            amount: Montant brut
            tax_type: Type de retenue
            
        Returns:
            Dictionnaire avec 'tax_amount', 'net_amount', 'tax_rate'
        """
        pass
    
    @abstractmethod
    def validate_tax_configuration(self) -> List[str]:
        """
        Valider la configuration fiscale
        
        Returns:
            Liste des erreurs de validation
        """
        pass
    
    @abstractmethod
    def get_tax_periods(self, year: int) -> List[Dict]:
        """
        Obtenir les périodes fiscales pour une année
        
        Args:
            year: Année fiscale
            
        Returns:
            Liste des périodes avec dates de début/fin/échéance
        """
        pass
    
    def _get_country(self) -> Country:
        """Obtenir le pays de l'organisation"""
        tax_config = TaxConfiguration.get_for_organization(self.organization)
        return tax_config.country
    
    def _get_tax_configuration(self) -> TaxConfiguration:
        """Obtenir la configuration fiscale"""
        return TaxConfiguration.get_for_organization(self.organization)
    
    def _round_amount(self, amount: Decimal, precision: int = 2) -> Decimal:
        """
        Arrondir un montant selon les règles de l'organisation
        """
        if self.tax_config.round_tax_amounts:
            return amount.quantize(Decimal(f'0.{"0" * precision}'), rounding=ROUND_HALF_UP)
        return amount
    
    def _get_applicable_tax_rules(self, rule_type: str, amount: Decimal, 
                                 product_category: str = None) -> List[TaxRule]:
        """
        Obtenir les règles de taxe applicables
        """
        rules = TaxRule.objects.filter(
            organization=self.organization,
            country=self.country,
            rule_type=rule_type,
            is_active=True
        ).order_by('priority')
        
        applicable_rules = []
        for rule in rules:
            if rule.applies_to(amount, product_category):
                applicable_rules.append(rule)
        
        return applicable_rules


class SenegalTaxCalculator(BaseTaxCalculator):
    """
    Calculateur de taxes pour le Sénégal
    Conforme aux réglementations sénégalaises et OHADA
    """
    
    def calculate_vat(self, amount: Decimal, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Dict[str, Decimal]:
        """
        Calculer la TVA selon les règles sénégalaises
        
        Taux TVA Sénégal:
        - Normal: 18%
        - Réduit: 10% (produits de première nécessité)
        - Exonéré: 0% (produits pharmaceutiques, éducation, etc.)
        """
        if not self.tax_config.vat_enabled:
            return {
                'vat_amount': Decimal('0.00'),
                'total_ttc': amount,
                'tax_rate': Decimal('0.00')
            }
        
        # Obtenir le taux applicable
        tax_rate = self._get_vat_rate(product_category, vat_rate_type)
        
        # Calculer la TVA
        vat_amount = self._round_amount(amount * (tax_rate / 100))
        total_ttc = amount + vat_amount
        
        return {
            'vat_amount': vat_amount,
            'total_ttc': total_ttc,
            'tax_rate': tax_rate
        }
    
    def calculate_withholding_tax(self, amount: Decimal, 
                                 tax_type: str = 'standard') -> Dict[str, Decimal]:
        """
        Calculer la retenue à la source selon les règles sénégalaises
        
        Types de retenues:
        - standard: 10% sur prestations de services
        - dividend: 10% sur dividendes
        - interest: 10% sur intérêts
        - royalty: 10% sur redevances
        """
        tax_rates = {
            'standard': Decimal('10.00'),
            'dividend': Decimal('10.00'),
            'interest': Decimal('10.00'),
            'royalty': Decimal('10.00'),
        }
        
        tax_rate = tax_rates.get(tax_type, Decimal('10.00'))
        tax_amount = self._round_amount(amount * (tax_rate / 100))
        net_amount = amount - tax_amount
        
        return {
            'tax_amount': tax_amount,
            'net_amount': net_amount,
            'tax_rate': tax_rate
        }
    
    def validate_tax_configuration(self) -> List[str]:
        """
        Valider la configuration fiscale sénégalaise
        """
        errors = []
        
        # Vérifier le pays
        if self.country.iso_alpha_2 != 'SN':
            errors.append("Ce calculateur est uniquement valide pour le Sénégal")
        
        # Vérifier la TVA
        if self.tax_config.vat_enabled:
            if self.tax_config.custom_vat_rate:
                if self.tax_config.custom_vat_rate < 0 or self.tax_config.custom_vat_rate > 50:
                    errors.append("Le taux de TVA personnalisé doit être entre 0% et 50%")
        
        # Vérifier les numéros fiscaux
        if not self.tax_config.tax_identification_number:
            errors.append("Le numéro d'identification fiscale est requis")
        
        return errors
    
    def get_tax_periods(self, year: int) -> List[Dict]:
        """
        Obtenir les périodes fiscales pour le Sénégal
        
        TVA: Déclaration mensuelle
        IS: Déclaration annuelle
        """
        periods = []
        
        # Périodes de TVA (mensuelles)
        for month in range(1, 13):
            period_start = date(year, month, 1)
            if month == 12:
                period_end = date(year, 12, 31)
            else:
                period_end = date(year, month + 1, 1) - timezone.timedelta(days=1)
            
            # Date d'échéance: 15 du mois suivant
            if month == 12:
                due_date = date(year + 1, 1, 15)
            else:
                due_date = date(year, month + 1, 15)
            
            periods.append({
                'type': 'vat',
                'period': 'monthly',
                'year': year,
                'period_number': month,
                'start_date': period_start,
                'end_date': period_end,
                'due_date': due_date,
                'description': f"TVA {period_start.strftime('%B %Y')}"
            })
        
        # Période IS (annuelle)
        periods.append({
            'type': 'corporate_tax',
            'period': 'annual',
            'year': year,
            'period_number': 1,
            'start_date': date(year, 1, 1),
            'end_date': date(year, 12, 31),
            'due_date': date(year + 1, 4, 30),  # 30 avril de l'année suivante
            'description': f"IS {year}"
        })
        
        return periods
    
    def _get_vat_rate(self, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Decimal:
        """
        Obtenir le taux de TVA applicable selon la catégorie de produit
        """
        # Catégories exonérées ou taux réduits au Sénégal
        exempt_categories = ['pharmaceutical', 'medical', 'education', 'financial_services']
        reduced_categories = ['food', 'water', 'electricity', 'transport']
        
        if product_category in exempt_categories:
            return Decimal('0.00')
        elif product_category in reduced_categories:
            return Decimal('10.00')
        else:
            return self.tax_config.get_effective_vat_rate(vat_rate_type)


class BeninTaxCalculator(BaseTaxCalculator):
    """
    Calculateur de taxes pour le Bénin
    """
    
    def calculate_vat(self, amount: Decimal, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Dict[str, Decimal]:
        """
        Calculer la TVA selon les règles béninoises
        
        Taux TVA Bénin:
        - Normal: 18%
        - Réduit: 5% (produits de première nécessité)
        """
        if not self.tax_config.vat_enabled:
            return {
                'vat_amount': Decimal('0.00'),
                'total_ttc': amount,
                'tax_rate': Decimal('0.00')
            }
        
        tax_rate = self._get_vat_rate(product_category, vat_rate_type)
        vat_amount = self._round_amount(amount * (tax_rate / 100))
        total_ttc = amount + vat_amount
        
        return {
            'vat_amount': vat_amount,
            'total_ttc': total_ttc,
            'tax_rate': tax_rate
        }
    
    def calculate_withholding_tax(self, amount: Decimal, 
                                 tax_type: str = 'standard') -> Dict[str, Decimal]:
        """
        Calculer la retenue à la source selon les règles béninoises
        """
        tax_rates = {
            'standard': Decimal('10.00'),
            'dividend': Decimal('15.00'),
            'interest': Decimal('15.00'),
            'royalty': Decimal('15.00'),
        }
        
        tax_rate = tax_rates.get(tax_type, Decimal('10.00'))
        tax_amount = self._round_amount(amount * (tax_rate / 100))
        net_amount = amount - tax_amount
        
        return {
            'tax_amount': tax_amount,
            'net_amount': net_amount,
            'tax_rate': tax_rate
        }
    
    def validate_tax_configuration(self) -> List[str]:
        """
        Valider la configuration fiscale béninoise
        """
        errors = []
        
        if self.country.iso_alpha_2 != 'BJ':
            errors.append("Ce calculateur est uniquement valide pour le Bénin")
        
        return errors
    
    def get_tax_periods(self, year: int) -> List[Dict]:
        """
        Obtenir les périodes fiscales pour le Bénin
        """
        periods = []
        
        # TVA mensuelle
        for month in range(1, 13):
            period_start = date(year, month, 1)
            if month == 12:
                period_end = date(year, 12, 31)
            else:
                period_end = date(year, month + 1, 1) - timezone.timedelta(days=1)
            
            due_date = date(year, month + 1, 15) if month < 12 else date(year + 1, 1, 15)
            
            periods.append({
                'type': 'vat',
                'period': 'monthly',
                'year': year,
                'period_number': month,
                'start_date': period_start,
                'end_date': period_end,
                'due_date': due_date,
                'description': f"TVA {period_start.strftime('%B %Y')}"
            })
        
        return periods
    
    def _get_vat_rate(self, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Decimal:
        """
        Obtenir le taux de TVA applicable selon la catégorie de produit
        """
        exempt_categories = ['pharmaceutical', 'medical', 'education']
        reduced_categories = ['food', 'agricultural']
        
        if product_category in exempt_categories:
            return Decimal('0.00')
        elif product_category in reduced_categories:
            return Decimal('5.00')
        else:
            return self.tax_config.get_effective_vat_rate(vat_rate_type)


class CoteDIvoireTaxCalculator(BaseTaxCalculator):
    """
    Calculateur de taxes pour la Côte d'Ivoire
    """
    
    def calculate_vat(self, amount: Decimal, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Dict[str, Decimal]:
        """
        Calculer la TVA selon les règles ivoiriennes
        
        Taux TVA Côte d'Ivoire:
        - Normal: 18%
        - Réduit: 9% (hôtellerie, restauration)
        """
        if not self.tax_config.vat_enabled:
            return {
                'vat_amount': Decimal('0.00'),
                'total_ttc': amount,
                'tax_rate': Decimal('0.00')
            }
        
        tax_rate = self._get_vat_rate(product_category, vat_rate_type)
        vat_amount = self._round_amount(amount * (tax_rate / 100))
        total_ttc = amount + vat_amount
        
        return {
            'vat_amount': vat_amount,
            'total_ttc': total_ttc,
            'tax_rate': tax_rate
        }
    
    def calculate_withholding_tax(self, amount: Decimal, 
                                 tax_type: str = 'standard') -> Dict[str, Decimal]:
        """
        Calculer la retenue à la source selon les règles ivoiriennes
        """
        tax_rates = {
            'standard': Decimal('10.00'),
            'dividend': Decimal('15.00'),
            'interest': Decimal('15.00'),
            'royalty': Decimal('15.00'),
        }
        
        tax_rate = tax_rates.get(tax_type, Decimal('10.00'))
        tax_amount = self._round_amount(amount * (tax_rate / 100))
        net_amount = amount - tax_amount
        
        return {
            'tax_amount': tax_amount,
            'net_amount': net_amount,
            'tax_rate': tax_rate
        }
    
    def validate_tax_configuration(self) -> List[str]:
        """
        Valider la configuration fiscale ivoirienne
        """
        errors = []
        
        if self.country.iso_alpha_2 != 'CI':
            errors.append("Ce calculateur est uniquement valide pour la Côte d'Ivoire")
        
        return errors
    
    def get_tax_periods(self, year: int) -> List[Dict]:
        """
        Obtenir les périodes fiscales pour la Côte d'Ivoire
        """
        periods = []
        
        # TVA mensuelle
        for month in range(1, 13):
            period_start = date(year, month, 1)
            if month == 12:
                period_end = date(year, 12, 31)
            else:
                period_end = date(year, month + 1, 1) - timezone.timedelta(days=1)
            
            due_date = date(year, month + 1, 20) if month < 12 else date(year + 1, 1, 20)
            
            periods.append({
                'type': 'vat',
                'period': 'monthly',
                'year': year,
                'period_number': month,
                'start_date': period_start,
                'end_date': period_end,
                'due_date': due_date,
                'description': f"TVA {period_start.strftime('%B %Y')}"
            })
        
        return periods
    
    def _get_vat_rate(self, product_category: str = None, 
                     vat_rate_type: str = 'normal') -> Decimal:
        """
        Obtenir le taux de TVA applicable selon la catégorie de produit
        """
        exempt_categories = ['pharmaceutical', 'medical', 'education']
        reduced_categories = ['hotel', 'restaurant', 'tourism']
        
        if product_category in exempt_categories:
            return Decimal('0.00')
        elif product_category in reduced_categories:
            return Decimal('9.00')
        else:
            return self.tax_config.get_effective_vat_rate(vat_rate_type)


class TaxCalculatorFactory:
    """
    Factory pour créer le bon calculateur de taxes selon le pays
    """
    
    CALCULATORS = {
        'SN': SenegalTaxCalculator,
        'BJ': BeninTaxCalculator,
        'CI': CoteDIvoireTaxCalculator,
        'TG': SenegalTaxCalculator,  # Togo utilise des règles similaires au Sénégal
        'ML': SenegalTaxCalculator,  # Mali utilise des règles similaires au Sénégal
        'NE': SenegalTaxCalculator,  # Niger utilise des règles similaires au Sénégal
        'BF': SenegalTaxCalculator,  # Burkina Faso utilise des règles similaires au Sénégal
        'GW': SenegalTaxCalculator,  # Guinée-Bissau utilise des règles similaires au Sénégal
        'GN': SenegalTaxCalculator,  # Guinée utilise des règles similaires au Sénégal
        'TD': SenegalTaxCalculator,  # Tchad utilise des règles similaires au Sénégal
        'CF': SenegalTaxCalculator,  # Centrafrique utilise des règles similaires au Sénégal
        'CM': SenegalTaxCalculator,  # Cameroun utilise des règles similaires au Sénégal
        'CG': SenegalTaxCalculator,  # Congo utilise des règles similaires au Sénégal
        'GA': SenegalTaxCalculator,  # Gabon utilise des règles similaires au Sénégal
        'EQ': SenegalTaxCalculator,  # Guinée Équatoriale utilise des règles similaires au Sénégal
        'CD': SenegalTaxCalculator,  # RDC utilise des règles similaires au Sénégal
    }
    
    @classmethod
    def create_calculator(cls, organization, country_code: str = None) -> BaseTaxCalculator:
        """
        Créer le calculateur approprié selon le pays
        
        Args:
            organization: Organisation concernée
            country_code: Code ISO Alpha-2 du pays (optionnel)
            
        Returns:
            Instance du calculateur de taxes
            
        Raises:
            ValueError: Si aucun calculateur n'est disponible pour le pays
        """
        if country_code is None:
            tax_config = TaxConfiguration.get_for_organization(organization)
            country_code = tax_config.country.iso_alpha_2
        
        calculator_class = cls.CALCULATORS.get(country_code)
        
        if not calculator_class:
            raise ValueError(f"Aucun calculateur de taxes disponible pour le pays {country_code}")
        
        return calculator_class(organization)
    
    @classmethod
    def get_supported_countries(cls) -> List[str]:
        """
        Obtenir la liste des pays supportés
        """
        return list(cls.CALCULATORS.keys())
    
    @classmethod
    def register_calculator(cls, country_code: str, calculator_class):
        """
        Enregistrer un nouveau calculateur pour un pays
        """
        cls.CALCULATORS[country_code] = calculator_class
