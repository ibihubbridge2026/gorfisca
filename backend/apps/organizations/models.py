from django.db import models


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
