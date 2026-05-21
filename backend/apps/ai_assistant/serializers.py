from rest_framework import serializers
from .services import AccountingAgentService


class DocumentAnalysisSerializer(serializers.Serializer):
    """Serializer for document analysis requests"""
    
    text = serializers.CharField(
        max_length=10000,
        required=True,
        help_text="Text extracted from document (OCR or manual)"
    )
    
    file_name = serializers.CharField(
        max_length=255,
        required=False,
        help_text="Original filename for reference"
    )
    
    document_type = serializers.ChoiceField(
        choices=['invoice', 'receipt', 'expense', 'revenue', 'other'],
        default='other',
        help_text="Type of document being analyzed"
    )


class SuggestedJournalEntrySerializer(serializers.Serializer):
    """Serializer for AI-suggested journal entries"""
    
    date = serializers.DateField(required=True)
    description = serializers.CharField(max_length=500, required=True)
    reference = serializers.CharField(max_length=50, required=False)
    lines = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        help_text="List of journal lines suggested by AI"
    )
    is_balanced = serializers.BooleanField(read_only=True)
    total_debit = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_credit = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    confidence = serializers.FloatField(read_only=True)


class DocumentAnalysisResponseSerializer(serializers.Serializer):
    """Response serializer for document analysis"""
    
    success = serializers.BooleanField()
    data = serializers.DictField(required=False)
    error = serializers.CharField(required=False)
    message = serializers.CharField(required=False)
    raw_response = serializers.CharField(required=False)
    confidence = serializers.FloatField(required=False)
