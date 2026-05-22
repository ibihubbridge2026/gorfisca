from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.organizations.models import Organization
from apps.users.models import User


class BankTransaction(models.Model):
    """Bank transaction for reconciliation"""
    
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('matched', 'Rapprochée'),
        ('flagged', 'Signalée'),
        ('ignored', 'Ignorée'),
    ]
    
    TRANSACTION_TYPE_CHOICES = [
        ('credit', 'Crédit'),
        ('debit', 'Débit'),
    ]
    
    # Core fields
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='bank_transactions',
        verbose_name='Organisation'
    )
    date = models.DateField(verbose_name='Date de transaction')
    description = models.CharField(
        max_length=500, 
        verbose_name='Description',
        help_text='Description de la transaction bancaire'
    )
    amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='Montant'
    )
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPE_CHOICES,
        default='credit',
        verbose_name='Type de transaction'
    )
    reference = models.CharField(
        max_length=100, 
        unique=True,
        verbose_name='Référence',
        help_text='Référence unique de la transaction'
    )
    
    # Status and matching
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Statut'
    )
    journal_line = models.OneToOneField(
        'accounting.JournalLine',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bank_transaction',
        verbose_name='Ligne d\'écriture associée'
    )
    
    # Metadata
    confidence_score = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Score de confiance',
        help_text='Score de confiance du matching automatique (0-100)'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Notes',
        help_text='Notes sur la réconciliation'
    )
    
    # Receipt image
    receipt_image = models.ImageField(
        upload_to='receipts/',
        null=True,
        blank=True,
        verbose_name='Image du reçu',
        help_text='Capture d\'écran du reçu Mobile Money'
    )
    
    # Import tracking
    import_batch_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='ID de lot d\'import',
        help_text='Identifiant du lot d\'import pour traçabilité'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='imported_transactions',
        verbose_name='Importé par'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Date de mise à jour'
    )
    matched_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de rapprochement'
    )
    matched_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_transactions',
        verbose_name='Rapproché par'
    )
    
    class Meta:
        db_table = 'reconciliation_bank_transaction'
        verbose_name = 'Transaction bancaire'
        verbose_name_plural = 'Transactions bancaires'
        ordering = ['-date', 'created_at']
        indexes = [
            models.Index(fields=['organization', 'status']),
            models.Index(fields=['organization', 'date']),
            models.Index(fields=['status', 'date']),
            models.Index(fields=['reference']),
        ]
    
    def __str__(self):
        return f"{self.date} - {self.description} - {self.amount} FCFA"
    
    @property
    def is_matched(self):
        """Check if transaction is matched"""
        return self.status == 'matched' and self.journal_line is not None
    
    def mark_as_matched(self, journal_line, matched_by=None):
        """Mark transaction as matched with journal line"""
        self.status = 'matched'
        self.journal_line = journal_line
        self.matched_by = matched_by
        self.matched_at = timezone.now()
        self.save()
    
    def mark_as_flagged(self, reason, flagged_by=None):
        """Mark transaction as flagged"""
        self.status = 'flagged'
        self.notes = reason
        self.save()


class ReconciliationRule(models.Model):
    """Rules for automatic transaction matching"""
    
    RULE_TYPE_CHOICES = [
        ('amount_exact', 'Montant exact'),
        ('amount_range', 'Plage de montant'),
        ('description_contains', 'Description contient'),
        ('reference_contains', 'Référence contient'),
        ('date_range', 'Plage de dates'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='reconciliation_rules',
        verbose_name='Organisation'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='Nom de la règle'
    )
    rule_type = models.CharField(
        max_length=20,
        choices=RULE_TYPE_CHOICES,
        verbose_name='Type de règle'
    )
    
    # Rule parameters (JSON field for flexibility)
    parameters = models.JSONField(
        default=dict,
        verbose_name='Paramètres',
        help_text='Paramètres de la règle au format JSON'
    )
    
    # Target account for matching
    target_account = models.ForeignKey(
        'accounting.Account',
        on_delete=models.CASCADE,
        verbose_name='Compte cible',
        help_text='Compte vers lequel matcher les transactions'
    )
    
    # Rule metadata
    is_active = models.BooleanField(default=True, verbose_name='Active')
    priority = models.IntegerField(
        default=100,
        verbose_name='Priorité',
        help_text='Priorité de la règle (plus petit = plus prioritaire)'
    )
    confidence_boost = models.IntegerField(
        default=10,
        validators=[MinValueValidator(0), MaxValueValidator(50)],
        verbose_name='Bonus de confiance',
        help_text='Bonus de confiance ajouté si la règle correspond'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reconciliation_rule'
        verbose_name = 'Règle de réconciliation'
        verbose_name_plural = 'Règles de réconciliation'
        ordering = ['priority', 'name']
        unique_together = ['organization', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.target_account.code}"


class ImportBatch(models.Model):
    """Track import batches for transactions"""
    
    STATUS_CHOICES = [
        ('pending', 'En cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='import_batches',
        verbose_name='Organisation'
    )
    batch_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='ID du lot'
    )
    filename = models.CharField(
        max_length=255,
        verbose_name='Nom du fichier'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='Statut'
    )
    
    # Import statistics
    total_rows = models.IntegerField(default=0, verbose_name='Total lignes')
    imported_rows = models.IntegerField(default=0, verbose_name='Lignes importées')
    failed_rows = models.IntegerField(default=0, verbose_name='Lignes échouées')
    
    # Error tracking
    error_message = models.TextField(
        blank=True,
        verbose_name='Message d\'erreur'
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Importé par'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'reconciliation_import_batch'
        verbose_name = 'Lot d\'import'
        verbose_name_plural = 'Lots d\'import'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.batch_id} - {self.filename}"
