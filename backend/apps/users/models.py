from django.contrib.auth.models import AbstractUser
from django.db import models
from apps.organizations.models import Organization


class User(AbstractUser):
    """Custom user model for Gorfisca"""
    
    class UserType(models.TextChoices):
        ADMIN = 'admin', 'Administrateur'
        ACCOUNTANT = 'accountant', 'Comptable'
        MANAGER = 'manager', 'Gestionnaire'
        EMPLOYEE = 'employee', 'Employé'
    
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    user_type = models.CharField(
        max_length=20, 
        choices=UserType.choices, 
        default=UserType.EMPLOYEE
    )
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='users',
        null=True,
        blank=True
    )
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
    
    def __str__(self):
        return f"{self.email} ({self.get_user_type_display()})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def is_organization_admin(self):
        """Check if user is admin of their organization"""
        return self.user_type == self.UserType.ADMIN or self.is_superuser
