import uuid
from django.db import models
from django.utils import timezone
from apps.users.models import User


class Organization(models.Model):
    """Organization model for multi-tenancy"""
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Actif'
        INACTIVE = 'inactive', 'Inactif'
        SUSPENDED = 'suspended', 'Suspendu'
    
    name = models.CharField(max_length=200, verbose_name='Nom de l\'organisation')
    legal_identifier = models.CharField(
        max_length=50, 
        unique=True, 
        verbose_name='Identifiant légal',
        help_text='Numéro d\'identification fiscale ou registre de commerce'
    )
    address = models.TextField(blank=True, null=True, verbose_name='Adresse')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Téléphone')
    email = models.EmailField(blank=True, null=True, verbose_name='Email')
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.ACTIVE,
        verbose_name='Statut'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Date de modification')
    
    class Meta:
        db_table = 'organizations'
        verbose_name = 'Organisation'
        verbose_name_plural = 'Organisations'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.legal_identifier})"
    
    @property
    def active_users_count(self):
        """Count active users in this organization"""
        return self.users.filter(is_active=True).count()
    
    def is_active(self):
        """Check if organization is active"""
        return self.status == self.Status.ACTIVE


class OrganizationInvitation(models.Model):
    """Model for managing team invitations"""
    
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Administrateur'
        ACCOUNTANT = 'accountant', 'Comptable'
        VIEWER = 'viewer', 'Lecteur'
    
    email = models.EmailField(verbose_name='Email')
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations',
        verbose_name='Organisation'
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        verbose_name='Rôle'
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        verbose_name='Token d\'invitation'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_invitations',
        verbose_name='Invité par'
    )
    is_accepted = models.BooleanField(
        default=False,
        verbose_name='Acceptée'
    )
    accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date d\'acceptation'
    )
    accepted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accepted_invitations',
        verbose_name='Acceptée par'
    )
    expires_at = models.DateTimeField(
        verbose_name='Date d\'expiration'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de création'
    )
    
    class Meta:
        db_table = 'organizations_invitation'
        verbose_name = 'Invitation d\'organisation'
        verbose_name_plural = 'Invitations d\'organisation'
        ordering = ['-created_at']
        unique_together = ['email', 'organization', 'is_accepted']
    
    def __str__(self):
        return f"Invitation pour {self.email} - {self.organization.name}"
    
    def save(self, *args, **kwargs):
        # Set expiration date if not set (7 days from creation)
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        super().save(*args, **kwargs)
    
    def is_expired(self):
        """Check if invitation is expired"""
        return timezone.now() > self.expires_at
    
    def accept(self, user):
        """Accept the invitation"""
        if not self.is_expired() and not self.is_accepted:
            self.is_accepted = True
            self.accepted_by = user
            self.accepted_at = timezone.now()
            self.save()
            return True
        return False
    
    @property
    def status_display(self):
        """Get human-readable status"""
        if self.is_accepted:
            return "Acceptée"
        elif self.is_expired():
            return "Expirée"
        else:
            return "En attente"
