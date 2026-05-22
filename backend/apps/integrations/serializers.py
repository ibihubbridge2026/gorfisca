from rest_framework import serializers
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from decimal import Decimal
from .models import IntegrationSource, RawIngestion, NormalizedTransaction
from apps.accounting.serializers import AccountSerializer


class IntegrationSourceSerializer(serializers.ModelSerializer):
    """
    Serializer pour les sources d'intégration
    """
    
    class Meta:
        model = IntegrationSource
        fields = [
            'id', 'name', 'source_type', 'description', 'config',
            'endpoint_url', 'status', 'last_sync_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'last_sync_at']


class RawIngestionSerializer(serializers.ModelSerializer):
    """
    Serializer pour les ingestions brutes
    """
    
    source_name = serializers.CharField(source='source.name', read_only=True)
    source_type = serializers.CharField(source='source.source_type', read_only=True)
    processing_duration = serializers.SerializerMethodField()
    
    class Meta:
        model = RawIngestion
        fields = [
            'id', 'source', 'source_name', 'source_type', 'payload_type',
            'file_name', 'file_size', 'processing_status', 'total_records',
            'processed_records', 'failed_records', 'processing_started_at',
            'processing_completed_at', 'processing_duration', 'created_at'
        ]
        read_only_fields = [
            'id', 'source_fingerprint', 'processing_started_at',
            'processing_completed_at', 'total_records', 'processed_records',
            'failed_records', 'created_at'
        ]
    
    def get_processing_duration(self, obj):
        """Calculer la durée du traitement"""
        if obj.processing_started_at and obj.processing_completed_at:
            duration = obj.processing_completed_at - obj.processing_started_at
            return str(duration)
        return None


class NormalizedTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer pour les transactions normalisées
    """
    
    suggested_debit_account = AccountSerializer(read_only=True)
    suggested_credit_account = AccountSerializer(read_only=True)
    validated_debit_account = AccountSerializer(read_only=True)
    validated_credit_account = AccountSerializer(read_only=True)
    confidence_average = serializers.SerializerMethodField()
    is_ready_for_journal_entry = serializers.ReadOnlyField()
    
    class Meta:
        model = NormalizedTransaction
        fields = [
            'id', 'raw_ingestion', 'original_label', 'original_amount',
            'original_date', 'normalized_label', 'normalized_amount',
            'normalized_date', 'suggested_debit_account', 'suggested_credit_account',
            'validated_debit_account', 'validated_credit_account',
            'debit_confidence_score', 'credit_confidence_score',
            'confidence_average', 'validation_status', 'validated_by',
            'validated_at', 'validation_notes', 'ai_suggestions',
            'is_ready_for_journal_entry', 'created_at'
        ]
        read_only_fields = [
            'id', 'raw_ingestion', 'suggested_debit_account', 'suggested_credit_account',
            'validated_by', 'validated_at', 'created_at'
        ]
    
    def get_confidence_average(self, obj):
        """Calculer le score de confiance moyen"""
        return obj.confidence_average


class NormalizedTransactionValidationSerializer(serializers.Serializer):
    """
    Serializer pour la validation des transactions par l'utilisateur
    """
    
    debit_account_id = serializers.IntegerField(required=True)
    credit_account_id = serializers.IntegerField(required=True)
    validation_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_debit_account_id(self, value):
        """Valider que le compte de débit existe et appartient à l'organisation"""
        try:
            from apps.accounting.models import Account
            account = Account.objects.get(
                id=value,
                organization=self.context['request'].user.organization,
                is_active=True
            )
            return account.id
        except Account.DoesNotExist:
            raise serializers.ValidationError("Le compte de débit spécifié n'existe pas")
    
    def validate_credit_account_id(self, value):
        """Valider que le compte de crédit existe et appartient à l'organisation"""
        try:
            from apps.accounting.models import Account
            account = Account.objects.get(
                id=value,
                organization=self.context['request'].user.organization,
                is_active=True
            )
            return account.id
        except Account.DoesNotExist:
            raise serializers.ValidationError("Le compte de crédit spécifié n'existe pas")


class UploadFileSerializer(serializers.Serializer):
    """
    Serializer pour l'upload de fichiers d'intégration
    """
    
    file = serializers.FileField(required=True)
    source_name = serializers.CharField(max_length=100, required=True)
    source_type = serializers.ChoiceField(
        choices=IntegrationSource.SOURCE_TYPES,
        default='excel'
    )
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_file(self, value: UploadedFile):
        """Valider le fichier uploadé"""
        # Vérifier la taille du fichier (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB
        if value.size > max_size:
            raise serializers.ValidationError("Le fichier est trop volumineux (max 50MB)")
        
        # Vérifier l'extension
        allowed_extensions = ['.xlsx', '.xls', '.csv', '.json']
        file_extension = value.name.lower().split('.')[-1]
        
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Extension de fichier non supportée. Extensions autorisées: {', '.join(allowed_extensions)}"
            )
        
        return value
    
    def validate_source_name(self, value):
        """Valider que le nom de source est unique pour l'organisation"""
        user = self.context['request'].user
        organization = user.organization
        
        if IntegrationSource.objects.filter(
            organization=organization,
            name=value
        ).exists():
            raise serializers.ValidationError("Une source avec ce nom existe déjà")
        
        return value


class IntegrationUploadResultSerializer(serializers.Serializer):
    """
    Serializer pour les résultats d'upload et de traitement
    """
    
    success = serializers.BooleanField()
    raw_ingestion_id = serializers.IntegerField()
    source_type = serializers.CharField()
    stats = serializers.DictField()
    transactions = serializers.ListField(
        child=NormalizedTransactionSerializer(),
        required=False
    )
    errors = serializers.ListField(child=serializers.CharField(), required=False)
    warnings = serializers.ListField(child=serializers.CharField(), required=False)
    processing_time = serializers.CharField(required=False)
    
    def to_representation(self, instance):
        """Personnaliser la représentation pour inclure les transactions si demandé"""
        data = super().to_representation(instance)
        
        # Inclure les transactions seulement si elles sont demandées
        include_transactions = self.context.get('include_transactions', False)
        if not include_transactions and 'transactions' in data:
            data['transactions'] = f"{len(data.get('transactions', []))} transactions traitées"
        
        return data


class BatchTransactionValidationSerializer(serializers.Serializer):
    """
    Serializer pour la validation en lot de transactions
    """
    
    validations = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )
    
    def validate_validations(self, value):
        """Valider la structure des validations en lot"""
        for validation in value:
            if 'transaction_id' not in validation:
                raise serializers.ValidationError("Chaque validation doit contenir un 'transaction_id'")
            
            if 'debit_account_id' not in validation or 'credit_account_id' not in validation:
                raise serializers.ValidationError(
                    "Chaque validation doit contenir 'debit_account_id' et 'credit_account_id'"
                )
        
        return value


class JournalEntryCreationSerializer(serializers.Serializer):
    """
    Serializer pour la création d'écritures comptables à partir des transactions validées
    """
    
    transaction_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    reference_prefix = serializers.CharField(
        max_length=20,
        default='AUTO',
        required=False
    )
    
    def validate_transaction_ids(self, value):
        """Valider que toutes les transactions existent et sont prêtes"""
        user = self.context['request'].user
        organization = user.organization
        
        transactions = NormalizedTransaction.objects.filter(
            id__in=value,
            raw_ingestion__organization=organization,
            validation_status='validated'
        )
        
        if len(transactions) != len(value):
            raise serializers.ValidationError(
                "Certaines transactions n'existent pas ou ne sont pas validées"
            )
        
        # Vérifier que les transactions n'ont pas déjà été traitées
        already_processed = transactions.filter(journal_entry__isnull=False)
        if already_processed.exists():
            raise serializers.ValidationError(
                "Certaines transactions ont déjà été transformées en écritures comptables"
            )
        
        return value


class IntegrationStatsSerializer(serializers.Serializer):
    """
    Serializer pour les statistiques d'intégration
    """
    
    period = serializers.ChoiceField(
        choices=[
            ('today', "Aujourd'hui"),
            ('week', 'Cette semaine'),
            ('month', 'Ce mois'),
            ('year', 'Cette année'),
            ('all', 'Toutes')
        ],
        default='month'
    )
    
    source_type = serializers.ChoiceField(
        choices=IntegrationSource.SOURCE_TYPES,
        required=False,
        allow_blank=True
    )


class IntegrationStatsResponseSerializer(serializers.Serializer):
    """
    Serializer pour la réponse des statistiques d'intégration
    """
    
    total_ingestions = serializers.IntegerField()
    total_transactions = serializers.IntegerField()
    success_rate = serializers.FloatField()
    processing_time_avg = serializers.CharField()
    top_sources = serializers.ListField(child=serializers.DictField())
    daily_stats = serializers.ListField(child=serializers.DictField())
    ai_suggestions_stats = serializers.DictField()
    error_trends = serializers.ListField(child=serializers.DictField())
