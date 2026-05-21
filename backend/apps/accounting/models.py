import hashlib
import json
from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal
from apps.organizations.models import Organization


class Account(models.Model):
    """OHADA Chart of Accounts"""
    
    class AccountType(models.TextChoices):
        ASSET = 'asset', 'Actif'
        LIABILITY = 'liability', 'Passif'
        EQUITY = 'equity', 'Capitaux propres'
        REVENUE = 'revenue', 'Produit'
        EXPENSE = 'expense', 'Charge'
        
    class AccountClass(models.IntegerChoices):
        CLASS_1 = 1, 'Classe 1 - Capitaux propres et emprunts'
        CLASS_2 = 2, 'Classe 2 - Immobilisations'
        CLASS_3 = 3, 'Classe 3 - Stocks'
        CLASS_4 = 4, 'Classe 4 - Tiers'
        CLASS_5 = 5, 'Classe 5 - Trésorerie'
        CLASS_6 = 6, 'Classe 6 - Charges'
        CLASS_7 = 7, 'Classe 7 - Produits'
        CLASS_8 = 8, 'Classe 8 - Engagements hors bilan'
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='accounts',
        verbose_name='Organisation'
    )
    code = models.CharField(
        max_length=10,
        verbose_name='Code du compte',
        help_text='Code selon le plan comptable OHADA (ex: 4011)'
    )
    label = models.CharField(
        max_length=200,
        verbose_name='Libellé du compte'
    )
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        verbose_name='Type de compte'
    )
    account_class = models.IntegerField(
        choices=AccountClass.choices,
        verbose_name='Classe de compte'
    )
    is_active = models.BooleanField(default=True, verbose_name='Actif')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name='Compte parent'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')
    
    class Meta:
        db_table = 'accounts'
        verbose_name = 'Compte'
        verbose_name_plural = 'Comptes'
        unique_together = ['organization', 'code']
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.label}"
    
    def clean(self):
        """Validate account code and class consistency"""
        if self.code and len(self.code) >= 1:
            first_digit = int(self.code[0])
            expected_class = first_digit
            if self.account_class != expected_class:
                raise ValidationError({
                    'account_class': f'La classe du compte ({self.account_class}) ne correspond pas au premier chiffre du code ({expected_class})'
                })
    
    def get_balance(self):
        """Calculate account balance"""
        debit_total = self.debit_lines.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        credit_total = self.credit_lines.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        if self.account_type in [self.AccountType.ASSET, self.AccountType.EXPENSE]:
            return debit_total - credit_total
        else:
            return credit_total - debit_total


class JournalEntry(models.Model):
    """Journal entry for double-entry accounting"""
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='journal_entries',
        verbose_name='Organisation'
    )
    reference = models.CharField(
        max_length=50,
        verbose_name='Référence',
        help_text='Numéro de la pièce comptable'
    )
    date = models.DateField(verbose_name='Date de l\'opération')
    description = models.TextField(verbose_name='Description')
    is_posted = models.BooleanField(
        default=False,
        verbose_name='Comptabilisé',
        help_text='Indique si l\'écriture est validée et comptabilisée'
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_entries',
        verbose_name='Créé par'
    )
    posted_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posted_entries',
        verbose_name='Validé par'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    posted_at = models.DateTimeField(null=True, blank=True, verbose_name='Date de validation')
    
    # AI validation fields for human-in-the-loop workflow
    class SourceType(models.TextChoices):
        MANUAL = 'manual', 'Saisie manuelle'
        API = 'api', 'API externe'
        AI_SUGGESTION = 'ai_suggestion', 'Suggestion IA'
    
    source = models.CharField(
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
        verbose_name='Source',
        help_text='Origine de l\'écriture comptable'
    )
    is_validated = models.BooleanField(
        default=True,
        verbose_name='Validée',
        help_text='L\'écriture a été validée par un humain'
    )
    validated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_entries',
        verbose_name='Validé par'
    )
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de validation'
    )
    
    # Blockchain-style immutability fields
    hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        editable=False,
        verbose_name='Hash SHA-256',
        help_text='Hash SHA-256 de l\'écriture pour immuabilité'
    )
    previous_hash = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        editable=False,
        verbose_name='Hash précédent',
        help_text='Hash de l\'écriture précédente dans la chaîne'
    )
    
    class Meta:
        db_table = 'journal_entries'
        verbose_name = 'Écriture comptable'
        verbose_name_plural = 'Écritures comptables'
        unique_together = ['organization', 'reference']
        ordering = ['-date', '-created_at']
    
    def __str__(self):
        return f"{self.reference} - {self.date}"
    
    @property
    def total_debit(self):
        """Calculate total debit amount"""
        return self.lines.filter(line_type='debit').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
    
    @property
    def total_credit(self):
        """Calculate total credit amount"""
        return self.lines.filter(line_type='credit').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
    
    @property
    def is_balanced(self):
        """Check if entry is balanced (debit == credit)"""
        return self.total_debit == self.total_credit
    
    def calculate_hash(self):
        """
        Calculate SHA-256 hash for blockchain-style immutability
        Hash is based on: id, date, organization_id, lines_summary, previous_hash
        """
        # Get lines summary for hashing
        lines_data = []
        for line in self.lines.all().order_by('id'):
            lines_data.append({
                'account_code': line.account.code,
                'line_type': line.line_type,
                'amount': str(line.amount),
                'description': line.description
            })
        
        # Create hash input
        hash_input = {
            'id': self.id,
            'date': str(self.date),
            'organization_id': self.organization_id,
            'reference': self.reference,
            'description': self.description,
            'lines': lines_data,
            'previous_hash': self.previous_hash or 'genesis'
        }
        
        # Generate SHA-256 hash
        hash_string = json.dumps(hash_input, sort_keys=True, default=str)
        return hashlib.sha256(hash_string.encode('utf-8')).hexdigest()
    
    def get_previous_entry_hash(self):
        """Get hash of the last posted entry for this organization"""
        if self.previous_hash:
            return self.previous_hash
        
        # Find the last posted entry before this one
        last_entry = JournalEntry.objects.filter(
            organization=self.organization,
            is_posted=True,
            date__lt=self.date
        ).order_by('-date', '-id').first()
        
        return last_entry.hash if last_entry else None
    
    def post(self, user):
        """Post the journal entry with blockchain-style hashing"""
        if not self.is_balanced:
            raise ValidationError("L\'écriture n\'est pas équilibrée")
        
        # Prevent posting if already posted
        if self.is_posted:
            raise ValidationError("Cette écriture est déjà validée")
        
        # Set previous hash
        self.previous_hash = self.get_previous_entry_hash()
        
        # Set posting metadata
        self.is_posted = True
        self.posted_by = user
        self.posted_at = models.timezone.now()
        
        # Save to get ID if not already saved
        if not self.id:
            self.save()
        
        # Calculate and set current hash
        self.hash = self.calculate_hash()
        
        # Final save with hash
        self.save(update_fields=['is_posted', 'posted_by', 'posted_at', 'previous_hash', 'hash'])
    
    def save(self, *args, **kwargs):
        """Override save to set default validation status based on source"""
        # Set default validation based on source
        if not self.pk:  # New entry
            if self.source == self.SourceType.AI_SUGGESTION:
                self.is_validated = False
            else:
                self.is_validated = True
        
        # Check if this is an update to a posted entry
        if self.pk and self.is_posted:
            # Get the original entry from database
            original = JournalEntry.objects.get(pk=self.pk)
            
            # Prevent modification of critical fields if posted
            protected_fields = ['date', 'description', 'reference', 'organization_id']
            for field in protected_fields:
                if getattr(original, field) != getattr(self, field):
                    raise ValidationError(
                        f"Impossible de modifier le champ '{field}' d'une écriture validée"
                    )
        
        super().save(*args, **kwargs)
    
    def validate_entry(self, user):
        """Validate an AI-suggested entry"""
        if self.source != self.SourceType.AI_SUGGESTION:
            raise ValidationError("Seules les suggestions IA peuvent être validées")
        
        if self.is_validated:
            raise ValidationError("Cette écriture est déjà validée")
        
        self.is_validated = True
        self.validated_by = user
        self.validated_at = models.timezone.now()
        self.save(update_fields=['is_validated', 'validated_by', 'validated_at'])
    
    def get_validation_status(self):
        """Get validation status for display"""
        if self.source == self.SourceType.AI_SUGGESTION:
            if self.is_validated:
                return {
                    'status': 'validated',
                    'label': 'Validée',
                    'color': 'emerald',
                    'icon': 'check-circle'
                }
            else:
                return {
                    'status': 'pending_validation',
                    'label': 'En attente de validation',
                    'color': 'amber',
                    'icon': 'clock'
                }
        else:
            return {
                'status': 'manual',
                'label': 'Saisie manuelle',
                'color': 'blue',
                'icon': 'edit'
            }
    
    def delete(self, *args, **kwargs):
        """Override delete to prevent deletion of posted entries"""
        if self.is_posted:
            raise ValidationError("Impossible de supprimer une écriture validée")
        
        super().delete(*args, **kwargs)


class JournalLine(models.Model):
    """Individual line in a journal entry"""
    
    class LineType(models.TextChoices):
        DEBIT = 'debit', 'Débit'
        CREDIT = 'credit', 'Crédit'
    
    entry = models.ForeignKey(
        JournalEntry,
        on_delete=models.CASCADE,
        related_name='lines',
        verbose_name='Écriture'
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='debit_lines' if False else 'credit_lines',
        verbose_name='Compte'
    )
    line_type = models.CharField(
        max_length=10,
        choices=LineType.choices,
        verbose_name='Type de ligne'
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        verbose_name='Montant'
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description'
    )
    
    # Reconciliation fields
    reconciled = models.BooleanField(
        default=False,
        verbose_name='Rapprochée',
        help_text='Indique si cette ligne a été rapprochée avec une transaction bancaire'
    )
    reconciled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de rapprochement'
    )
    reconciled_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reconciled_lines',
        verbose_name='Rapprochée par'
    )
    
    class Meta:
        db_table = 'journal_lines'
        verbose_name = 'Ligne d\'écriture'
        verbose_name_plural = 'Lignes d\'écriture'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.account.code} - {self.line_type} - {self.amount}"
    
    def clean(self):
        """Validate the journal line"""
        if self.line_type == self.LineType.DEBIT and self.account not in self.entry.organization.accounts.filter(account_type__in=['asset', 'expense']):
            raise ValidationError("Les comptes d'actif et de charges ne peuvent être débités")
        
        if self.line_type == self.LineType.CREDIT and self.account not in self.entry.organization.accounts.filter(account_type__in=['liability', 'equity', 'revenue']):
            raise ValidationError("Les comptes de passif, capitaux propres et produits ne peuvent être crédités")
