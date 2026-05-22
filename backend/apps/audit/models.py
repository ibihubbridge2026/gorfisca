from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import json
from decimal import Decimal
from apps.organizations.models import Organization

User = get_user_model()


class AuditLog(models.Model):
    """
    Modèle principal pour l'audit de tous les changements dans le système
    Enregistre chaque modification avec snapshot avant/après
    """
    
    ACTION_TYPES = [
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('post', 'Validation'),
        ('validate', 'Validation IA'),
        ('reconcile', 'Rapprochement'),
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('export', 'Export'),
        ('import', 'Import'),
    ]
    
    SEVERITY_LEVELS = [
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ]
    
    # Core fields
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        verbose_name='Organisation'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Utilisateur'
    )
    
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        verbose_name='Type d\'action'
    )
    
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS,
        default='medium',
        verbose_name='Niveau de sévérité'
    )
    
    # Object reference (GenericForeignKey pour tracker n'importe quel modèle)
    content_type = models.ForeignKey(
        ContentType,
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
    
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Object information
    object_repr = models.CharField(
        max_length=200,
        verbose_name='Représentation de l\'objet',
        help_text='Représentation textuelle de l\'objet modifié'
    )
    
    # Change tracking
    changes = models.JSONField(
        default=dict,
        verbose_name='Changements',
        help_text='Dictionnaire des changements avec valeurs avant/après'
    )
    
    # Snapshot data (complet avant et après)
    snapshot_before = models.JSONField(
        default=dict,
        verbose_name='Snapshot avant',
        help_text='Snapshot complet de l\'objet avant modification'
    )
    
    snapshot_after = models.JSONField(
        default=dict,
        verbose_name='Snapshot après',
        help_text='Snapshot complet de l\'objet après modification'
    )
    
    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP'
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        verbose_name='Clé de session'
    )
    
    # Additional context
    description = models.TextField(
        blank=True,
        verbose_name='Description',
        help_text='Description détaillée de l\'action'
    )
    
    metadata = models.JSONField(
        default=dict,
        verbose_name='Métadonnées',
        help_text='Informations additionnelles contextuelles'
    )
    
    # Timestamps
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name='Timestamp',
        help_text='Moment exact de l\'action'
    )
    
    duration_ms = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Durée (ms)',
        help_text='Durée de l\'action en millisecondes'
    )
    
    class Meta:
        db_table = 'audit_log'
        verbose_name = 'Log d\'audit'
        verbose_name_plural = 'Logs d\'audit'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action_type', 'timestamp']),
            models.Index(fields=['severity', 'timestamp']),
            models.Index(fields=['content_type', 'object_id']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        return f"{self.action_type} - {self.object_repr} - {self.timestamp}"
    
    @classmethod
    def log_action(cls, user, action_type, content_object=None, changes=None, 
                   snapshot_before=None, snapshot_after=None, severity='medium',
                   ip_address=None, user_agent=None, session_key=None,
                   description=None, metadata=None, duration_ms=None):
        """
        Méthode utilitaire pour enregistrer une action d'audit
        """
        # Déterminer l'organisation
        organization = None
        if user and hasattr(user, 'organization'):
            organization = user.organization
        elif content_object and hasattr(content_object, 'organization'):
            organization = content_object.organization
        
        # Déterminer la représentation de l'objet
        object_repr = str(content_object) if content_object else 'System'
        
        # Créer le log d'audit
        return cls.objects.create(
            organization=organization,
            user=user,
            action_type=action_type,
            severity=severity,
            content_type=ContentType.objects.get_for_model(content_object) if content_object else None,
            object_id=content_object.pk if content_object else None,
            object_repr=object_repr,
            changes=changes or {},
            snapshot_before=snapshot_before or {},
            snapshot_after=snapshot_after or {},
            ip_address=ip_address,
            user_agent=user_agent,
            session_key=session_key,
            description=description,
            metadata=metadata or {},
            duration_ms=duration_ms
        )


class JournalEntryAudit(models.Model):
    """
    Audit spécialisé pour les écritures comptables avec validation OHADA
    """
    
    journal_entry = models.OneToOneField(
        'accounting.JournalEntry',
        on_delete=models.CASCADE,
        related_name='audit_record',
        verbose_name='Écriture comptable'
    )
    
    # Validation OHADA
    ohada_compliant = models.BooleanField(
        default=True,
        verbose_name='Conforme OHADA'
    )
    
    validation_errors = models.JSONField(
        default=list,
        verbose_name='Erreurs de validation',
        help_text='Liste des erreurs de validation OHADA'
    )
    
    # Expert validation
    is_reviewed_by_expert = models.BooleanField(
        default=False,
        verbose_name='Validé par expert-comptable'
    )
    
    expert_reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expert_reviews',
        verbose_name='Expert validateur'
    )
    
    expert_review_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de validation expert'
    )
    
    expert_notes = models.TextField(
        blank=True,
        verbose_name='Notes de l\'expert'
    )
    
    # Blockchain integrity
    hash_verified = models.BooleanField(
        default=True,
        verbose_name='Hash vérifié'
    )
    
    hash_verification_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de vérification du hash'
    )
    
    # Financial controls
    amount_within_threshold = models.BooleanField(
        default=True,
        verbose_name='Montant dans les seuils'
    )
    
    account_codes_valid = models.BooleanField(
        default=True,
        verbose_name='Codes de comptes valides'
    )
    
    date_in_period = models.BooleanField(
        default=True,
        verbose_name='Date dans la période comptable'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'audit_journal_entry'
        verbose_name = 'Audit d\'écriture comptable'
        verbose_name_plural = 'Audits d\'écritures comptables'
        indexes = [
            models.Index(fields=['journal_entry', 'created_at']),
            models.Index(fields=['is_reviewed_by_expert']),
            models.Index(fields=['expert_review_date']),
            models.Index(fields=['ohada_compliant']),
        ]
    
    def __str__(self):
        return f"Audit - {self.journal_entry.reference}"
    
    def validate_ohada_compliance(self):
        """
        Valider la conformité OHADA de l'écriture comptable
        """
        errors = []
        entry = self.journal_entry
        
        # Vérifier l'équilibre Débit/Crédit
        if not entry.is_balanced:
            errors.append("L'écriture n'est pas équilibrée (Débit ≠ Crédit)")
        
        # Vérifier les codes de comptes OHADA
        for line in entry.lines.all():
            if not line.account.code:
                errors.append(f"Ligne {line.id}: Code de compte manquant")
            elif len(line.account.code) < 1:
                errors.append(f"Ligne {line.id}: Code de compte invalide")
            else:
                first_digit = int(line.account.code[0])
                if first_digit not in range(1, 9):
                    errors.append(f"Ligne {line.id}: Classe de compte invalide ({first_digit})")
        
        # Vérifier les montants
        for line in entry.lines.all():
            if line.amount <= 0:
                errors.append(f"Ligne {line.id}: Montant négatif ou nul")
        
        # Vérifier la cohérence des types de comptes
        for line in entry.lines.all():
            if line.line_type == 'debit':
                if line.account.account_type not in ['asset', 'expense']:
                    errors.append(f"Ligne {line.id}: Compte {line.account.code} ne peut pas être débité")
            elif line.line_type == 'credit':
                if line.account.account_type not in ['liability', 'equity', 'revenue']:
                    errors.append(f"Ligne {line.id}: Compte {line.account.code} ne peut pas être crédité")
        
        # Mettre à jour le statut de conformité
        self.ohada_compliant = len(errors) == 0
        self.validation_errors = errors
        self.save(update_fields=['ohada_compliant', 'validation_errors'])
        
        return self.ohada_compliant, errors


class SystemAudit(models.Model):
    """
    Audit des actions système et de sécurité
    """
    
    EVENT_TYPES = [
        ('login_success', 'Connexion réussie'),
        ('login_failed', 'Échec de connexion'),
        ('logout', 'Déconnexion'),
        ('password_change', 'Changement de mot de passe'),
        ('permission_denied', 'Accès refusé'),
        ('suspicious_activity', 'Activité suspecte'),
        ('data_export', 'Export de données'),
        ('data_import', 'Import de données'),
        ('backup_created', 'Sauvegarde créée'),
        ('backup_restored', 'Sauvegarde restaurée'),
        ('system_error', 'Erreur système'),
        ('security_alert', 'Alerte de sécurité'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='system_audits',
        null=True,
        blank=True,
        verbose_name='Organisation'
    )
    
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPES,
        verbose_name='Type d\'événement'
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_audits',
        verbose_name='Utilisateur'
    )
    
    description = models.TextField(verbose_name='Description')
    
    # Request metadata
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP'
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    
    # Additional data
    event_data = models.JSONField(
        default=dict,
        verbose_name='Données de l\'événement'
    )
    
    severity = models.CharField(
        max_length=20,
        choices=AuditLog.SEVERITY_LEVELS,
        default='medium',
        verbose_name='Niveau de sévérité'
    )
    
    resolved = models.BooleanField(
        default=False,
        verbose_name='Résolu'
    )
    
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_system_audits',
        verbose_name='Résolu par'
    )
    
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de résolution'
    )
    
    resolution_notes = models.TextField(
        blank=True,
        verbose_name='Notes de résolution'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_system'
        verbose_name = 'Audit système'
        verbose_name_plural = 'Audits système'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['severity', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['resolved']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.created_at}"
