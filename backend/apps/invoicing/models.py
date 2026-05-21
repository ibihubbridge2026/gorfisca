from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from apps.organizations.models import Organization
from apps.users.models import User
from apps.accounting.models import Account


class Invoice(models.Model):
    """Invoice model for billing and accounting integration"""
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('sent', 'Envoyée'),
        ('paid', 'Payée'),
        ('overdue', 'En retard'),
        ('cancelled', 'Annulée'),
    ]
    
    PAYMENT_TERMS_CHOICES = [
        ('immediate', 'Paiement immédiat'),
        ('net_15', 'Net 15 jours'),
        ('net_30', 'Net 30 jours'),
        ('net_60', 'Net 60 jours'),
        ('net_90', 'Net 90 jours'),
    ]
    
    # Core fields
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invoices',
        verbose_name='Organisation'
    )
    
    # Sequential invoice number (immutable)
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        verbose_name='Numéro de facture',
        help_text='Numéro séquentiel unique généré automatiquement'
    )
    
    # Client information
    client_name = models.CharField(
        max_length=200,
        verbose_name='Nom du client'
    )
    client_email = models.EmailField(
        blank=True,
        verbose_name='Email du client'
    )
    client_phone = models.CharField(
        max_length=20,
        blank=True,
        verbose_name='Téléphone du client'
    )
    client_address = models.TextField(
        blank=True,
        verbose_name='Adresse du client'
    )
    
    # Invoice details
    issue_date = models.DateField(
        default=timezone.now,
        verbose_name='Date d\'émission'
    )
    due_date = models.DateField(
        verbose_name='Date d\'échéance'
    )
    payment_terms = models.CharField(
        max_length=20,
        choices=PAYMENT_TERMS_CHOICES,
        default='net_30',
        verbose_name='Conditions de paiement'
    )
    
    # Financial amounts
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Sous-total HT'
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        validators=[MinValueValidator(0)],
        verbose_name='Taux de TVA (%)'
    )
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Montant TVA'
    )
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Montant total TTC'
    )
    
    # Status and workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name='Statut'
    )
    
    # Accounting integration
    journal_entry = models.OneToOneField(
        'accounting.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice',
        verbose_name='Écriture comptable'
    )
    
    # Metadata
    notes = models.TextField(
        blank=True,
        verbose_name='Notes'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_invoices',
        verbose_name='Créée par'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Date de mise à jour'
    )
    
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date d\'envoi'
    )
    
    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de paiement'
    )
    
    class Meta:
        db_table = 'invoicing_invoice'
        verbose_name = 'Facture'
        verbose_name_plural = 'Factures'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'invoice_number']),
            models.Index(fields=['due_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Facture {self.invoice_number} - {self.client_name}"
    
    @property
    def is_overdue(self):
        """Check if invoice is overdue"""
        if self.status in ['paid', 'cancelled']:
            return False
        return timezone.now().date() > self.due_date
    
    @property
    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue:
            return 0
        return (timezone.now().date() - self.due_date).days
    
    def calculate_amounts(self):
        """Calculate tax and total amounts"""
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total_amount = self.subtotal + self.tax_amount
        self.save()
    
    def mark_as_sent(self):
        """Mark invoice as sent"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save()
    
    def mark_as_paid(self):
        """Mark invoice as paid"""
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.save()
    
    def mark_as_overdue(self):
        """Mark invoice as overdue"""
        if self.status == 'sent':
            self.status = 'overdue'
            self.save()


class InvoiceItem(models.Model):
    """Individual line item in an invoice"""
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='Facture'
    )
    
    description = models.CharField(
        max_length=500,
        verbose_name='Description'
    )
    
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        default=Decimal('1.00'),
        verbose_name='Quantité'
    )
    
    unit_price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Prix unitaire HT'
    )
    
    # Accounting integration
    revenue_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='invoice_items',
        verbose_name='Compte de revenu',
        help_text='Compte de revenu OHADA pour cette ligne'
    )
    
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        validators=[MinValueValidator(0)],
        verbose_name='Taux de TVA (%)'
    )
    
    # Calculated fields
    subtotal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='Sous-total HT'
    )
    
    tax_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Montant TVA'
    )
    
    total = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='Total TTC'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoicing_invoice_item'
        verbose_name = 'Ligne de facture'
        verbose_name_plural = 'Lignes de facture'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.description} - {self.quantity} x {self.unit_price}"
    
    def calculate_amounts(self):
        """Calculate line item amounts"""
        self.subtotal = self.quantity * self.unit_price
        self.tax_amount = self.subtotal * (self.tax_rate / 100)
        self.total = self.subtotal + self.tax_amount
        self.save()
    
    def save(self, *args, **kwargs):
        """Override save to calculate amounts"""
        if not self.pk:  # Only on creation
            self.calculate_amounts()
        super().save(*args, **kwargs)


class InvoiceSequence(models.Model):
    """Manage sequential invoice numbering per organization"""
    
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='invoice_sequence',
        verbose_name='Organisation'
    )
    
    prefix = models.CharField(
        max_length=20,
        default='INV',
        verbose_name='Préfixe'
    )
    
    current_number = models.PositiveIntegerField(
        default=1,
        verbose_name='Numéro actuel'
    )
    
    year = models.PositiveIntegerField(
        default=timezone.now().year,
        verbose_name='Année'
    )
    
    reset_annually = models.BooleanField(
        default=True,
        verbose_name='Réinitialiser annuellement'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoicing_invoice_sequence'
        verbose_name = 'Séquence de facturation'
        verbose_name_plural = 'Séquences de facturation'
        unique_together = ['organization', 'year']
    
    def __str__(self):
        return f"Séquence {self.organization.name} - {self.year}"
    
    @classmethod
    def get_next_number(cls, organization):
        """Get next invoice number for organization"""
        current_year = timezone.now().year
        
        sequence, created = cls.objects.get_or_create(
            organization=organization,
            year=current_year,
            defaults={
                'current_number': 1,
                'prefix': 'INV'
            }
        )
        
        # Reset sequence if it's a new year and reset_annually is True
        if not created and sequence.year != current_year and sequence.reset_annually:
            sequence.year = current_year
            sequence.current_number = 1
        
        # Generate invoice number
        invoice_number = f"{sequence.prefix}-{sequence.year:04d}-{sequence.current_number:06d}"
        
        # Increment sequence
        sequence.current_number += 1
        sequence.save()
        
        return invoice_number


class TaxConfiguration(models.Model):
    """Tax configuration for organizations"""
    
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='tax_configuration',
        verbose_name='Organisation'
    )
    
    default_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('18.00'),
        verbose_name='Taux de TVA par défaut (%)'
    )
    
    tax_enabled = models.BooleanField(
        default=True,
        verbose_name='TVA activée'
    )
    
    tax_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Numéro d\'identification fiscale'
    )
    
    tax_name = models.CharField(
        max_length=50,
        default='TVA',
        verbose_name='Nom de la taxe'
    )
    
    # Tax rates for different categories
    reduced_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Taux réduit (%)'
    )
    
    exempt_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name='Taux exonéré (%)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'invoicing_tax_configuration'
        verbose_name = 'Configuration fiscale'
        verbose_name_plural = 'Configurations fiscales'
    
    def __str__(self):
        return f"Configuration {self.organization.name}"
    
    @classmethod
    def get_for_organization(cls, organization):
        """Get or create tax configuration for organization"""
        config, created = cls.objects.get_or_create(
            organization=organization,
            defaults={
                'default_tax_rate': Decimal('18.00'),
                'tax_enabled': True,
                'tax_name': 'TVA'
            }
        )
        return config
