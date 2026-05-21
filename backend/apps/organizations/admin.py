from django.contrib import admin
from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'legal_identifier', 'status', 'active_users_count', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'legal_identifier', 'email')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('name', 'legal_identifier', 'status')
        }),
        ('Coordonnées', {
            'fields': ('address', 'phone', 'email')
        }),
        ('Informations système', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
