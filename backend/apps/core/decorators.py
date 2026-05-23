"""
Décorateurs utilitaires pour Gorfisca
- Audit logging
- Rate limiting avancé
- Validation permissions métier
"""
import functools
import logging
from datetime import datetime
from typing import Optional, Callable, Any, Dict

from django.http import HttpRequest
from rest_framework.exceptions import PermissionDenied, Throttled
from ratelimit import limits, RateLimitException

# Logger d'audit
audit_logger = logging.getLogger('audit')
security_logger = logging.getLogger('security')


def audit_log(action: str, resource_type: str = 'general'):
    """
    Décorateur pour logger les actions importantes
    
    Usage:
        @audit_log(action='CREATE_INVOICE', resource_type='invoice')
        def create_invoice(request, data):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Extraire request et user
            request: Optional[HttpRequest] = None
            for arg in args:
                if isinstance(arg, HttpRequest):
                    request = arg
                    break
            
            user_id = getattr(request.user, 'id', None) if request and hasattr(request, 'user') else None
            user_email = getattr(request.user, 'email', 'anonymous') if request and hasattr(request, 'user') else 'anonymous'
            ip_address = request.META.get('REMOTE_ADDR', 'unknown') if request else 'unknown'
            
            try:
                result = func(*args, **kwargs)
                
                # Log succès
                audit_logger.info(
                    f"{action} successful",
                    extra={
                        'user_id': user_id,
                        'ip': ip_address,
                        'action': action,
                        'resource': resource_type,
                    }
                )
                
                return result
                
            except Exception as e:
                # Log échec
                audit_logger.error(
                    f"{action} failed: {str(e)}",
                    extra={
                        'user_id': user_id,
                        'ip': ip_address,
                        'action': action,
                        'resource': resource_type,
                    }
                )
                raise
        
        return wrapper
    return decorator


def rate_limit_advanced(
    group: str = 'default',
    key: str = 'ip',
    rate: str = '100/hour',
    block: bool = True,
    log_exceeded: bool = True
):
    """
    Décorateur de rate limiting avancé avec logging
    Note: Utilise le middleware django-ratelimit configuré dans settings.py
    
    Args:
        group: Groupe de rate limiting
        key: Clé de limitation ('ip', 'user', etc.)
        rate: Taux (ex: '100/hour', '5/min')
        block: Bloquer la requête si limite dépassée
        log_exceeded: Logger les dépassements
    
    Usage:
        @rate_limit_advanced(group='login', key='user', rate='5/min', log_exceeded=True)
        def login_view(request):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            request: Optional[HttpRequest] = None
            for arg in args:
                if isinstance(arg, HttpRequest):
                    request = arg
                    break
            
            user_id = getattr(request.user, 'id', None) if request and hasattr(request, 'user') else None
            ip_address = request.META.get('REMOTE_ADDR', 'unknown') if request else 'unknown'
            
            # Le rate limiting est géré par le middleware django-ratelimit
            # Ce décorateur sert principalement pour le logging
            
            try:
                return func(*args, **kwargs)
            except RateLimitException:
                if log_exceeded:
                    security_logger.warning(
                        f"Rate limit exceeded for {group}",
                        extra={
                            'user_id': user_id,
                            'ip': ip_address,
                            'action': 'RATE_LIMIT_EXCEEDED',
                            'resource': group,
                        }
                    )
                
                if block:
                    raise Throttled(detail=f"Trop de requêtes. Réessayez plus tard.", wait=60)
                
                raise
        
        return wrapper
    return decorator


def require_organization_permission(permission: str):
    """
    Décorateur pour vérifier les permissions organisationnelles
    
    Usage:
        @require_organization_permission('can_manage_invoices')
        def create_invoice(request, org_id):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            request: Optional[HttpRequest] = None
            for arg in args:
                if isinstance(arg, HttpRequest):
                    request = arg
                    break
            
            if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
                raise PermissionDenied("Utilisateur non authentifié")
            
            # Vérifier permission via le système de permissions Gorfisca
            if not request.user.has_perm(f'reconciliation.{permission}'):
                security_logger.warning(
                    f"Permission denied: {permission}",
                    extra={
                        'user_id': request.user.id,
                        'ip': request.META.get('REMOTE_ADDR', 'unknown'),
                        'action': 'PERMISSION_DENIED',
                        'resource': permission,
                    }
                )
                raise PermissionDenied(f"Permission '{permission}' requise")
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def validate_file_upload(
    allowed_extensions: list = None,
    max_size_mb: int = 10,
    allowed_mime_types: list = None
):
    """
    Décorateur pour valider les fichiers uploadés
    
    Usage:
        @validate_file_upload(
            allowed_extensions=['.csv', '.xlsx'],
            max_size_mb=5,
            allowed_mime_types=['text/csv', 'application/vnd.ms-excel']
        )
        def upload_file(request):
            ...
    """
    if allowed_extensions is None:
        allowed_extensions = ['.csv', '.xlsx', '.xls']
    
    if allowed_mime_types is None:
        allowed_mime_types = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            from django.core.exceptions import ValidationError
            from rest_framework.exceptions import ParseError
            
            request: Optional[HttpRequest] = None
            for arg in args:
                if isinstance(arg, HttpRequest):
                    request = arg
                    break
            
            if not request or 'file' not in request.FILES:
                raise ParseError("Aucun fichier fourni")
            
            uploaded_file = request.FILES['file']
            
            # Validation extension
            file_name = uploaded_file.name.lower()
            if not any(file_name.endswith(ext) for ext in allowed_extensions):
                raise ParseError(
                    f"Type de fichier non autorisé. Extensions acceptées: {', '.join(allowed_extensions)}"
                )
            
            # Validation taille
            max_size_bytes = max_size_mb * 1024 * 1024
            if uploaded_file.size > max_size_bytes:
                raise ParseError(
                    f"Fichier trop volumineux. Taille maximale: {max_size_mb}MB"
                )
            
            # Validation MIME type (si disponible)
            content_type = uploaded_file.content_type
            if content_type and content_type not in allowed_mime_types:
                # Attention: le content_type peut être falsifié, c'est une validation basique
                security_logger.warning(
                    f"Suspicious file type: {content_type}",
                    extra={
                        'user_id': getattr(request.user, 'id', None),
                        'ip': request.META.get('REMOTE_ADDR', 'unknown'),
                        'action': 'SUSPICIOUS_FILE_UPLOAD',
                        'resource': uploaded_file.name,
                    }
                )
            
            return func(*args, **kwargs)
        
        return wrapper
    return decorator
