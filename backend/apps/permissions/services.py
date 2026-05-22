from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.models import Permission
from .models import Role, UserRole, Policy, PermissionCache


class PermissionService:
    """
    Service centralisé pour la gestion des permissions
    """
    
    CACHE_TTL = 900  # 15 minutes
    
    @classmethod
    def get_user_roles(cls, user, organization=None):
        """
        Récupérer tous les rôles actifs d'un utilisateur
        """
        if organization is None:
            organization = user.organization
        
        return UserRole.objects.filter(
            user=user,
            role__organization=organization,
            is_active=True
        ).select_related('role')
    
    @classmethod
    def has_role_type(cls, user, role_type, organization=None):
        """
        Vérifier si l'utilisateur a un type de rôle spécifique
        """
        user_roles = cls.get_user_roles(user, organization)
        return any(ur.role.role_type == role_type for ur in user_roles)
    
    @classmethod
    def get_highest_role_level(cls, user, organization=None):
        """
        Récupérer le niveau hiérarchique le plus élevé de l'utilisateur
        """
        user_roles = cls.get_user_roles(user, organization)
        if not user_roles:
            return 0
        
        return max(ur.role.level for ur in user_roles)
    
    @classmethod
    def has_permission(cls, user, permission_codename, resource=None, organization=None):
        """
        Vérifier si l'utilisateur a une permission spécifique
        """
        # Clé de cache
        permission_key = cls._build_permission_key(
            user, permission_codename, resource, organization
        )
        
        # Vérifier le cache d'abord
        cached_result = PermissionCache.get_cached_permission(user, permission_key)
        if cached_result is not None:
            return cached_result
        
        # Évaluer la permission
        has_perm = cls._evaluate_permission(
            user, permission_codename, resource, organization
        )
        
        # Mettre en cache le résultat
        PermissionCache.set_cached_permission(user, permission_key, has_perm, cls.CACHE_TTL)
        
        return has_perm
    
    @classmethod
    def _build_permission_key(cls, user, permission_codename, resource=None, organization=None):
        """
        Construire une clé de cache pour la permission
        """
        key_parts = [
            str(user.id),
            permission_codename,
            str(organization.id if organization else user.organization.id)
        ]
        
        if resource:
            key_parts.append(f"{resource._meta.app_label}.{resource._meta.model_name}")
            key_parts.append(str(resource.id))
        
        return ":".join(key_parts)
    
    @classmethod
    def _evaluate_permission(cls, user, permission_codename, resource=None, organization=None):
        """
        Évaluer une permission en tenant compte des rôles et policies
        """
        if organization is None:
            organization = user.organization
        
        # 1. Vérifier les permissions de base Django
        if user.has_perm(permission_codename):
            return True
        
        # 2. Vérifier les permissions via les rôles
        user_roles = cls.get_user_roles(user, organization)
        for user_role in user_roles:
            if user_role.role.has_permission(permission_codename):
                return True
        
        # 3. Vérifier les policies
        if resource:
            policies = Policy.objects.filter(
                organization=organization,
                is_active=True,
                resource_type=f"{resource._meta.app_label}.{resource._meta.model_name}"
            ).order_by('-priority')
            
            for policy in policies:
                if policy.applies_to(user, resource, permission_codename):
                    if policy.effect == 'deny':
                        return False
                    elif policy.effect == 'allow':
                        return True
                    elif policy.effect == 'conditional':
                        # Pour les policies conditionnelles, une logique plus complexe peut être implémentée
                        return cls._evaluate_conditional_policy(policy, user, resource, permission_codename)
        
        # 4. Vérifier les policies globales
        global_policies = Policy.objects.filter(
            organization=organization,
            is_active=True,
            resource_type='*'
        ).order_by('-priority')
        
        for policy in global_policies:
            if policy.applies_to(user, None, permission_codename):
                if policy.effect == 'deny':
                    return False
                elif policy.effect == 'allow':
                    return True
        
        return False
    
    @classmethod
    def _evaluate_conditional_policy(cls, policy, user, resource, action):
        """
        Évaluer une policy conditionnelle
        """
        conditions = policy.conditions
        
        # Condition sur le niveau hiérarchique
        if 'min_role_level' in conditions:
            user_level = cls.get_highest_role_level(user)
            if user_level < conditions['min_role_level']:
                return False
        
        # Condition sur le montant
        if 'max_amount' in conditions and resource:
            if hasattr(resource, 'total_amount'):
                if resource.total_amount > conditions['max_amount']:
                    return False
            elif hasattr(resource, 'amount'):
                if resource.amount > conditions['max_amount']:
                    return False
        
        # Condition sur le temps
        if 'business_hours_only' in conditions and conditions['business_hours_only']:
            now = timezone.now()
            current_hour = now.hour
            current_weekday = now.weekday()
            
            # Lundi-Vendredi, 9h-17h
            if current_weekday > 4 or current_hour < 9 or current_hour > 17:
                return False
        
        return True
    
    @classmethod
    def can_access_resource(cls, user, resource, action='view'):
        """
        Vérifier si l'utilisateur peut accéder à une ressource
        """
        permission_codename = f"{resource._meta.app_label}.{action}_{resource._meta.model_name}"
        return cls.has_permission(user, permission_codename, resource)
    
    @classmethod
    def can_access_field(cls, user, resource, field_name):
        """
        Vérifier si l'utilisateur peut accéder à un champ spécifique
        """
        # Vérifier les policies de type field_access
        organization = user.organization
        
        policies = Policy.objects.filter(
            organization=organization,
            is_active=True,
            policy_type='field_access',
            resource_type=f"{resource._meta.app_label}.{resource._meta.model_name}"
        ).order_by('-priority')
        
        for policy in policies:
            if field_name in policy.fields and policy.applies_to(user, resource):
                if policy.effect == 'deny':
                    return False
                elif policy.effect == 'allow':
                    return True
        
        # Par défaut, autoriser l'accès
        return True
    
    @classmethod
    def get_accessible_fields(cls, user, resource):
        """
        Récupérer la liste des champs accessibles pour une ressource
        """
        accessible_fields = []
        
        for field in resource._meta.fields:
            if cls.can_access_field(user, resource, field.name):
                accessible_fields.append(field.name)
        
        return accessible_fields
    
    @classmethod
    def assign_role(cls, user, role, assigned_by=None, expires_at=None):
        """
        Assigner un rôle à un utilisateur
        """
        # Vérifier que le rôle appartient à la même organisation
        if role.organization != user.organization:
            raise ValueError("Le rôle n'appartient pas à la même organisation")
        
        # Créer ou mettre à jour l'assignation
        user_role, created = UserRole.objects.update_or_create(
            user=user,
            role=role,
            defaults={
                'assigned_by': assigned_by,
                'expires_at': expires_at,
                'is_active': True
            }
        )
        
        # Invalider le cache de permissions pour cet utilisateur
        cls._invalidate_user_cache(user)
        
        return user_role
    
    @classmethod
    def revoke_role(cls, user, role):
        """
        Révoquer un rôle d'un utilisateur
        """
        try:
            user_role = UserRole.objects.get(user=user, role=role)
            user_role.is_active = False
            user_role.save()
            
            # Invalider le cache de permissions
            cls._invalidate_user_cache(user)
            
            return True
        except UserRole.DoesNotExist:
            return False
    
    @classmethod
    def _invalidate_user_cache(cls, user):
        """
        Invalider le cache de permissions pour un utilisateur
        """
        PermissionCache.objects.filter(user=user).delete()
        
        # Invalider aussi le cache Django si nécessaire
        cache.delete(f"user_permissions_{user.id}")
    
    @classmethod
    def get_permission_summary(cls, user):
        """
        Obtenir un résumé des permissions de l'utilisateur
        """
        organization = user.organization
        
        # Rôles actifs
        user_roles = cls.get_user_roles(user)
        roles_info = []
        for ur in user_roles:
            roles_info.append({
                'role_type': ur.role.role_type,
                'role_name': ur.role.name,
                'level': ur.role.level,
                'expires_at': ur.expires_at.isoformat() if ur.expires_at else None
            })
        
        # Permissions effectives
        effective_permissions = []
        for ur in user_roles:
            for perm in ur.role.permissions.all():
                effective_permissions.append({
                    'codename': perm.codename,
                    'name': perm.name,
                    'content_type': perm.content_type.model
                })
        
        # Policies applicables
        applicable_policies = Policy.objects.filter(
            organization=organization,
            is_active=True
        ).count()
        
        return {
            'user_id': user.id,
            'organization_id': organization.id,
            'roles': roles_info,
            'highest_level': cls.get_highest_role_level(user),
            'effective_permissions': effective_permissions,
            'applicable_policies': applicable_policies,
            'cache_status': PermissionCache.objects.filter(user=user).count()
        }
