from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from .models import BankTransaction, ReconciliationRule, ImportBatch
from .serializers import (
    BankTransactionSerializer, 
    ReconciliationRuleSerializer, 
    ImportBatchSerializer,
    TransactionMatchSerializer,
    BulkMatchSerializer,
    AutoMatchSerializer
)
from .services import MatchingService, TransactionParserService


class BankTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BankTransaction model.
    Multi-tenancy: Users can only see transactions from their organization.
    """
    
    serializer_class = BankTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'transaction_type']
    search_fields = ['description', 'reference']
    ordering_fields = ['date', 'created_at', 'amount']
    ordering = ['-date', '-created_at']
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return BankTransaction.objects.all()
        return BankTransaction.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization for new transaction"""
        serializer.save(organization=self.request.user.organization, created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def match(self, request, pk=None):
        """Match transaction with journal line"""
        transaction_obj = self.get_object()
        
        if transaction_obj.status == 'matched':
            return Response(
                {'detail': 'Cette transaction est déjà rapprochée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = TransactionMatchSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        journal_line_id = serializer.validated_data['journal_line_id']
        
        try:
            from apps.accounting.models import JournalLine
            journal_line = JournalLine.objects.get(id=journal_line_id)
            
            # Perform reconciliation
            MatchingService.reconcile_transaction(transaction_obj, journal_line, request.user)
            
            response_serializer = self.get_serializer(transaction_obj)
            return Response(response_serializer.data)
            
        except JournalLine.DoesNotExist:
            return Response(
                {'detail': 'Ligne d\'écriture non trouvée.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def unmatch(self, request, pk=None):
        """Unmatch transaction"""
        transaction_obj = self.get_object()
        
        if transaction_obj.status != 'matched':
            return Response(
                {'detail': 'Cette transaction n\'est pas rapprochée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Unmark transaction
                transaction_obj.status = 'pending'
                transaction_obj.journal_line = None
                transaction_obj.matched_by = None
                transaction_obj.matched_at = None
                transaction_obj.confidence_score = 0
                transaction_obj.save()
                
                # Unmark journal line
                if transaction_obj.journal_line:
                    journal_line = transaction_obj.journal_line
                    journal_line.reconciled = False
                    journal_line.reconciled_at = None
                    journal_line.reconciled_by = None
                    journal_line.save()
            
            response_serializer = self.get_serializer(transaction_obj)
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def flag(self, request, pk=None):
        """Flag transaction"""
        transaction_obj = self.get_object()
        reason = request.data.get('reason', 'Signalé manuellement')
        
        transaction_obj.mark_as_flagged(reason, request.user)
        
        response_serializer = self.get_serializer(transaction_obj)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def ignore(self, request, pk=None):
        """Ignore transaction"""
        transaction_obj = self.get_object()
        
        transaction_obj.status = 'ignored'
        transaction_obj.save()
        
        response_serializer = self.get_serializer(transaction_obj)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['get'])
    def potential_matches(self, request, pk=None):
        """Get potential matches for transaction"""
        transaction_obj = self.get_object()
        
        if transaction_obj.status == 'matched':
            return Response({'matches': []})
        
        matches = MatchingService.find_matches_for_transaction(transaction_obj)
        
        matches_data = []
        for journal_line, confidence in matches:
            matches_data.append({
                'journal_line_id': journal_line.id,
                'entry_reference': journal_line.entry.reference,
                'account_code': journal_line.account.code,
                'account_label': journal_line.account.label,
                'amount': journal_line.amount,
                'line_type': journal_line.line_type,
                'confidence_score': confidence,
                'entry_date': journal_line.entry.date,
                'entry_description': journal_line.entry.description
            })
        
        return Response({'matches': matches_data})
    
    @action(detail=False, methods=['post'])
    def bulk_import(self, request):
        """Import transactions from CSV file"""
        if 'file' not in request.FILES:
            return Response(
                {'detail': 'Aucun fichier fourni.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        csv_file = request.FILES['file']
        
        if not csv_file.name.endswith('.csv'):
            return Response(
                {'detail': 'Le fichier doit être au format CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            import_batch = TransactionParserService.parse_csv_file(
                csv_file, 
                request.user.organization, 
                request.user
            )
            
            serializer = ImportBatchSerializer(import_batch)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def auto_match(self, request):
        """Automatically match transactions with high confidence"""
        serializer = AutoMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        confidence_threshold = serializer.validated_data['confidence_threshold']
        limit = serializer.validated_data['limit']
        
        # Get pending transactions and find matches
        pending_transactions = self.get_queryset().filter(status='pending')[:limit]
        matches_made = 0
        
        for transaction_obj in pending_transactions:
            matches = MatchingService.find_matches_for_transaction(transaction_obj)
            
            # Auto-match if confidence meets threshold
            if matches and matches[0][1] >= confidence_threshold:
                journal_line, confidence = matches[0]
                MatchingService.reconcile_transaction(transaction_obj, journal_line, request.user)
                matches_made += 1
        
        return Response({
            'matches_made': matches_made,
            'confidence_threshold': confidence_threshold,
            'transactions_processed': len(pending_transactions)
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get reconciliation statistics"""
        stats = MatchingService.get_reconciliation_stats(request.user.organization)
        return Response(stats)


class ReconciliationRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ReconciliationRule model.
    Multi-tenancy: Users can only see rules from their organization.
    """
    
    serializer_class = ReconciliationRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['rule_type', 'is_active']
    search_fields = ['name']
    ordering_fields = ['priority', 'name', 'created_at']
    ordering = ['priority', 'name']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return ReconciliationRule.objects.all()
        return ReconciliationRule.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization for new rule"""
        serializer.save(organization=self.request.user.organization)


class ImportBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for ImportBatch model (read-only).
    """
    
    serializer_class = ImportBatchSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['filename', 'batch_id']
    ordering_fields = ['created_at', 'completed_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return ImportBatch.objects.all()
        return ImportBatch.objects.filter(organization=user.organization)
