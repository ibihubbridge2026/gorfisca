from rest_framework import serializers
from .models import AuditLog, JournalEntryAudit, SystemAudit


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer pour les logs d'audit
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'organization', 'user', 'user_email', 'user_name',
            'action_type', 'severity', 'content_type', 'content_type_name',
            'object_id', 'object_repr', 'changes', 'snapshot_before',
            'snapshot_after', 'ip_address', 'user_agent', 'session_key',
            'description', 'metadata', 'timestamp', 'duration_ms'
        ]
        read_only_fields = ['id', 'timestamp']


class JournalEntryAuditSerializer(serializers.ModelSerializer):
    """
    Serializer pour les audits d'écritures comptables
    """
    journal_entry_reference = serializers.CharField(source='journal_entry.reference', read_only=True)
    journal_entry_date = serializers.DateField(source='journal_entry.date', read_only=True)
    journal_entry_amount = serializers.SerializerMethodField()
    expert_reviewer_name = serializers.CharField(source='expert_reviewer.get_full_name', read_only=True)
    
    class Meta:
        model = JournalEntryAudit
        fields = [
            'id', 'journal_entry', 'journal_entry_reference', 'journal_entry_date',
            'journal_entry_amount', 'ohada_compliant', 'validation_errors',
            'is_reviewed_by_expert', 'expert_reviewer', 'expert_reviewer_name',
            'expert_review_date', 'expert_notes', 'hash_verified',
            'hash_verification_date', 'amount_within_threshold',
            'account_codes_valid', 'date_in_period', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_journal_entry_amount(self, obj):
        """Calculer le montant total de l'écriture"""
        return float(obj.journal_entry.total_debit)


class SystemAuditSerializer(serializers.ModelSerializer):
    """
    Serializer pour les audits système
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    resolver_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = SystemAudit
        fields = [
            'id', 'organization', 'event_type', 'user', 'user_email', 'user_name',
            'description', 'ip_address', 'user_agent', 'event_data',
            'severity', 'resolved', 'resolved_by', 'resolver_name',
            'resolved_at', 'resolution_notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
