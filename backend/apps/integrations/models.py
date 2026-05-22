import hashlib
import json
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from apps.organizations.models import Organization
from apps.users.models import User
from apps.accounting.models import Account


class IntegrationSource(models.Model):
    """
    Définit les sources d'intégration possibles
    """
    
    SOURCE_TYPES = [
        ('excel', 'Excel/CSV'),
        ('odoo', 'Odoo ERP'),
        ('sage', 'Sage Comptabilité'),
        ('momo', 'Mobile Money'),
        ('bank_api', 'API Bancaire'),
        ('csv_bank', 'CSV Bancaire'),
        ('quickbooks', 'QuickBooks'),
        ('custom_api', 'API Personnalisée'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('inactive', 'Inactif'),
        ('error', 'Erreur'),
        ('syncing', 'Synchronisation'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='integration_sources',
        verbose_name='Organisation'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom de la source'
    )
    
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPES,
        verbose_name='Type de source'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    # Configuration spécifique à la source (JSON)
    config = models.JSONField(
        default=dict,
        verbose_name='Configuration',
        help_text='Configuration spécifique à la source (format JSON)'
    )
    
    # Métadonnées de connexion
    endpoint_url = models.URLField(
        blank=True,
        verbose_name='URL endpoint',
        help_text='URL pour les sources API'
    )
    
    api_key = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Clé API',
        help_text='Clé API pour les sources externes'
    )
    
    # Statut
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='Statut'
    )
    
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Dernière synchronisation'
    )
    
    # Métadonnées
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_integration_sources',
        verbose_name='Créé par'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'integrations_integration_source'
        verbose_name = 'Source d\'intégration'
        verbose_name_plural = 'Sources d\'intégration'
        unique_together = ['organization', 'name']
        ordering = ['name']
        indexes = [
            models.Index(fields=['organization', 'source_type']),
            models.Index(fields=['status']),
            models.Index(fields=['last_sync_at']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.organization.name}"
    
    def clean(self):
        """Valider la configuration selon le type de source"""
        if self.source_type in ['odoo', 'sage', 'bank_api', 'custom_api']:
            if not self.endpoint_url:
                raise ValidationError("L'URL endpoint est requise pour ce type de source")
        
        if self.source_type in ['odoo', 'sage', 'momo', 'bank_api']:
            if not self.api_key:
                raise ValidationError("La clé API est requise pour ce type de source")


class RawIngestion(models.Model):
    """
    Stocke le payload brut avec fingerprint pour éviter les doublons
    """
    
    PROCESSING_STATUS = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
        ('validated', 'Validé'),
        ('rejected', 'Rejeté'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='raw_ingestions',
        verbose_name='Organisation'
    )
    
    source = models.ForeignKey(
        IntegrationSource,
        on_delete=models.CASCADE,
        related_name='raw_ingestions',
        verbose_name='Source'
    )
    
    # Fingerprint pour éviter les doublons
    source_fingerprint = models.CharField(
        max_length=64,
        unique=True,
        verbose_name='Fingerprint source',
        help_text='Hash SHA-256 du payload brut pour éviter les doublons'
    )
    
    # Payload brut
    payload_type = models.CharField(
        max_length=20,
        choices=[
            ('json', 'JSON'),
            ('file', 'Fichier'),
            ('text', 'Texte'),
        ],
        verbose_name='Type de payload'
    )
    
    # Pour les fichiers
    file = models.FileField(
        upload_to='integrations/raw/%Y/%m/',
        null=True,
        blank=True,
        verbose_name='Fichier'
    )
    
    file_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Nom du fichier'
    )
    
    file_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Taille du fichier (octets)'
    )
    
    # Pour les payloads JSON/texte
    raw_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Données brutes',
        help_text='Payload JSON brut'
    )
    
    raw_text = models.TextField(
        blank=True,
        verbose_name='Texte brut'
    )
    
    # Métadonnées de traitement
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS,
        default='pending',
        verbose_name='Statut de traitement'
    )
    
    processing_started_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Début du traitement'
    )
    
    processing_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fin du traitement'
    )
    
    # Statistiques
    total_records = models.PositiveIntegerField(
        default=0,
        verbose_name='Total des enregistrements'
    )
    
    processed_records = models.PositiveIntegerField(
        default=0,
        verbose_name='Enregistrements traités'
    )
    
    failed_records = models.PositiveIntegerField(
        default=0,
        verbose_name='Enregistrements échoués'
    )
    
    # Logs d'erreurs
    error_log = models.JSONField(
        default=list,
        verbose_name='Log des erreurs',
        help_text='Liste des erreurs de traitement'
    )
    
    # Métadonnées
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_raw_ingestions',
        verbose_name='Créé par'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'integrations_raw_ingestion'
        verbose_name = 'Ingestion brute'
        verbose_name_plural = 'Ingestions brutes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'processing_status']),
            models.Index(fields=['source', 'processing_status']),
            models.Index(fields=['source_fingerprint']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Ingestion {self.id} - {self.source.name}"
    
    def calculate_fingerprint(self, data):
        """
        Calculer le fingerprint SHA-256 pour éviter les doublons
        """
        if isinstance(data, str):
            content = data.encode('utf-8')
        elif isinstance(data, dict):
            content = json.dumps(data, sort_keys=True).encode('utf-8')
        else:
            content = str(data).encode('utf-8')
        
        return hashlib.sha256(content).hexdigest()
    
    def start_processing(self):
        """Marquer le début du traitement"""
        self.processing_status = 'processing'
        self.processing_started_at = timezone.now()
        self.save(update_fields=['processing_status', 'processing_started_at'])
    
    def complete_processing(self, total_records, processed_records, failed_records=0):
        """Marquer la fin du traitement"""
        self.processing_status = 'completed'
        self.processing_completed_at = timezone.now()
        self.total_records = total_records
        self.processed_records = processed_records
        self.failed_records = failed_records
        self.save(update_fields=[
            'processing_status', 'processing_completed_at',
            'total_records', 'processed_records', 'failed_records'
        ])
    
    def fail_processing(self, error_message):
        """Marquer l'échec du traitement"""
        self.processing_status = 'failed'
        self.processing_completed_at = timezone.now()
        self.error_log = self.error_log + [{
            'timestamp': timezone.now().isoformat(),
            'message': error_message
        }]
        self.save(update_fields=['processing_status', 'processing_completed_at', 'error_log'])


class NormalizedTransaction(models.Model):
    """
    Modèle pivot intermédiaire avant création de JournalEntry
    """
    
    VALIDATION_STATUS = [
        ('pending', 'En attente'),
        ('validated', 'Validé'),
        ('rejected', 'Rejeté'),
        ('processed', 'Traité'),
    ])
    
    # Liaison avec l'ingestion brute
    raw_ingestion = models.ForeignKey(
        RawIngestion,
        on_delete=models.CASCADE,
        related_name='normalized_transactions',
        verbose_name='Ingestion brute'
    )
    
    # Données originales
    original_label = models.TextField(
        verbose_name='Libellé original',
        help_text='Libellé tel qu\'il apparaît dans la source'
    )
    
    original_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        verbose_name='Montant original'
    )
    
    original_date = models.DateField(
        verbose_name='Date originale'
    )
    
    # Données normalisées
    normalized_label = models.TextField(
        blank=True,
        verbose_name='Libellé normalisé',
        help_text='Libellé après nettoyage et normalisation'
    )
    
    normalized_amount = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        verbose_name='Montant normalisé'
    )
    
    normalized_date = models.DateField(
        verbose_name='Date normalisée'
    )
    
    # Devise de la transaction
    currency = models.ForeignKey(
        'currencies.Currency',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='normalized_transactions',
        verbose_name='Devise',
        help_text='Devise de la transaction (auto-détectée ou spécifiée)'
    )
    
    # Suggestions IA pour les comptes OHADA
    suggested_debit_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_debit_transactions',
        verbose_name='Compte débit suggéré'
    )
    
    suggested_credit_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suggested_credit_transactions',
        verbose_name='Compte crédit suggéré'
    )
    
    # Comptes validés par l'utilisateur
    validated_debit_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_debit_transactions',
        verbose_name='Compte débit validé'
    )
    
    validated_credit_account = models.ForeignKey(
        Account,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_credit_transactions',
        verbose_name='Compte crédit validé'
    )
    
    # Scores de confiance IA
    debit_confidence_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[lambda x: 0 <= x <= 100],
        verbose_name='Score de confiance débit (0-100)'
    )
    
    credit_confidence_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[lambda x: 0 <= x <= 100],
        verbose_name='Score de confiance crédit (0-100)'
    )
    
    # Métadonnées de validation
    validation_status = models.CharField(
        max_length=20,
        choices=VALIDATION_STATUS,
        default='pending',
        verbose_name='Statut de validation'
    )
    
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_transactions',
        verbose_name='Validé par'
    )
    
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de validation'
    )
    
    # Notes et commentaires
    validation_notes = models.TextField(
        blank=True,
        verbose_name='Notes de validation'
    )
    
    ai_suggestions = models.JSONField(
        default=dict,
        verbose_name='Suggestions IA',
        help_text='Suggestions détaillées de l\'IA'
    )
    
    # Mapping vers l'écriture comptable finale
    journal_entry = models.OneToOneField(
        'accounting.JournalEntry',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='normalized_transaction',
        verbose_name='Écriture comptable générée'
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'integrations_normalized_transaction'
        verbose_name = 'Transaction normalisée'
        verbose_name_plural = 'Transactions normalisées'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['raw_ingestion', 'validation_status']),
            models.Index(fields=['validation_status']),
            models.Index(fields=['normalized_date']),
            models.Index(fields=['currency']),
            models.Index(fields=['suggested_debit_account']),
            models.Index(fields=['suggested_credit_account']),
            models.Index(fields=['journal_entry']),
        ]
    
    def __str__(self):
        return f"{self.normalized_label} - {self.normalized_amount}"
    
    def validate_accounts(self, user, debit_account, credit_account, notes=''):
        """
        Valider les comptes suggérés par l'utilisateur
        """
        self.validated_debit_account = debit_account
        self.validated_credit_account = credit_account
        self.validation_status = 'validated'
        self.validated_by = user
        self.validated_at = timezone.now()
        self.validation_notes = notes
        self.save()
    
    def reject_transaction(self, user, reason=''):
        """
        Rejeter la transaction
        """
        self.validation_status = 'rejected'
        self.validated_by = user
        self.validated_at = timezone.now()
        self.validation_notes = reason
        self.save()
    
    def create_journal_entry(self, user, reference=None):
        """
        Créer l'écriture comptable finale
        """
        if not self.validated_debit_account or not self.validated_credit_account:
            raise ValidationError("Les comptes doivent être validés avant de créer l'écriture")
        
        from apps.accounting.models import JournalEntry, JournalLine
        from apps.accounting.serializers_ohada import OHADAJournalEntrySerializer
        
        # Créer l'écriture comptable
        journal_entry = JournalEntry.objects.create(
            organization=self.raw_ingestion.organization,
            reference=reference or f"AUTO-{self.id}",
            date=self.normalized_date,
            description=self.normalized_label,
            created_by=user,
            source='api',
            is_validated=True  # Déjà validée par l'utilisateur
        )
        
        # Créer les lignes
        JournalLine.objects.create(
            entry=journal_entry,
            account=self.validated_debit_account,
            line_type='debit',
            amount=self.normalized_amount,
            description=self.normalized_label
        )
        
        JournalLine.objects.create(
            entry=journal_entry,
            account=self.validated_credit_account,
            line_type='credit',
            amount=self.normalized_amount,
            description=self.normalized_label
        )
        
        # Valider l'écriture
        journal_entry.post(user)
        
        # Mettre à jour la transaction
        self.journal_entry = journal_entry
        self.validation_status = 'processed'
        self.save(update_fields=['journal_entry', 'validation_status'])
        
        return journal_entry
    
    @property
    def is_ready_for_journal_entry(self):
        """Vérifier si la transaction est prête pour être convertie en écriture comptable"""
        return (
            self.validation_status == 'validated' and
            self.validated_debit_account and
            self.validated_credit_account and
            not self.journal_entry
        )
    
    @property
    def confidence_average(self):
        """Score de confiance moyen"""
        if self.debit_confidence_score and self.credit_confidence_score:
            return (self.debit_confidence_score + self.credit_confidence_score) / 2
        return None
