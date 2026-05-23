from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
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
from .matching_engine import MatchingEngineService
from apps.permissions.permissions import IsOrgAdmin, IsAccountant, HasMinimumRoleLevel
class BulkImportThrottle(UserRateThrottle):
    """Rate limiter spécifique pour les imports en masse"""
    scope = 'bulk_import'




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
        """Get potential matches for transaction using AI matching engine"""
        transaction_obj = self.get_object()
        
        if transaction_obj.status == 'matched':
            return Response({'matches': []})
        
        # Use the new AI matching engine
        matches = MatchingEngineService.find_matches_for_transaction(transaction_obj)
        
        # Update transaction confidence score with best match
        if matches:
            transaction_obj.confidence_score = matches[0]['confidence_score']
            transaction_obj.save()
        
        return Response({'matches': matches})
    
    @action(detail=False, methods=['post'], url_path='upload', permission_classes=[permissions.IsAuthenticated])
    @throttle_classes([BulkImportThrottle])
    def bulk_import(self, request):
        """Import transactions from CSV file - SECURED: Auth required"""
        
        # DEBUG: Inspect headers and user
        print("DEBUG HEADERS:", request.META.get('HTTP_AUTHORIZATION'))
        print("DEBUG USER:", request.user)
        print("DEBUG IS AUTHENTICATED:", request.user.is_authenticated)
        
        # Check user role - only admin and accountant can upload
        user_role = getattr(request.user, 'role', 'viewer')
        if user_role not in ['admin', 'accountant']:
            return Response(
                {'detail': 'Vous n\'avez pas les permissions pour importer des fichiers.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        csv_file = request.FILES.get('file')
        receipt_image = request.FILES.get('receipt_image')
        
        # Vérifier qu'au moins un fichier est fourni (CSV ou image)
        if not csv_file and not receipt_image:
            return Response(
                {'detail': 'Veuillez fournir un fichier CSV ou une image de reçu.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Si un fichier CSV est fourni, valider son format
        if csv_file:
            # Check file extension
            if not csv_file.name.lower().endswith(('.csv', '.xlsx', '.xls')):
                return Response(
                    {'detail': 'Le fichier doit être au format CSV ou Excel.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check file size (max 10MB)
            if csv_file.size > 10 * 1024 * 1024:
                return Response(
                    {'detail': 'Le fichier est trop volumineux (max 10MB).'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check receipt image size if provided (max 5MB)
        if receipt_image and receipt_image.size > 5 * 1024 * 1024:
            return Response(
                {'detail': 'L\'image du reçu est trop volumineuse (max 5MB).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Si seulement une image est fournie, créer une transaction simple
            if not csv_file and receipt_image:
                # Créer une transaction avec juste l'image (à traiter manuellement plus tard)
                from .models import BankTransaction
                import uuid
                from django.utils import timezone
                
                transaction = BankTransaction.objects.create(
                    organization=request.user.organization,
                    date=timezone.now().date(),
                    description=f"Reçu Mobile Money - {receipt_image.name}",
                    amount=0,  # À remplir manuellement
                    transaction_type='credit',
                    reference=f"IMG_{timezone.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:12].upper()}",
                    receipt_image=receipt_image,
                    created_by=request.user,
                    import_batch_id=f"IMG_IMPORT_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
                )
                
                return Response({
                    'message': 'Image de reçu importée avec succès. Veuillez compléter les informations de la transaction.',
                    'transaction_id': transaction.id,
                    'image_uploaded': True
                }, status=status.HTTP_201_CREATED)
            
            # Si un CSV est fourni, procéder au parsing normal
            import_batch = TransactionParserService.parse_csv_file(
                csv_file, 
                request.user.organization, 
                request.user,
                receipt_image
            )
            
            serializer = ImportBatchSerializer(import_batch)
            
            # Build detailed status message
            message_parts = []
            if import_batch.imported_rows > 0:
                message_parts.append(f'{import_batch.imported_rows} nouvelles transactions ajoutées')
            if import_batch.skipped_duplicates > 0:
                message_parts.append(f'{import_batch.skipped_duplicates} doublons ignorés')
            if import_batch.failed_rows > 0:
                message_parts.append(f'{import_batch.failed_rows} erreurs')
            
            status_message = 'Importation terminée. ' + ', '.join(message_parts) + '.'
            
            return Response({
                'status': 'completed',
                'batch': serializer.data,
                'imported_rows': import_batch.imported_rows,
                'skipped_duplicates': import_batch.skipped_duplicates,
                'failed_rows': import_batch.failed_rows,
                'total_processed': import_batch.total_rows,
                'message': status_message
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Import error: {e}")  # Log technical error
            return Response(
                {'detail': 'Le format du fichier est incorrect ou incomplet. Veuillez vérifier votre export Mobile Money.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def auto_match(self, request):
        """Automatically match transactions with high confidence using AI engine"""
        # Check user role - only admin and accountant can auto-match
        user_role = getattr(request.user, 'role', 'viewer')
        if user_role not in ['admin', 'accountant']:
            return Response(
                {'detail': 'Seuls les administrateurs et comptables peuvent utiliser le matching automatique.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = AutoMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        confidence_threshold = serializer.validated_data['confidence_threshold']
        
        # Use the AI matching engine for auto-matching
        results = MatchingEngineService.auto_match_transactions(
            request.user.organization,
            confidence_threshold
        )
        
        return Response({
            'matches_made': results['matches_made'],
            'high_confidence_matches': results['high_confidence_matches'],
            'confidence_threshold': confidence_threshold,
            'total_processed': results['total_processed']
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get comprehensive reconciliation statistics using AI engine"""
        # All roles can view stats, but only admin/accountant can see detailed breakdowns
        user_role = getattr(request.user, 'role', 'viewer')
        
        # Get basic stats (available to all roles)
        ai_stats = MatchingEngineService.get_matching_statistics(request.user.organization)
        
        # Add traditional stats for compatibility
        traditional_stats = MatchingService.get_reconciliation_stats(request.user.organization)
        
        # Merge statistics
        merged_stats = {**traditional_stats, **ai_stats}
        
        # Add detailed breakdowns only for admin/accountant
        if user_role in ['admin', 'accountant']:
            merged_stats['detailed_breakdown'] = {
                'high_confidence_rate': (ai_stats['high_confidence_matches'] / ai_stats['total_transactions'] * 100) if ai_stats['total_transactions'] > 0 else 0,
                'medium_confidence_rate': (ai_stats['medium_confidence_matches'] / ai_stats['total_transactions'] * 100) if ai_stats['total_transactions'] > 0 else 0,
                'low_confidence_rate': (ai_stats['low_confidence_matches'] / ai_stats['total_transactions'] * 100) if ai_stats['total_transactions'] > 0 else 0,
            }
        
        return Response(merged_stats)


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
