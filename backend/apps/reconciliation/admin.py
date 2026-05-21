from django.contrib import admin
from .models import BankTransaction, ReconciliationRule, ImportBatch


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'description', 'amount', 'transaction_type', 
        'reference', 'status', 'organization', 'confidence_score'
    ]
    list_filter = [
        'status', 'transaction_type', 'organization', 'date'
    ]
    search_fields = ['description', 'reference']
    readonly_fields = [
        'created_at', 'updated_at', 'matched_at', 'confidence_score'
    ]
    
    fieldsets = (
        ('Informations générales', {
            'fields': (
                'organization', 'date', 'description', 'amount', 
                'transaction_type', 'reference'
            )
        }),
        ('Réconciliation', {
            'fields': (
                'status', 'journal_line', 'confidence_score', 
                'notes', 'matched_at', 'matched_by'
            )
        }),
        ('Import', {
            'fields': (
                'import_batch_id', 'created_by', 'created_at', 'updated_at'
            )
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)


@admin.register(ReconciliationRule)
class ReconciliationRuleAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'rule_type', 'target_account', 'is_active', 
        'priority', 'confidence_boost', 'organization'
    ]
    list_filter = [
        'rule_type', 'is_active', 'organization'
    ]
    search_fields = ['name', 'target_account__label']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': (
                'organization', 'name', 'rule_type', 'target_account'
            )
        }),
        ('Configuration', {
            'fields': (
                'parameters', 'is_active', 'priority', 'confidence_boost'
            )
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)


@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = [
        'batch_id', 'filename', 'status', 'total_rows', 
        'imported_rows', 'failed_rows', 'organization', 'created_at'
    ]
    list_filter = [
        'status', 'organization', 'created_at'
    ]
    search_fields = ['batch_id', 'filename']
    readonly_fields = [
        'batch_id', 'total_rows', 'imported_rows', 
        'failed_rows', 'error_message', 'created_at', 'completed_at'
    ]
    
    fieldsets = (
        ('Informations générales', {
            'fields': (
                'organization', 'batch_id', 'filename', 'status', 'created_by'
            )
        }),
        ('Statistiques', {
            'fields': (
                'total_rows', 'imported_rows', 'failed_rows'
            )
        }),
        ('Erreurs', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'completed_at'),
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(organization=request.user.organization)
