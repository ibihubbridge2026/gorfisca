from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import AuditLog, JournalEntryAudit, SystemAudit
from apps.accounting.models import JournalEntry
import json


def get_client_ip(request):
    """Extraire l'adresse IP de la requête"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """Extraire le User Agent de la requête"""
    return request.META.get('HTTP_USER_AGENT', '')


def get_session_key(request):
    """Extraire la clé de session de la requête"""
    return getattr(request, 'session', {}).get('session_key', '')


def serialize_model_instance(instance):
    """
    Sérialiser une instance de modèle en dictionnaire JSON-safe
    Gère les types complexes comme Decimal, datetime, etc.
    """
    from decimal import Decimal
    
    if instance is None:
        return {}
    
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        
        # Gérer les types spéciaux
        if isinstance(value, Decimal):
            data[field.name] = float(value)
        elif hasattr(value, 'isoformat'):  # datetime, date, time
            data[field.name] = value.isoformat()
        elif hasattr(value, '__dict__'):  # Foreign keys
            if value:
                data[field.name] = value.pk
            else:
                data[field.name] = None
        elif isinstance(value, (list, dict)):
            data[field.name] = value
        else:
            data[field.name] = value
    
    return data


def calculate_changes(old_instance, new_instance):
    """
    Calculer les différences entre deux instances de modèle
    Retourne un dictionnaire avec les changements
    """
    changes = {}
    
    if old_instance is None:
        # Création - tous les champs sont des changements
        for field in new_instance._meta.fields:
            field_name = field.name
            if field_name not in ['id', 'created_at', 'updated_at']:
                value = getattr(new_instance, field_name)
                changes[field_name] = {
                    'old': None,
                    'new': str(value) if value is not None else None
                }
    else:
        # Modification - comparer les champs
        for field in new_instance._meta.fields:
            field_name = field.name
            if field_name not in ['id', 'created_at', 'updated_at']:
                old_value = getattr(old_instance, field_name)
                new_value = getattr(new_instance, field_name)
                
                # Normaliser les valeurs pour comparaison
                old_str = str(old_value) if old_value is not None else None
                new_str = str(new_value) if new_value is not None else None
                
                if old_str != new_str:
                    changes[field_name] = {
                        'old': old_str,
                        'new': new_str
                    }
    
    return changes


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    """
    Signal pre_save pour capturer l'état avant modification
    """
    # Ignorer certains modèles pour éviter la récursion
    if sender in [AuditLog, JournalEntryAudit, SystemAudit]:
        return
    
    # Stocker l'instance précédente pour comparaison post_save
    if instance.pk:
        try:
            instance._audit_old_instance = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._audit_old_instance = None
    else:
        instance._audit_old_instance = None


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    """
    Signal post_save pour enregistrer les changements
    """
    # Ignorer certains modèles pour éviter la récursion
    if sender in [AuditLog, JournalEntryAudit, SystemAudit]:
        return
    
    # Récupérer le contexte de la requête (si disponible)
    request = getattr(instance, '_audit_request', None)
    
    # Déterminer l'utilisateur
    user = None
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    elif hasattr(instance, 'created_by') and instance.created_by:
        user = instance.created_by
    elif hasattr(instance, 'updated_by') and instance.updated_by:
        user = instance.updated_by
    
    # Récupérer l'instance précédente
    old_instance = getattr(instance, '_audit_old_instance', None)
    
    # Calculer les changements
    changes = calculate_changes(old_instance, instance)
    
    # Capturer les snapshots
    snapshot_before = serialize_model_instance(old_instance)
    snapshot_after = serialize_model_instance(instance)
    
    # Déterminer le type d'action et la sévérité
    if created:
        action_type = 'create'
        severity = 'low'
    elif changes:
        action_type = 'update'
        # Sévérité plus élevée pour les modifications d'objets critiques
        if sender == JournalEntry:
            severity = 'high'
        else:
            severity = 'medium'
    else:
        return  # Pas de changements significatifs
    
    # Créer le log d'audit
    AuditLog.log_action(
        user=user,
        action_type=action_type,
        content_object=instance,
        changes=changes,
        snapshot_before=snapshot_before,
        snapshot_after=snapshot_after,
        severity=severity,
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_user_agent(request) if request else None,
        session_key=get_session_key(request) if request else None,
        description=f"{action_type.title()} de {instance._meta.verbose_name}: {instance}"
    )


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    """
    Signal post_delete pour enregistrer les suppressions
    """
    # Ignorer certains modèles pour éviter la récursion
    if sender in [AuditLog, JournalEntryAudit, SystemAudit]:
        return
    
    # Récupérer le contexte de la requête
    request = getattr(instance, '_audit_request', None)
    
    # Déterminer l'utilisateur
    user = None
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
    
    # Capturer le snapshot avant suppression
    snapshot_before = serialize_model_instance(instance)
    
    # Créer le log d'audit
    AuditLog.log_action(
        user=user,
        action_type='delete',
        content_object=instance,
        changes={'deleted': True},
        snapshot_before=snapshot_before,
        snapshot_after={},
        severity='high',
        ip_address=get_client_ip(request) if request else None,
        user_agent=get_user_agent(request) if request else None,
        session_key=get_session_key(request) if request else None,
        description=f"Suppression de {instance._meta.verbose_name}: {instance}"
    )


@receiver(post_save, sender=JournalEntry)
def audit_journal_entry(sender, instance, created, **kwargs):
    """
    Audit spécialisé pour les écritures comptables
    """
    # Créer ou mettre à jour l'audit de l'écriture
    audit, created_audit = JournalEntryAudit.objects.get_or_create(
        journal_entry=instance,
        defaults={
            'ohada_compliant': True,
            'validation_errors': []
        }
    )
    
    # Valider la conformité OHADA
    audit.validate_ohada_compliance()


# Middleware pour capturer le contexte de la requête
class AuditMiddleware:
    """
    Middleware pour injecter le contexte de la requête dans les modèles
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Injecter la requête dans les modèles qui seront sauvegardés
        from django.db.models.signals import pre_save
        from django.dispatch import receiver
        
        @receiver(pre_save)
        def add_request_context(sender, instance, **kwargs):
            if hasattr(instance, '_audit_request'):
                return  # Déjà ajouté
            instance._audit_request = request
        
        response = self.get_response(request)
        
        # Logger les actions de connexion/déconnexion
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Vérifier si c'est une nouvelle connexion
            if not hasattr(request, '_audit_logged_in'):
                SystemAudit.objects.create(
                    organization=getattr(request.user, 'organization', None),
                    event_type='login_success',
                    user=request.user,
                    description=f"Connexion de {request.user.email}",
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                    event_data={
                        'username': request.user.username,
                        'email': request.user.email
                    }
                )
                request._audit_logged_in = True
        
        return response
