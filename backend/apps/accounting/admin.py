from django.contrib import admin
from .models import Account, JournalEntry, JournalLine


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 2
    fields = ('account', 'line_type', 'amount', 'description')
    readonly_fields = ()


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('code', 'label', 'account_type', 'account_class', 'organization', 'is_active')
    list_filter = ('account_type', 'account_class', 'is_active', 'organization')
    search_fields = ('code', 'label')
    ordering = ('code',)
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('organization', 'code', 'label', 'account_type', 'account_class', 'is_active')
        }),
        ('Hiérarchie', {
            'fields': ('parent',)
        }),
        ('Informations système', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('reference', 'date', 'organization', 'total_debit', 'total_credit', 'is_balanced', 'is_posted')
    list_filter = ('is_posted', 'date', 'organization')
    search_fields = ('reference', 'description')
    ordering = ('-date', '-created_at')
    readonly_fields = ('total_debit', 'total_credit', 'is_balanced', 'created_at', 'posted_at')
    inlines = [JournalLineInline]
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('organization', 'reference', 'date', 'description')
        }),
        ('Validation', {
            'fields': ('is_posted', 'created_by', 'posted_by', 'posted_at')
        }),
        ('Résumé', {
            'fields': ('total_debit', 'total_credit', 'is_balanced'),
            'classes': ('collapse',)
        }),
        ('Informations système', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj and obj.is_posted:
            return self.readonly_fields + ('organization', 'reference', 'date')
        return self.readonly_fields


@admin.register(JournalLine)
class JournalLineAdmin(admin.ModelAdmin):
    list_display = ('entry', 'account', 'line_type', 'amount', 'description')
    list_filter = ('line_type', 'entry__organization')
    search_fields = ('account__code', 'account__label', 'description')
    ordering = ('-entry__date', 'id')
    
    fieldsets = (
        ('Informations principales', {
            'fields': ('entry', 'account', 'line_type', 'amount')
        }),
        ('Description', {
            'fields': ('description',)
        }),
    )
