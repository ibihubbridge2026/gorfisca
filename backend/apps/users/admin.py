from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'full_name', 'user_type', 'organization', 'is_active')
    list_filter = ('user_type', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    ordering = ('email',)
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('phone', 'user_type', 'organization')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('email', 'phone', 'user_type', 'organization')
        }),
    )
