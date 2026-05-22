from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.organizations.models import Organization


class Currency(models.Model):
    """
    Modèle pour les devises supportées
    """
    
    # Codes ISO 4217
    code = models.CharField(
        max_length=3,
        unique=True,
        verbose_name='Code ISO 4217',
        help_text='ex: XOF, EUR, USD, GBP'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom de la devise'
    )
    
    symbol = models.CharField(
        max_length=5,
        verbose_name='Symbole',
        help_text='ex: FCFA, €, $, £'
    )
    
    decimal_places = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        verbose_name='Nombre de décimales'
    )
    
    # Métadonnées
    is_active = models.BooleanField(
        default=True,
        verbose_name='Active'
    )
    
    is_default = models.BooleanField(
        default=False,
        verbose_name='Devise par défaut',
        help_text='Devise par défaut pour les nouvelles organisations'
    )
    
    # Informations supplémentaires
    country = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Pays d\'origine'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'currencies_currency'
        verbose_name = 'Devise'
        verbose_name_plural = 'Devises'
        ordering = ['code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_default']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    def format_amount(self, amount):
        """
        Formater un montant selon la devise
        """
        if amount is None:
            return '0.00'
        
        formatted = f"{amount:,.{self.decimal_places}f}".replace(',', ' ')
        return f"{formatted} {self.symbol}"
    
    @classmethod
    def get_default(cls):
        """
        Obtenir la devise par défaut
        """
        try:
            return cls.objects.get(is_default=True)
        except cls.DoesNotExist:
            # Créer le XOF comme devise par défaut si non existant
            return cls.objects.create(
                code='XOF',
                name='Franc CFA BCEAO',
                symbol='FCFA',
                decimal_places=0,
                is_default=True,
                country='BCEAO'
            )


class ExchangeRate(models.Model):
    """
    Taux de change historisés
    """
    
    from_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='exchange_rates_from',
        verbose_name='Devise source'
    )
    
    to_currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='exchange_rates_to',
        verbose_name='Devise cible'
    )
    
    rate = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        validators=[MinValueValidator(Decimal('0.0000000001'))],
        verbose_name='Taux de change',
        help_text='1 unité de from_currency = rate unités de to_currency'
    )
    
    date = models.DateField(
        verbose_name='Date du taux',
        help_text='Date à laquelle ce taux s\'applique'
    )
    
    # Métadonnées
    source = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Source du taux',
        help_text='ex: BCEAO, ECB, manual'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'currencies_exchange_rate'
        verbose_name = 'Taux de change'
        verbose_name_plural = 'Taux de change'
        ordering = ['-date', '-created_at']
        unique_together = ['from_currency', 'to_currency', 'date']
        indexes = [
            models.Index(fields=['from_currency', 'to_currency', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return f"1 {self.from_currency.code} = {self.rate} {self.to_currency.code} ({self.date})"
    
    @property
    def inverse_rate(self):
        """
        Calculer le taux inverse
        """
        if self.rate == 0:
            return Decimal('0.00')
        return Decimal('1.00') / self.rate
    
    def convert_amount(self, amount):
        """
        Convertir un montant de from_currency vers to_currency
        """
        return amount * self.rate
    
    def convert_inverse(self, amount):
        """
        Convertir un montant de to_currency vers from_currency
        """
        return amount / self.rate
    
    @classmethod
    def get_rate(cls, from_currency, to_currency, date=None):
        """
        Obtenir le taux de change le plus récent pour une date donnée
        """
        if date is None:
            date = timezone.now().date()
        
        try:
            return cls.objects.filter(
                from_currency=from_currency,
                to_currency=to_currency,
                date__lte=date,
                is_active=True
            ).latest('date')
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def get_latest_rate(cls, from_currency, to_currency):
        """
        Obtenir le taux de change le plus récent
        """
        return cls.get_rate(from_currency, to_currency, timezone.now().date())


class CurrencyConfiguration(models.Model):
    """
    Configuration des devises par organisation
    """
    
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='currency_configuration',
        verbose_name='Organisation'
    )
    
    base_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='base_currency_configs',
        verbose_name='Devise de base',
        help_text='Devise principale pour l\'organisation'
    )
    
    reporting_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='reporting_currency_configs',
        verbose_name='Devise de reporting',
        help_text='Devise utilisée pour les rapports'
    )
    
    # Options de conversion
    auto_convert = models.BooleanField(
        default=True,
        verbose_name='Conversion automatique',
        help_text='Convertir automatiquement les montants dans la devise de base'
    )
    
    use_latest_rates = models.BooleanField(
        default=True,
        verbose_name='Utiliser les derniers taux',
        help_text='Utiliser les taux de change les plus récents'
    )
    
    # Précision et arrondi
    rounding_precision = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(4)],
        verbose_name='Précision d\'arrondi'
    )
    
    rounding_method = models.CharField(
        max_length=20,
        choices=[
            ('half_up', 'Arrondi supérieur (0.5+)'),
            ('half_down', 'Arrondi inférieur (0.5+)'),
            ('up', 'Toujours supérieur'),
            ('down', 'Toujours inférieur'),
        ],
        default='half_up',
        verbose_name='Méthode d\'arrondi'
    )
    
    # Devises autorisées
    allowed_currencies = models.ManyToManyField(
        Currency,
        blank=True,
        related_name='allowed_currency_configs',
        verbose_name='Devises autorisées'
    )
    
    # Validation
    max_rate_age_days = models.IntegerField(
        default=7,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
        verbose_name='Âge maximum des taux (jours)',
        help_text='Alerte si les taux de change sont plus anciens que ce nombre de jours'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'currencies_currency_configuration'
        verbose_name = 'Configuration de devises'
        verbose_name_plural = 'Configurations de devises'
        indexes = [
            models.Index(fields=['organization', 'base_currency']),
            models.Index(fields=['organization', 'reporting_currency']),
        ]
    
    def __str__(self):
        return f"Config {self.organization.name} - {self.base_currency.code}"
    
    def get_allowed_currencies(self):
        """
        Obtenir les devises autorisées (base + reporting + autorisées)
        """
        currencies = {self.base_currency, self.reporting_currency}
        currencies.update(self.allowed_currencies.all())
        return list(currencies)
    
    def is_currency_allowed(self, currency):
        """
        Vérifier si une devise est autorisée
        """
        return (currency == self.base_currency or 
                currency == self.reporting_currency or 
                self.allowed_currencies.filter(id=currency.id).exists())
    
    def round_amount(self, amount):
        """
        Arrondir un montant selon la configuration
        """
        from decimal import ROUND_HALF_UP, ROUND_HALF_DOWN, ROUND_UP, ROUND_DOWN
        
        rounding_methods = {
            'half_up': ROUND_HALF_UP,
            'half_down': ROUND_HALF_DOWN,
            'up': ROUND_UP,
            'down': ROUND_DOWN,
        }
        
        quantize_str = f"0.{'0' * self.rounding_precision}"
        return amount.quantize(
            Decimal(quantize_str),
            rounding=rounding_methods[self.rounding_method]
        )
    
    @classmethod
    def get_for_organization(cls, organization):
        """
        Obtenir ou créer la configuration de devises pour une organisation
        """
        config, created = cls.objects.get_or_create(
            organization=organization,
            defaults={
                'base_currency': Currency.get_default(),
                'reporting_currency': Currency.get_default(),
            }
        )
        return config


class CurrencyTransaction(models.Model):
    """
    Historique des transactions multi-devises
    """
    
    TRANSACTION_TYPES = [
        ('invoice', 'Facture'),
        ('payment', 'Paiement'),
        ('expense', 'Dépense'),
        ('journal_entry', 'Écriture comptable'),
        ('other', 'Autre'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='currency_transactions',
        verbose_name='Organisation'
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPES,
        verbose_name='Type de transaction'
    )
    
    # Référence à l'objet original
    content_type = models.ForeignKey(
        'contenttypes.ContentType',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Type de contenu'
    )
    
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='ID de l\'objet'
    )
    
    # Montants
    original_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='original_transactions',
        verbose_name='Devise originale'
    )
    
    original_amount = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        verbose_name='Montant original'
    )
    
    base_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name='base_transactions',
        verbose_name='Devise de base'
    )
    
    base_amount = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        verbose_name='Montant en devise de base'
    )
    
    # Taux de change utilisé
    exchange_rate = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        verbose_name='Taux de change utilisé'
    )
    
    rate_date = models.DateField(
        verbose_name='Date du taux'
    )
    
    # Métadonnées
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'currencies_currency_transaction'
        verbose_name = 'Transaction multi-devises'
        verbose_name_plural = 'Transactions multi-devises'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'transaction_type']),
            models.Index(fields=['original_currency', 'base_currency']),
            models.Index(fields=['rate_date']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        return f"{self.original_amount} {self.original_currency.code} → {self.base_amount} {self.base_currency.code}"
    
    @classmethod
    def create_transaction(cls, organization, transaction_type, original_currency, 
                          original_amount, base_currency, base_amount, 
                          exchange_rate, rate_date, content_object=None, 
                          description=''):
        """
        Créer une transaction multi-devises
        """
        from django.contrib.contenttypes.models import ContentType
        
        return cls.objects.create(
            organization=organization,
            transaction_type=transaction_type,
            content_type=ContentType.objects.get_for_model(content_object) if content_object else None,
            object_id=content_object.pk if content_object else None,
            original_currency=original_currency,
            original_amount=original_amount,
            base_currency=base_currency,
            base_amount=base_amount,
            exchange_rate=exchange_rate,
            rate_date=rate_date,
            description=description
        )


class CurrencyBalance(models.Model):
    """
    Soldes par devise pour une organisation
    """
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='currency_balances',
        verbose_name='Organisation'
    )
    
    currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='balances',
        verbose_name='Devise'
    )
    
    # Soldes
    balance = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        default=Decimal('0.00'),
        verbose_name='Solde'
    )
    
    base_currency_equivalent = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        default=Decimal('0.00'),
        verbose_name='Équivalent en devise de base'
    )
    
    # Métadonnées
    last_updated = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière mise à jour'
    )
    
    class Meta:
        db_table = 'currencies_currency_balance'
        verbose_name = 'Solde par devise'
        verbose_name_plural = 'Soldes par devise'
        unique_together = ['organization', 'currency']
        indexes = [
            models.Index(fields=['organization', 'currency']),
            models.Index(fields=['last_updated']),
        ]
    
    def __str__(self):
        return f"{self.organization.name} - {self.currency.code}: {self.balance}"
    
    @classmethod
    def get_or_create_balance(cls, organization, currency):
        """
        Obtenir ou créer un solde pour une organisation et devise
        """
        balance, created = cls.objects.get_or_create(
            organization=organization,
            currency=currency,
            defaults={
                'balance': Decimal('0.00'),
                'base_currency_equivalent': Decimal('0.00')
            }
        )
        return balance
    
    def update_balance(self, amount_change, base_equivalent_change):
        """
        Mettre à jour le solde
        """
        self.balance += amount_change
        self.base_currency_equivalent += base_equivalent_change
        self.save()
