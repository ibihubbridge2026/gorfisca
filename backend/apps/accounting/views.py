from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db import transaction
from .models import Account, JournalEntry, JournalLine
from .serializers import AccountSerializer, JournalEntrySerializer, JournalLineSerializer
from .services import AccountingService


class AccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Account model.
    Multi-tenancy: Users can only see accounts from their organization.
    """
    
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['account_type', 'account_class', 'is_active']
    search_fields = ['code', 'label']
    ordering_fields = ['code', 'label', 'created_at']
    ordering = ['code']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return Account.objects.all()
        return Account.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization for new account"""
        serializer.save(organization=self.request.user.organization)
    
    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Get trial balance for organization"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        trial_balance = AccountingService.get_trial_balance(
            organization=request.user.organization,
            start_date=start_date,
            end_date=end_date
        )
        
        return Response(trial_balance)
    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Get account balance for specific period"""
        account = self.get_object()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        balance = AccountingService.get_account_balance(
            account=account,
            start_date=start_date,
            end_date=end_date
        )
        
        return Response({'balance': balance})


class JournalEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for JournalEntry model.
    Multi-tenancy: Users can only see entries from their organization.
    """
    
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_posted']
    search_fields = ['reference', 'description']
    ordering_fields = ['date', 'created_at', 'reference']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return JournalEntry.objects.all()
        return JournalEntry.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization and created_by for new entry"""
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    def update(self, request, *args, **kwargs):
        """Override update to prevent modification of posted entries"""
        instance = self.get_object()
        
        if instance.is_posted:
            return Response(
                {'error': 'Impossible de modifier une écriture validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion of posted entries"""
        instance = self.get_object()
        
        if instance.is_posted:
            return Response(
                {'error': 'Impossible de supprimer une écriture validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """Post (validate) a journal entry with blockchain-style hashing"""
        entry = self.get_object()
        
        if entry.is_posted:
            return Response(
                {'detail': 'Cette écriture est déjà validée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Use the model's post method which includes blockchain hashing
                entry.post(request.user)
                serializer = self.get_serializer(entry)
                return Response({
                    'success': True,
                    'entry': serializer.data,
                    'hash': entry.hash,
                    'previous_hash': entry.previous_hash,
                    'message': 'Écriture validée avec succès'
                })
        except Exception as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def validate_ai_entry(self, request, pk=None):
        """Validate an AI-suggested entry (human-in-the-loop)"""
        entry = self.get_object()
        
        if entry.source != entry.SourceType.AI_SUGGESTION:
            return Response(
                {'error': 'Seules les suggestions IA peuvent être validées'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if entry.is_validated:
            return Response(
                {'error': 'Cette écriture est déjà validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                entry.validate_entry(request.user)
                serializer = self.get_serializer(entry)
                return Response({
                    'success': True,
                    'entry': serializer.data,
                    'message': 'Suggestion IA validée avec succès'
                })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def pending_validation(self, request):
        """Get AI-suggested entries pending validation"""
        queryset = self.get_queryset().filter(
            source=JournalEntry.SourceType.AI_SUGGESTION,
            is_validated=False
        ).order_by('-created_at')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def verify_chain(self, request, pk=None):
        """Verify blockchain integrity from this entry backwards"""
        entry = self.get_object()
        
        if not entry.is_posted:
            return Response(
                {'error': 'Cette écriture n\'est pas encore validée'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify chain integrity
        verification_result = self._verify_chain_integrity(entry)
        
        return Response(verification_result)
    
    def _verify_chain_integrity(self, start_entry):
        """Verify blockchain chain integrity from a starting entry"""
        current_entry = start_entry
        verification_steps = []
        is_valid = True
        
        while current_entry:
            # Recalculate hash
            expected_hash = current_entry.calculate_hash()
            
            step_result = {
                'entry_id': current_entry.id,
                'reference': current_entry.reference,
                'date': str(current_entry.date),
                'stored_hash': current_entry.hash,
                'calculated_hash': expected_hash,
                'is_valid': current_entry.hash == expected_hash,
                'previous_hash': current_entry.previous_hash
            }
            
            if current_entry.hash != expected_hash:
                is_valid = False
                step_result['error'] = 'Hash mismatch - data has been tampered'
            
            verification_steps.append(step_result)
            
            # Get previous entry
            if current_entry.previous_hash:
                try:
                    current_entry = JournalEntry.objects.get(
                        hash=current_entry.previous_hash,
                        organization=current_entry.organization
                    )
                except JournalEntry.DoesNotExist:
                    is_valid = False
                    verification_steps.append({
                        'error': f'Previous entry with hash {current_entry.previous_hash} not found',
                        'chain_broken': True
                    })
                    break
            else:
                # Reached genesis entry
                break
        
        return {
            'is_valid': is_valid,
            'verified_entries': len(verification_steps),
            'verification_steps': verification_steps,
            'message': 'Chaîne valide' if is_valid else 'Chaîne corrompue - altération détectée'
        }
    
    @action(detail=False, methods=['get'])
    def unposted(self, request):
        """Get unposted journal entries"""
        queryset = self.get_queryset().filter(is_posted=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class JournalLineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for JournalLine model (read-only).
    Lines are managed through JournalEntry.
    """
    
    serializer_class = JournalLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['line_type', 'entry']
    search_fields = ['description']
    ordering_fields = ['amount', 'created_at']
    ordering = ['created_at']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return JournalLine.objects.all()
        return JournalLine.objects.filter(entry__organization=user.organization)
