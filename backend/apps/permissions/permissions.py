from rest_framework.permissions import BasePermission
from django.contrib.auth.models import AnonymousUser
from .services import PermissionService


class IsOrganizationMember(BasePermission):
    """
    Permission pour vérifier que l'utilisateur est membre de l'organisation
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return hasattr(request.user, 'organization') and request.user.organization is not None


class HasRoleType(BasePermission):
    """
    Permission pour vérifier que l'utilisateur a un type de rôle spécifique
    """
    
    def __init__(self, required_role_types):
        self.required_role_types = required_role_types if isinstance(required_role_types, list) else [required_role_types]
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return any(PermissionService.has_role_type(request.user, role_type) 
                  for role_type in self.required_role_types)


class IsSuperAdmin(HasRoleType):
    """
    Permission pour les super administrateurs
    """
    
    def __init__(self):
        super().__init__('super_admin')


class IsOrgAdmin(HasRoleType):
    """
    Permission pour les administrateurs d'organisation
    """
    
    def __init__(self):
        super().__init__('org_admin')


class IsExpertAccountant(HasRoleType):
    """
    Permission pour les experts-comptables
    """
    
    def __init__(self):
        super().__init__('expert_accountant')


class IsAccountant(HasRoleType):
    """
    Permission pour les comptables
    """
    
    def __init__(self):
        super().__init__('accountant')


class IsAuditor(HasRoleType):
    """
    Permission pour les auditeurs
    """
    
    def __init__(self):
        super().__init__('auditor')


class IsSeniorAccountant(HasRoleType):
    """
    Permission pour les comptables seniors
    """
    
    def __init__(self):
        super().__init__('senior_accountant')


class HasMinimumRoleLevel(BasePermission):
    """
    Permission pour vérifier que l'utilisateur a un niveau de rôle minimum
    """
    
    def __init__(self, min_level):
        self.min_level = min_level
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_level = PermissionService.get_highest_role_level(request.user)
        return user_level >= self.min_level


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission pour vérifier que l'utilisateur est le propriétaire de la ressource
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier si l'objet a un champ created_by ou user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        return False


class CanAccessResource(BasePermission):
    """
    Permission générique pour vérifier l'accès à une ressource
    """
    
    def __init__(self, action='view'):
        self.action = action
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Pour les actions de liste, vérifier la permission générale
        if hasattr(view, 'model') and view.model:
            permission_codename = f"{view.model._meta.app_label}.{self.action}_{view.model._meta.model_name}"
            return PermissionService.has_permission(request.user, permission_codename)
        
        return True
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return PermissionService.can_access_resource(request.user, obj, self.action)


class CanViewResource(CanAccessResource):
    """
    Permission pour consulter une ressource
    """
    
    def __init__(self):
        super().__init__('view')


class CanChangeResource(CanAccessResource):
    """
    Permission pour modifier une ressource
    """
    
    def __init__(self):
        super().__init__('change')


class CanDeleteResource(CanAccessResource):
    """
    Permission pour supprimer une ressource
    """
    
    def __init__(self):
        super().__init__('delete')


class CanCreateResource(BasePermission):
    """
    Permission pour créer une ressource
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if hasattr(view, 'model') and view.model:
            permission_codename = f"{view.model._meta.app_label}.add_{view.model._meta.model_name}"
            return PermissionService.has_permission(request.user, permission_codename)
        
        return True


class IsInBusinessHours(BasePermission):
    """
    Permission pour vérifier que l'accès se fait pendant les heures de bureau
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        from django.utils import timezone
        now = timezone.now()
        
        # Lundi-Vendredi, 9h-17h
        if now.weekday() > 4:  # Samedi/Dimanche
            return False
        
        if now.hour < 9 or now.hour > 17:
            return False
        
        return True


class HasValidSubscription(BasePermission):
    """
    Permission pour vérifier que l'organisation a un abonnement valide
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        organization = request.user.organization
        
        # Vérifier si l'organisation est active
        if hasattr(organization, 'status') and organization.status != 'active':
            return False
        
        # Vérifier si l'abonnement est valide
        if hasattr(organization, 'subscription'):
            subscription = organization.subscription
            if subscription and hasattr(subscription, 'is_valid'):
                return subscription.is_valid()
        
        return True


class CanAccessSensitiveData(BasePermission):
    """
    Permission pour accéder aux données sensibles
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier les permissions spécifiques aux données sensibles
        sensitive_permissions = [
            'users.view_sensitive_data',
            'accounting.view_confidential_entries',
            'invoicing.view_private_invoices'
        ]
        
        return any(PermissionService.has_permission(request.user, perm) 
                  for perm in sensitive_permissions)


class CanExportData(BasePermission):
    """
    Permission pour exporter des données
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier la permission d'export
        has_export_perm = PermissionService.has_permission(request.user, 'core.export_data')
        
        # Vérifier si c'est pendant les heures de bureau (policy par défaut)
        if has_export_perm:
            from django.utils import timezone
            now = timezone.now()
            
            # Lundi-Vendredi, 9h-17h
            if now.weekday() <= 4 and 9 <= now.hour <= 17:
                return True
        
        return False


class CanApproveJournalEntry(BasePermission):
    """
    Permission pour approuver les écritures comptables
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Seuls les experts-comptables peuvent approuver
        return PermissionService.has_role_type(request.user, 'expert_accountant')
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier si l'utilisateur peut approuver cette écriture spécifique
        if hasattr(obj, 'amount') and obj.amount > 1000000:  # 1M XOF
            return PermissionService.has_role_type(request.user, 'expert_accountant')
        
        return PermissionService.has_role_type(request.user, 'senior_accountant')


class CanModifyPostedEntry(BasePermission):
    """
    Permission pour modifier une écriture validée
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Seuls les experts-comptables peuvent modifier les écritures validées
        if hasattr(obj, 'is_posted') and obj.is_posted:
            return PermissionService.has_role_type(request.user, 'expert_accountant')
        
        return True


class IsSameOrganization(BasePermission):
    """
    Permission pour vérifier que l'utilisateur accède aux données de sa propre organisation
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier que l'utilisateur a une organisation
        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier que l'objet appartient à la même organisation
        if hasattr(obj, 'organization'):
            return obj.organization == request.user.organization
        
        # Pour les objets liés à un utilisateur, vérifier l'organisation de l'utilisateur
        if hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
            return obj.user.organization == request.user.organization
        
        return True


class IsSelfOrSameOrganization(BasePermission):
    """
    Permission pour vérifier que l'utilisateur accède à ses propres données 
    ou aux données de sa même organisation
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Accès à ses propres données
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        # Accès aux données de la même organisation
        if hasattr(obj, 'organization') and obj.organization == request.user.organization:
            return True
        
        # Pour les objets utilisateur, vérifier l'organisation
        if hasattr(obj, 'id') and hasattr(request.user, 'id') and obj.id == request.user.id:
            return True
        
        return False


class HasValidSession(BasePermission):
    """
    Permission pour vérifier que la session de l'utilisateur est valide
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier que l'utilisateur n'est pas bloqué
        if hasattr(request.user, 'is_active') and not request.user.is_active:
            return False
        
        # Vérifier que la session n'est pas expirée
        if hasattr(request, 'session') and request.session:
            return True
        
        return False
