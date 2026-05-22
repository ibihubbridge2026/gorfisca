from django.db import models
from django.contrib.auth.models import Permission, Group
from django.contrib.contenttypes.models import ContentType
from apps.organizations.models import Organization


class Role(models.Model):
    """
    Modèle de rôle avec permissions granulaires par organisation
    """
    
    ROLE_TYPES = [
        ('super_admin', 'Super Administrateur'),
        ('org_admin', 'Administrateur Organisation'),
        ('accountant', 'Comptable'),
        ('senior_accountant', 'Comptable Senior'),
        ('auditor', 'Auditeur'),
        ('expert_accountant', 'Expert-Comptable'),
        ('employee', 'Employé'),
        ('readonly', 'Lecture seule'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='roles',
        verbose_name='Organisation'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom du rôle'
    )
    
    role_type = models.CharField(
        max_length=20,
        choices=ROLE_TYPES,
        verbose_name='Type de rôle'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    permissions = models.ManyToManyField(
        Permission,
        blank=True,
        related_name='custom_roles',
        verbose_name='Permissions'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    # Hiérarchie des rôles
    level = models.IntegerField(
        default=0,
        verbose_name='Niveau hiérarchique',
        help_text='Plus élevé = plus de permissions'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'permissions_role'
        verbose_name = 'Rôle'
        verbose_name_plural = 'Rôles'
        unique_together = ['organization', 'name']
        ordering = ['level', 'name']
        indexes = [
            models.Index(fields=['organization', 'role_type']),
            models.Index(fields=['level']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.organization.name}"
    
    def has_permission(self, permission_codename):
        """
        Vérifier si le rôle a une permission spécifique
        """
        return self.permissions.filter(
            codename=permission_codename
        ).exists()
    
    def add_permission(self, permission_codename):
        """
        Ajouter une permission au rôle
        """
        try:
            permission = Permission.objects.get(codename=permission_codename)
            self.permissions.add(permission)
            return True
        except Permission.DoesNotExist:
            return False


class UserRole(models.Model):
    """
    Association entre utilisateur et rôle avec contexte temporel
    """
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='user_roles',
        verbose_name='Utilisateur'
    )
    
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='role_users',
        verbose_name='Rôle'
    )
    
    assigned_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_roles',
        verbose_name='Assigné par'
    )
    
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Expire le'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name='Notes'
    )
    
    class Meta:
        db_table = 'permissions_user_role'
        verbose_name = 'Rôle utilisateur'
        verbose_name_plural = 'Rôles utilisateurs'
        unique_together = ['user', 'role']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role', 'is_active']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.role.name}"
    
    def is_expired(self):
        """
        Vérifier si l'assignation a expiré
        """
        if self.expires_at is None:
            return False
        from django.utils import timezone
        return timezone.now() > self.expires_at


class Policy(models.Model):
    """
    Policies de contrôle d'accès granulaires
    """
    
    POLICY_TYPES = [
        ('resource_access', 'Accès ressource'),
        ('field_access', 'Accès champ'),
        ('action_permission', 'Permission action'),
        ('time_restriction', 'Restriction temporelle'),
        ('data_filter', 'Filtrage données'),
        ('workflow_approval', 'Validation workflow'),
    ]
    
    EFFECTS = [
        ('allow', 'Autoriser'),
        ('deny', 'Refuser'),
        ('conditional', 'Conditionnel'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='policies',
        verbose_name='Organisation'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nom de la policy'
    )
    
    policy_type = models.CharField(
        max_length=20,
        choices=POLICY_TYPES,
        verbose_name='Type de policy'
    )
    
    effect = models.CharField(
        max_length=20,
        choices=EFFECTS,
        verbose_name='Effet'
    )
    
    # Ressources concernées
    resource_type = models.CharField(
        max_length=50,
        verbose_name='Type de ressource',
        help_text='ex: accounting.JournalEntry, invoicing.Invoice'
    )
    
    resource_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='ID de la ressource'
    )
    
    # Conditions
    conditions = models.JSONField(
        default=dict,
        verbose_name='Conditions',
        help_text='Conditions d\'application de la policy'
    )
    
    # Actions autorisées
    actions = models.JSONField(
        default=list,
        verbose_name='Actions',
        help_text='Liste des actions concernées'
    )
    
    # Champs concernés (pour field_access)
    fields = models.JSONField(
        default=list,
        verbose_name='Champs',
        help_text='Liste des champs concernés'
    )
    
    # Priorité (plus élevé = plus prioritaire)
    priority = models.IntegerField(
        default=100,
        verbose_name='Priorité'
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name='Actif'
    )
    
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_policies',
        verbose_name='Créé par'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'permissions_policy'
        verbose_name = 'Policy'
        verbose_name_plural = 'Policies'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['organization', 'resource_type']),
            models.Index(fields=['policy_type', 'is_active']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.effect}"
    
    def applies_to(self, user, resource=None, action=None):
        """
        Vérifier si la policy s\'applique à un contexte donné
        """
        # Vérifier que la policy est active
        if not self.is_active:
            return False
        
        # Vérifier le type de ressource
        if resource and hasattr(resource, '_meta'):
            if f"{resource._meta.app_label}.{resource._meta.model_name}" != self.resource_type:
                return False
        
        # Vérifier l\'action
        if action and self.actions and action not in self.actions:
            return False
        
        # Évaluer les conditions
        return self._evaluate_conditions(user, resource, action)
    
    def _evaluate_conditions(self, user, resource=None, action=None):
        """
        Évaluer les conditions de la policy
        """
        conditions = self.conditions
        
        # Condition sur le rôle de l\'utilisateur
        if 'roles' in conditions:
            user_roles = UserRole.objects.filter(
                user=user,
                is_active=True
            ).select_related('role')
            
            required_roles = conditions['roles']
            user_role_types = {ur.role.role_type for ur in user_roles}
            
            if not any(role_type in user_role_types for role_type in required_roles):
                return False
        
        # Condition sur l\'organisation
        if 'organization_id' in conditions:
            if user.organization_id != conditions['organization_id']:
                return False
        
        # Condition temporelle
        if 'time_range' in conditions:
            from django.utils import timezone
            now = timezone.now()
            time_range = conditions['time_range']
            
            if 'start_hour' in time_range:
                start_hour = time_range['start_hour']
                end_hour = time_range['end_hour']
                current_hour = now.hour
                
                if not (start_hour <= current_hour <= end_hour):
                    return False
        
        # Condition sur les jours de la semaine
        if 'weekdays' in conditions:
            allowed_weekdays = conditions['weekdays']
            current_weekday = now().weekday()  # 0 = Monday, 6 = Sunday
            
            if current_weekday not in allowed_weekdays:
                return False
        
        # Condition sur la ressource
        if resource and 'resource_conditions' in conditions:
            resource_conditions = conditions['resource_conditions']
            
            # Vérifier le montant
            if 'max_amount' in resource_conditions:
                if hasattr(resource, 'total_amount'):
                    if resource.total_amount > resource_conditions['max_amount']:
                        return False
                elif hasattr(resource, 'amount'):
                    if resource.amount > resource_conditions['max_amount']:
                        return False
            
            # Vérifier le statut
            if 'status' in resource_conditions:
                if hasattr(resource, 'status'):
                    if resource.status not in resource_conditions['status']:
                        return False
        
        return True


class PermissionCache(models.Model):
    """
    Cache des permissions pour optimisation
    """
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='permission_cache'
    )
    
    permission_key = models.CharField(
        max_length=255,
        verbose_name='Clé de permission'
    )
    
    has_permission = models.BooleanField(
        verbose_name='Permission accordée'
    )
    
    expires_at = models.DateTimeField(
        verbose_name='Expire le'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'permissions_cache'
        verbose_name = 'Cache de permission'
        verbose_name_plural = 'Caches de permissions'
        unique_together = ['user', 'permission_key']
        indexes = [
            models.Index(fields=['user', 'expires_at']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.permission_key}"
    
    @classmethod
    def get_cached_permission(cls, user, permission_key):
        """
        Récupérer une permission depuis le cache
        """
        from django.utils import timezone
        
        try:
            cache_entry = cls.objects.get(
                user=user,
                permission_key=permission_key,
                expires_at__gt=timezone.now()
            )
            return cache_entry.has_permission
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def set_cached_permission(cls, user, permission_key, has_permission, ttl_minutes=15):
        """
        Mettre en cache une permission
        """
        from django.utils import timezone
        
        expires_at = timezone.now() + timezone.timedelta(minutes=ttl_minutes)
        
        cls.objects.update_or_create(
            user=user,
            permission_key=permission_key,
            defaults={
                'has_permission': has_permission,
                'expires_at': expires_at
            }
        )
