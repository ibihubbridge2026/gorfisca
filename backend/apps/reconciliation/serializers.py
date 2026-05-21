from rest_framework import serializers
from django.db import transaction
from .models import BankTransaction, ReconciliationRule, ImportBatch
from .services import MatchingService, TransactionParserService


class BankTransactionSerializer(serializers.ModelSerializer):
    """Serializer for BankTransaction model"""
    
    account_name = serializers.CharField(source='journal_line.account.label', read_only=True)
    account_code = serializers.CharField(source='journal_line.account.code', read_only=True)
    entry_reference = serializers.CharField(source='journal_line.entry.reference', read_only=True)
    
    class Meta:
        model = BankTransaction
        fields = [
            'id',
            'date',
            'description',
            'amount',
            'transaction_type',
            'reference',
            'status',
            'journal_line',
            'account_name',
            'account_code',
            'entry_reference',
            'confidence_score',
            'notes',
            'import_batch_id',
            'created_at',
            'updated_at',
            'matched_at',
            'matched_by'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'matched_at',
            'matched_by',
            'confidence_score'
        ]
    
    def validate_reference(self, value):
        """Validate reference uniqueness within organization"""
        if self.instance and self.instance.reference == value:
            return value
        
        organization = self.context['request'].user.organization
        if BankTransaction.objects.filter(organization=organization, reference=value).exists():
            raise serializers.ValidationError("Cette référence existe déjà dans votre organisation.")
        
        return value
    
    def validate_amount(self, value):
        """Validate amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à zéro.")
        return value


class ReconciliationRuleSerializer(serializers.ModelSerializer):
    """Serializer for ReconciliationRule model"""
    
    target_account_name = serializers.CharField(source='target_account.label', read_only=True)
    target_account_code = serializers.CharField(source='target_account.code', read_only=True)
    
    class Meta:
        model = ReconciliationRule
        fields = [
            'id',
            'name',
            'rule_type',
            'parameters',
            'target_account',
            'target_account_name',
            'target_account_code',
            'is_active',
            'priority',
            'confidence_boost',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_parameters(self, value):
        """Validate rule parameters based on rule type"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Les paramètres doivent être au format JSON.")
        
        rule_type = self.initial_data.get('rule_type')
        
        if rule_type == 'amount_exact':
            if 'amount' not in value:
                raise serializers.ValidationError("Le paramètre 'amount' est requis pour ce type de règle.")
        
        elif rule_type == 'amount_range':
            required_params = ['min_amount', 'max_amount']
            for param in required_params:
                if param not in value:
                    raise serializers.ValidationError(f"Le paramètre '{param}' est requis pour ce type de règle.")
        
        elif rule_type in ['description_contains', 'reference_contains']:
            if 'keywords' not in value:
                raise serializers.ValidationError("Le paramètre 'keywords' est requis pour ce type de règle.")
        
        elif rule_type == 'date_range':
            required_params = ['start_date', 'end_date']
            for param in required_params:
                if param not in value:
                    raise serializers.ValidationError(f"Le paramètre '{param}' est requis pour ce type de règle.")
        
        return value


class ImportBatchSerializer(serializers.ModelSerializer):
    """Serializer for ImportBatch model"""
    
    class Meta:
        model = ImportBatch
        fields = [
            'id',
            'batch_id',
            'filename',
            'status',
            'total_rows',
            'imported_rows',
            'failed_rows',
            'error_message',
            'created_at',
            'completed_at'
        ]
        read_only_fields = [
            'id',
            'batch_id',
            'total_rows',
            'imported_rows',
            'failed_rows',
            'error_message',
            'created_at',
            'completed_at'
        ]


class TransactionMatchSerializer(serializers.Serializer):
    """Serializer for transaction matching operations"""
    
    journal_line_id = serializers.IntegerField()
    confidence_score = serializers.IntegerField(read_only=True)
    
    def validate_journal_line_id(self, value):
        """Validate journal line exists and is not reconciled"""
        try:
            from apps.accounting.models import JournalLine
            journal_line = JournalLine.objects.get(
                id=value,
                entry__organization=self.context['request'].user.organization,
                reconciled=False
            )
            return value
        except JournalLine.DoesNotExist:
            raise serializers.ValidationError("Ligne d'écriture non trouvée ou déjà réconciliée.")


class BulkMatchSerializer(serializers.Serializer):
    """Serializer for bulk matching operations"""
    
    matches = serializers.ListField(
        child=TransactionMatchSerializer(),
        min_length=1,
        max_length=100
    )
    
    def validate(self, attrs):
        """Validate all matches are for the same transaction"""
        # Additional validation can be added here
        return attrs


class AutoMatchSerializer(serializers.Serializer):
    """Serializer for auto-matching operations"""
    
    confidence_threshold = serializers.IntegerField(
        default=80,
        min_value=50,
        max_value=100
    )
    limit = serializers.IntegerField(
        default=100,
        min_value=1,
        max_value=1000
    )
