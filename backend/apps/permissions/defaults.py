"""
Permissions par défaut pour Gorfisca
Création automatique des rôles et permissions standards
"""

from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from apps.organizations.models import Organization
from .models import Role, Policy


@receiver(post_migrate)
def create_default_permissions(sender, **kwargs):
    """
    Créer les permissions et rôles par défaut après migration
    """
    if sender.name == 'apps.permissions':
        create_default_roles()
        create_default_policies()


def create_default_roles():
    """
    Créer les rôles par défaut pour chaque organisation
    """
    # Définition des rôles avec leurs niveaux hiérarchiques
    default_roles = [
        {
            'role_type': 'super_admin',
            'name': 'Super Administrateur',
            'level': 1000,
            'description': 'Accès complet à toutes les fonctionnalités',
            'permissions': []
        },
        {
            'role_type': 'org_admin',
            'name': 'Administrateur Organisation',
            'level': 800,
            'description': 'Gestion complète de l\'organisation',
            'permissions': []
        },
        {
            'role_type': 'expert_accountant',
            'name': 'Expert-Comptable',
            'level': 700,
            'description': 'Expert-comptable avec pouvoirs de validation',
            'permissions': []
        },
        {
            'role_type': 'senior_accountant',
            'name': 'Comptable Senior',
            'level': 600,
            'description': 'Comptable avec permissions étendues',
            'permissions': []
        },
        {
            'role_type': 'auditor',
            'name': 'Auditeur',
            'level': 500,
            'description': 'Accès en lecture seule et audit',
            'permissions': []
        },
        {
            'role_type': 'accountant',
            'name': 'Comptable',
            'level': 400,
            'description': 'Comptable standard',
            'permissions': []
        },
        {
            'role_type': 'employee',
            'name': 'Employé',
            'level': 200,
            'description': 'Accès limité aux fonctionnalités de base',
            'permissions': []
        },
        {
            'role_type': 'readonly',
            'name': 'Lecture seule',
            'level': 100,
            'description': 'Accès en lecture seule',
            'permissions': []
        },
    ]
    
    # Pour chaque organisation, créer les rôles par défaut
    for organization in Organization.objects.all():
        for role_data in default_roles:
            Role.objects.get_or_create(
                organization=organization,
                role_type=role_data['role_type'],
                defaults={
                    'name': role_data['name'],
                    'level': role_data['level'],
                    'description': role_data['description'],
                }
            )


def create_default_policies():
    """
    Créer les policies de sécurité par défaut
    """
    # Policies de validation des écritures comptables
    accounting_policies = [
        {
            'name': 'Validation Expert Requise',
            'policy_type': 'workflow_approval',
            'effect': 'conditional',
            'resource_type': 'accounting.JournalEntry',
            'actions': ['post'],
            'conditions': {
                'amount_threshold': 1000000,  # 1M XOF
                'roles': ['accountant', 'senior_accountant']
            },
            'priority': 900,
            'description': 'Les écritures > 1M XOF nécessitent validation expert'
        },
        {
            'name': 'Modification Écritures Validées Interdite',
            'policy_type': 'action_permission',
            'effect': 'deny',
            'resource_type': 'accounting.JournalEntry',
            'actions': ['update', 'delete'],
            'conditions': {
                'entry_status': 'posted',
                'roles': ['accountant', 'employee', 'readonly']
            },
            'priority': 950,
            'description': 'Seuls les experts peuvent modifier les écritures validées'
        },
        {
            'name': 'Accès Audit Restreint',
            'policy_type': 'resource_access',
            'effect': 'allow',
            'resource_type': 'audit.AuditLog',
            'actions': ['view'],
            'conditions': {
                'roles': ['expert_accountant', 'org_admin', 'super_admin']
            },
            'priority': 800,
            'description': 'Accès aux logs d\'audit réservé aux experts et admins'
        },
        {
            'name': 'Export Données Sensibles',
            'policy_type': 'action_permission',
            'effect': 'conditional',
            'resource_type': '*',
            'actions': ['export'],
            'conditions': {
                'roles': ['org_admin', 'super_admin'],
                'time_range': {
                    'start_hour': 9,
                    'end_hour': 17
                },
                'weekdays': [0, 1, 2, 3, 4]  # Lundi-Vendredi
            },
            'priority': 700,
            'description': 'Export uniquement par admins pendant heures de bureau'
        },
        {
            'name': 'Suppression Factures Payées Interdite',
            'policy_type': 'action_permission',
            'effect': 'deny',
            'resource_type': 'invoicing.Invoice',
            'actions': ['delete'],
            'conditions': {
                'invoice_status': ['paid'],
                'roles': ['employee', 'accountant', 'senior_accountant']
            },
            'priority': 850,
            'description': 'Impossible de supprimer une facture payée'
        },
        {
            'name': 'Accès Champs Sensibles',
            'policy_type': 'field_access',
            'effect': 'conditional',
            'resource_type': 'users.User',
            'fields': ['salary', 'bank_account', 'personal_data'],
            'conditions': {
                'roles': ['org_admin', 'super_admin', 'expert_accountant']
            },
            'priority': 600,
            'description': 'Accès aux informations sensibles des utilisateurs'
        },
    ]
    
    # Pour chaque organisation, créer les policies par défaut
    for organization in Organization.objects.all():
        for policy_data in accounting_policies:
            Policy.objects.get_or_create(
                organization=organization,
                name=policy_data['name'],
                defaults={
                    'policy_type': policy_data['policy_type'],
                    'effect': policy_data['effect'],
                    'resource_type': policy_data['resource_type'],
                    'actions': policy_data['actions'],
                    'conditions': policy_data['conditions'],
                    'priority': policy_data['priority'],
                    'description': policy_data['description'],
                    'fields': policy_data.get('fields', []),
                }
            )


def assign_default_role(user, organization):
    """
    Assigner un rôle par défaut à un nouvel utilisateur
    """
    # Si c'est le premier utilisateur de l'organisation, le rendre admin
    user_count = organization.users.count()
    if user_count <= 1:
        role = Role.objects.get(
            organization=organization,
            role_type='org_admin'
        )
    else:
        role = Role.objects.get(
            organization=organization,
            role_type='employee'
        )
    
    from .models import UserRole
    UserRole.objects.create(
        user=user,
        role=role,
        assigned_by=user  # Auto-assigné
    )
    
    return role
