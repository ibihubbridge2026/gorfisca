from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.organizations.models import Organization


class Country(models.Model):
    """
    Modèle pour les pays avec leurs configurations fiscales
    """
    
    # Codes ISO
    iso_alpha_2 = models.CharField(
        max_length=2,
        unique=True,
        verbose_name='Code ISO Alpha-2',
        help_text='ex: BJ, SN, CI, TG'
    )
    
    iso_alpha_3 = models.CharField(
        max_length=3,
        unique=True,
        verbose_name='Code ISO Alpha-3',
        help_text='ex: BEN, SEN, CIV, TGO'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom du pays'
    )
    
    # Configuration fiscale
    currency_code = models.CharField(
        max_length=3,
        verbose_name='Code devise',
        help_text='ex: XOF, EUR, USD'
    )
    
    currency_symbol = models.CharField(
        max_length=5,
        verbose_name='Symbole de devise',
        help_text='ex: FCFA, €, $'
    )
    
    # Paramètres TVA
    default_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        verbose_name='Taux de TVA par défaut (%)',
        help_text='Taux normal de TVA'
    )
    
    reduced_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Taux de TVA réduit (%)',
        help_text='Taux réduit pour certains produits/services'
    )
    
    # Seuils fiscaux
    vat_threshold = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Seuil d\'assujettissement TVA',
        help_text='Seuil annuel au-delà duquel la TVA s\'applique'
    )
    
    # Réglementation
    ohada_member = models.BooleanField(
        default=True,
        verbose_name='Membre OHADA',
        help_text='Pays membre de l\'OHADA'
    )
    
    fiscal_year_start = models.DateField(
        default='2024-01-01',
        verbose_name='Début de l\'année fiscale'
    )
    
    fiscal_year_end = models.DateField(
        default='2024-12-31',
        verbose_name='Fin de l\'année fiscale'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fiscal_country'
        verbose_name = 'Pays'
        verbose_name_plural = 'Pays'
        ordering = ['name']
        indexes = [
            models.Index(fields=['iso_alpha_2']),
            models.Index(fields=['ohada_member']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.iso_alpha_2})"
    
    @property
    def vat_rates(self):
        """Retourner les taux de TVA disponibles"""
        rates = {'normal': self.default_vat_rate}
        if self.reduced_vat_rate > 0:
            rates['reduced'] = self.reduced_vat_rate
        return rates


class TaxConfiguration(models.Model):
    """
    Configuration fiscale par organisation et pays
    """
    
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='fiscal_configuration',
        verbose_name='Organisation'
    )
    
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name='tax_configurations',
        verbose_name='Pays'
    )
    
    # Numéros d'identification fiscale
    tax_identification_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Numéro d\'identification fiscale',
        help_text='NIF, TIN, etc.'
    )
    
    vat_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Numéro de TVA',
        help_text='Numéro d\'enregistrement TVA'
    )
    
    # TVA
    vat_enabled = models.BooleanField(
        default=True,
        verbose_name='TVA activée'
    )
    
    vat_regime = models.CharField(
        max_length=20,
        choices=[
            ('standard', 'Régime standard'),
            ('simplified', 'Régime simplifié'),
            ('exempt', 'Exonéré'),
        ],
        default='standard',
        verbose_name='Régime de TVA'
    )
    
    custom_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Taux de TVA personnalisé (%)',
        help_text='Si défini, remplace le taux par défaut du pays'
    )
    
    # Impôts sur les salaires
    payroll_tax_enabled = models.BooleanField(
        default=True,
        verbose_name='Impôts sur salaires activés'
    )
    
    # Déclarations fiscales
    vat_declaration_frequency = models.CharField(
        max_length=20,
        choices=[
            ('monthly', 'Mensuelle'),
            ('quarterly', 'Trimestrielle'),
            ('annual', 'Annuelle'),
        ],
        default='monthly',
        verbose_name='Fréquence déclaration TVA'
    )
    
    # Options
    auto_calculate_taxes = models.BooleanField(
        default=True,
        verbose_name='Calcul automatique des taxes'
    )
    
    round_tax_amounts = models.BooleanField(
        default=True,
        verbose_name='Arrondir les montants de taxe'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fiscal_tax_configuration'
        verbose_name = 'Configuration fiscale'
        verbose_name_plural = 'Configurations fiscales'
        indexes = [
            models.Index(fields=['organization', 'country']),
            models.Index(fields=['vat_regime']),
        ]
    
    def __str__(self):
        return f"Config {self.organization.name} - {self.country.name}"
    
    def get_effective_vat_rate(self, rate_type='normal'):
        """
        Obtenir le taux de TVA effectif en fonction de la configuration
        """
        if self.custom_vat_rate and rate_type == 'normal':
            return self.custom_vat_rate
        
        country_rates = self.country.vat_rates
        return country_rates.get(rate_type, self.country.default_vat_rate)
    
    @classmethod
    def get_for_organization(cls, organization):
        """
        Obtenir ou créer la configuration fiscale pour une organisation
        """
        config, created = cls.objects.get_or_create(
            organization=organization,
            defaults={
                'country': Country.objects.get(iso_alpha_2='SN'),  # Sénégal par défaut
                'vat_enabled': True,
                'vat_regime': 'standard',
            }
        )
        return config


class TaxRule(models.Model):
    """
    Règles fiscales spécifiques par type de transaction
    """
    
    RULE_TYPES = [
        ('vat_calculation', 'Calcul TVA'),
        ('withholding_tax', 'Retenue à la source'),
        ('excise_tax', 'Taxe d\'accise'),
        ('custom_duty', 'Droit de douane'),
        ('other_tax', 'Autre taxe'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='tax_rules',
        verbose_name='Organisation'
    )
    
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='tax_rules',
        verbose_name='Pays'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom de la règle'
    )
    
    rule_type = models.CharField(
        max_length=20,
        choices=RULE_TYPES,
        verbose_name='Type de règle'
    )
    
    # Conditions d'application
    product_category = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Catégorie de produit',
        help_text='ex: food, medical, education, luxury'
    )
    
    min_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Montant minimum',
        help_text='Règle applicable si montant >= min_amount'
    )
    
    max_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Montant maximum',
        help_text='Règle applicable si montant <= max_amount'
    )
    
    # Calcul de la taxe
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='Taux de taxe (%)'
    )
    
    tax_base = models.CharField(
        max_length=20,
        choices=[
            ('gross_amount', 'Montant brut'),
            ('net_amount', 'Montant net'),
            ('vat_exclusive', 'Hors TVA'),
            ('vat_inclusive', 'TTC'),
        ],
        default='gross_amount',
        verbose_name='Base de calcul'
    )
    
    # Formule personnalisée (JSON)
    formula = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Formule personnalisée',
        help_text='Formule de calcul complexe si nécessaire'
    )
    
    # Priorité et activation
    priority = models.IntegerField(
        default=100,
        verbose_name='Priorité',
        help_text='Plus petit = plus prioritaire'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Active'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fiscal_tax_rule'
        verbose_name = 'Règle fiscale'
        verbose_name_plural = 'Règles fiscales'
        ordering = ['priority', 'name']
        indexes = [
            models.Index(fields=['organization', 'country', 'rule_type']),
            models.Index(fields=['product_category']),
            models.Index(fields=['is_active', 'priority']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.tax_rate}%"
    
    def applies_to(self, amount, product_category=None):
        """
        Vérifier si la règle s'applique à un montant et catégorie donnés
        """
        if not self.is_active:
            return False
        
        # Vérifier la catégorie de produit
        if self.product_category and product_category != self.product_category:
            return False
        
        # Vérifier les montants
        if self.min_amount and amount < self.min_amount:
            return False
        
        if self.max_amount and amount > self.max_amount:
            return False
        
        return True


class TaxDeclaration(models.Model):
    """
    Déclarations fiscales périodiques
    """
    
    DECLARATION_TYPES = [
        ('vat', 'TVA'),
        ('payroll', 'Impôts sur salaires'),
        ('corporate_tax', 'Impôt sur sociétés'),
        ('other', 'Autre'),
    ]
    
    PERIODS = [
        ('monthly', 'Mensuel'),
        ('quarterly', 'Trimestriel'),
        ('annual', 'Annuel'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('submitted', 'Soumis'),
        ('validated', 'Validé'),
        ('paid', 'Payé'),
        ('rejected', 'Rejeté'),
        ('late', 'En retard'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='tax_declarations',
        verbose_name='Organisation'
    )
    
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name='tax_declarations',
        verbose_name='Pays'
    )
    
    declaration_type = models.CharField(
        max_length=20,
        choices=DECLARATION_TYPES,
        verbose_name='Type de déclaration'
    )
    
    period = models.CharField(
        max_length=20,
        choices=PERIODS,
        verbose_name='Période'
    )
    
    year = models.PositiveIntegerField(verbose_name='Année')
    period_number = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Numéro de période',
        help_text='ex: 1-12 pour mensuel, 1-4 pour trimestriel'
    )
    
    # Dates
    period_start = models.DateField(verbose_name='Début de période')
    period_end = models.DateField(verbose_name='Fin de période')
    due_date = models.DateField(verbose_name='Date d\'échéance')
    
    # Montants
    taxable_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Montant imposable'
    )
    
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Montant de taxe'
    )
    
    tax_paid = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Taxe payée'
    )
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Statut'
    )
    
    # Métadonnées
    reference_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Numéro de référence'
    )
    
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de soumission'
    )
    
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de validation'
    )
    
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de paiement'
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name='Notes'
    )
    
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tax_declarations',
        verbose_name='Créé par'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'fiscal_tax_declaration'
        verbose_name = 'Déclaration fiscale'
        verbose_name_plural = 'Déclarations fiscales'
        ordering = ['-year', '-period_number', 'declaration_type']
        unique_together = ['organization', 'declaration_type', 'period', 'year', 'period_number']
        indexes = [
            models.Index(fields=['organization', 'declaration_type', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.get_declaration_type_display()} {self.organization.name} - {self.period} {self.year}"
    
    @property
    def tax_due(self):
        """Taxe restante à payer"""
        return self.tax_amount - self.tax_paid
    
    @property
    def is_overdue(self):
        """Vérifier si la déclaration est en retard"""
        if self.status in ['paid', 'validated']:
            return False
        return timezone.now().date() > self.due_date
    
    @property
    def days_overdue(self):
        """Jours de retard"""
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.due_date).days
