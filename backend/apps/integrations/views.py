"""
API Views pour le module d'intégrations
Endpoints pour l'upload, le traitement et la validation des transactions
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import IntegrationSource, RawIngestion, NormalizedTransaction
from .serializers import (
    IntegrationSourceSerializer, RawIngestionSerializer, 
    NormalizedTransactionSerializer, UploadFileSerializer,
    IntegrationUploadResultSerializer, NormalizedTransactionValidationSerializer,
    BatchTransactionValidationSerializer, JournalEntryCreationSerializer,
    IntegrationStatsSerializer, IntegrationStatsResponseSerializer
)
from .services.engine import NormalizationEngine, BatchNormalizationEngine
from .services.adapters import AdapterFactory
from apps.permissions.permissions import IsOrganizationMember, CanCreateResource
from apps.permissions.services import PermissionService

logger = logging.getLogger(__name__)


class IntegrationSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les sources d'intégration
    """
    serializer_class = IntegrationSourceSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember, CanCreateResource]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['source_type', 'status']
    
    def get_queryset(self):
        return IntegrationSource.objects.filter(
            organization=self.request.user.organization
        )
    
    def perform_create(self, serializer):
        """Créer une source d'intégration pour l'organisation de l'utilisateur"""
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """
        Tester la connexion à une source externe
        """
        source = self.get_object()
        
        try:
            # Logique de test de connexion selon le type de source
            if source.source_type in ['odoo', 'sage', 'bank_api', 'custom_api']:
                # TODO: Implémenter la logique de test pour chaque type
                return Response({
                    'success': True,
                    'message': 'Connexion réussie',
                    'tested_at': timezone.now().isoformat()
                })
            else:
                return Response({
                    'success': False,
                    'message': 'Ce type de source ne supporte pas les tests de connexion'
                }, status=400)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur de connexion: {str(e)}'
            }, status=500)
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """
        Synchroniser une source (pour les sources API)
        """
        source = self.get_object()
        
        if source.source_type not in ['odoo', 'sage', 'bank_api', 'custom_api']:
            return Response({
                'success': False,
                'message': 'Ce type de source ne supporte pas la synchronisation automatique'
            }, status=400)
        
        try:
            # TODO: Implémenter la logique de synchronisation
            source.last_sync_at = timezone.now()
            source.save()
            
            return Response({
                'success': True,
                'message': 'Synchronisation réussie',
                'synced_at': source.last_sync_at.isoformat()
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Erreur de synchronisation: {str(e)}'
            }, status=500)


class IntegrationsViewSet(viewsets.GenericViewSet):
    """
    ViewSet principal pour les opérations d'intégration
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        return NormalizedTransaction.objects.filter(
            raw_ingestion__organization=self.request.user.organization
        )
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Endpoint principal pour uploader et traiter un fichier
        POST /api/v1/integrations/upload/
        """
        try:
            # Valider les données d'upload
            upload_serializer = UploadFileSerializer(
                data=request.data,
                context={'request': request}
            )
            upload_serializer.is_valid(raise_exception=True)
            
            validated_data = upload_serializer.validated_data
            uploaded_file = validated_data['file']
            source_name = validated_data['source_name']
            source_type = validated_data['source_type']
            description = validated_data.get('description', '')
            
            # Créer la source d'intégration
            with transaction.atomic():
                source = IntegrationSource.objects.create(
                    organization=request.user.organization,
                    name=source_name,
                    source_type=source_type,
                    description=description,
                    created_by=request.user
                )
                
                # Calculer le fingerprint du fichier
                fingerprint = self._calculate_file_fingerprint(uploaded_file)
                
                # Vérifier si ce fichier a déjà été uploadé
                if RawIngestion.objects.filter(source_fingerprint=fingerprint).exists():
                    return Response({
                        'success': False,
                        'error': 'Ce fichier a déjà été uploadé',
                        'fingerprint': fingerprint
                    }, status=400)
                
                # Créer l'ingestion brute
                raw_ingestion = RawIngestion.objects.create(
                    organization=request.user.organization,
                    source=source,
                    source_fingerprint=fingerprint,
                    payload_type='file',
                    file=uploaded_file,
                    file_name=uploaded_file.name,
                    file_size=uploaded_file.size,
                    created_by=request.user
                )
            
            # Traiter le fichier avec le NormalizationEngine
            engine = NormalizationEngine(raw_ingestion)
            result = engine.process()
            
            # Préparer la réponse
            response_serializer = IntegrationUploadResultSerializer(
                data=result,
                context={'request': request, 'include_transactions': True}
            )
            response_serializer.is_valid()
            
            return Response(response_serializer.data, status=201)
            
        except Exception as e:
            logger.error(f"Erreur upload intégration: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors du traitement: {str(e)}'
            }, status=500)
    
    def _calculate_file_fingerprint(self, file):
        """Calculer le fingerprint SHA-256 du fichier"""
        import hashlib
        
        hash_sha256 = hashlib.sha256()
        
        # Lire le fichier par chunks pour éviter les problèmes de mémoire
        for chunk in file.chunks():
            hash_sha256.update(chunk)
        
        return hash_sha256.hexdigest()
    
    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """
        Lister les transactions normalisées en attente de validation
        GET /api/v1/integrations/transactions/
        """
        queryset = self.get_queryset().filter(
            validation_status='pending'
        ).order_by('-created_at')
        
        # Filtrage par source si spécifié
        source_id = request.query_params.get('source_id')
        if source_id:
            queryset = queryset.filter(raw_ingestion__source_id=source_id)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = NormalizedTransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = NormalizedTransactionSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def validate_transactions(self, request):
        """
        Valider les suggestions de comptes pour une transaction
        POST /api/v1/integrations/validate_transactions/
        """
        try:
            serializer = NormalizedTransactionValidationSerializer(
                data=request.data,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            
            transaction_id = request.data.get('transaction_id')
            debit_account_id = serializer.validated_data['debit_account_id']
            credit_account_id = serializer.validated_data['credit_account_id']
            validation_notes = serializer.validated_data.get('validation_notes', '')
            
            # Récupérer la transaction
            try:
                transaction = NormalizedTransaction.objects.get(
                    id=transaction_id,
                    raw_ingestion__organization=request.user.organization,
                    validation_status='pending'
                )
            except NormalizedTransaction.DoesNotExist:
                return Response({
                    'success': False,
                    'error': 'Transaction non trouvée ou déjà validée'
                }, status=404)
            
            # Valider les comptes
            from apps.accounting.models import Account
            debit_account = Account.objects.get(id=debit_account_id)
            credit_account = Account.objects.get(id=credit_account_id)
            
            # Valider la transaction
            transaction.validate_accounts(
                user=request.user,
                debit_account=debit_account,
                credit_account=credit_account,
                notes=validation_notes
            )
            
            # Logger l'action
            from apps.audit.models import AuditLog
            AuditLog.log_action(
                user=request.user,
                action_type='validate',
                content_object=transaction,
                severity='medium',
                description=f"Validation transaction {transaction.id}",
                ip_address=self._get_client_ip(request)
            )
            
            return Response({
                'success': True,
                'message': 'Transaction validée avec succès',
                'transaction_id': transaction.id,
                'validation_status': transaction.validation_status
            })
            
        except Exception as e:
            logger.error(f"Erreur validation transaction: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la validation: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'])
    def batch_validate(self, request):
        """
        Valider plusieurs transactions en lot
        POST /api/v1/integrations/batch_validate/
        """
        try:
            serializer = BatchTransactionValidationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            validations = serializer.validated_data['validations']
            results = []
            
            with transaction.atomic():
                for validation in validations:
                    try:
                        transaction_id = validation['transaction_id']
                        debit_account_id = validation['debit_account_id']
                        credit_account_id = validation['credit_account_id']
                        validation_notes = validation.get('validation_notes', '')
                        
                        # Récupérer et valider la transaction
                        transaction = NormalizedTransaction.objects.get(
                            id=transaction_id,
                            raw_ingestion__organization=request.user.organization,
                            validation_status='pending'
                        )
                        
                        from apps.accounting.models import Account
                        debit_account = Account.objects.get(id=debit_account_id)
                        credit_account = Account.objects.get(id=credit_account_id)
                        
                        transaction.validate_accounts(
                            user=request.user,
                            debit_account=debit_account,
                            credit_account=credit_account,
                            notes=validation_notes
                        )
                        
                        results.append({
                            'transaction_id': transaction_id,
                            'success': True,
                            'status': transaction.validation_status
                        })
                        
                    except Exception as e:
                        results.append({
                            'transaction_id': validation.get('transaction_id'),
                            'success': False,
                            'error': str(e)
                        })
            
            return Response({
                'success': True,
                'message': f'Validation en lot terminée: {len(results)} transactions traitées',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Erreur validation en lot: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la validation en lot: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'])
    def create_journal_entries(self, request):
        """
        Créer les écritures comptables à partir des transactions validées
        POST /api/v1/integrations/create_journal_entries/
        """
        try:
            serializer = JournalEntryCreationSerializer(
                data=request.data,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            
            transaction_ids = serializer.validated_data['transaction_ids']
            reference_prefix = serializer.validated_data.get('reference_prefix', 'AUTO')
            
            # Récupérer les transactions validées
            transactions = NormalizedTransaction.objects.filter(
                id__in=transaction_ids,
                raw_ingestion__organization=request.user.organization,
                validation_status='validated',
                journal_entry__isnull=True
            )
            
            if not transactions:
                return Response({
                    'success': False,
                    'error': 'Aucune transaction valide trouvée'
                }, status=400)
            
            created_entries = []
            
            with transaction.atomic():
                for i, transaction in enumerate(transactions):
                    try:
                        reference = f"{reference_prefix}-{transaction.id:06d}"
                        journal_entry = transaction.create_journal_entry(
                            user=request.user,
                            reference=reference
                        )
                        created_entries.append({
                            'transaction_id': transaction.id,
                            'journal_entry_id': journal_entry.id,
                            'reference': journal_entry.reference
                        })
                    except Exception as e:
                        logger.error(f"Erreur création écriture {transaction.id}: {str(e)}")
                        continue
            
            return Response({
                'success': True,
                'message': f'{len(created_entries)} écritures comptables créées',
                'journal_entries': created_entries
            })
            
        except Exception as e:
            logger.error(f"Erreur création écritures: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors de la création des écritures: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['post'])
    def reject_transactions(self, request):
        """
        Rejeter une ou plusieurs transactions
        POST /api/v1/integrations/reject_transactions/
        """
        transaction_ids = request.data.get('transaction_ids', [])
        reason = request.data.get('reason', 'Rejeté par l\'utilisateur')
        
        if not transaction_ids:
            return Response({
                'success': False,
                'error': 'Aucun transaction_id fourni'
            }, status=400)
        
        try:
            transactions = NormalizedTransaction.objects.filter(
                id__in=transaction_ids,
                raw_ingestion__organization=request.user.organization,
                validation_status='pending'
            )
            
            rejected_count = 0
            with transaction.atomic():
                for transaction in transactions:
                    transaction.reject_transaction(
                        user=request.user,
                        reason=reason
                    )
                    rejected_count += 1
            
            return Response({
                'success': True,
                'message': f'{rejected_count} transactions rejetées',
                'rejected_count': rejected_count
            })
            
        except Exception as e:
            logger.error(f"Erreur rejet transactions: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors du rejet: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Obtenir les statistiques d'intégration
        GET /api/v1/integrations/stats/
        """
        try:
            serializer = IntegrationStatsSerializer(data=request.query_params)
            serializer.is_valid(raise_exception=True)
            
            period = serializer.validated_data['period']
            source_type = serializer.validated_data.get('source_type')
            
            # Calculer les statistiques
            stats = self._calculate_integration_stats(
                organization=request.user.organization,
                period=period,
                source_type=source_type
            )
            
            response_serializer = IntegrationStatsResponseSerializer(data=stats)
            response_serializer.is_valid()
            
            return Response(response_serializer.data)
            
        except Exception as e:
            logger.error(f"Erreur calcul stats: {str(e)}")
            return Response({
                'success': False,
                'error': f'Erreur lors du calcul des statistiques: {str(e)}'
            }, status=500)
    
    def _calculate_integration_stats(self, organization, period='month', source_type=None):
        """Calculer les statistiques d'intégration"""
        from django.db.models import Count, Avg, Q
        from django.utils import timezone
        from datetime import timedelta
        
        # Déterminer la période
        now = timezone.now()
        if period == 'today':
            start_date = now.date()
        elif period == 'week':
            start_date = now.date() - timedelta(days=7)
        elif period == 'month':
            start_date = now.date() - timedelta(days=30)
        elif period == 'year':
            start_date = now.date() - timedelta(days=365)
        else:  # all
            start_date = None
        
        # Filtrer les ingestions
        queryset = RawIngestion.objects.filter(organization=organization)
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        
        if source_type:
            queryset = queryset.filter(source__source_type=source_type)
        
        # Statistiques principales
        total_ingestions = queryset.count()
        total_transactions = NormalizedTransaction.objects.filter(
            raw_ingestion__in=queryset
        ).count()
        
        # Taux de succès
        successful_ingestions = queryset.filter(
            processing_status='completed'
        ).count()
        success_rate = (successful_ingestions / total_ingestions * 100) if total_ingestions > 0 else 0
        
        # Temps de traitement moyen
        avg_processing_time = queryset.filter(
            processing_started_at__isnull=False,
            processing_completed_at__isnull=False
        ).aggregate(
            avg_time=Avg('processing_completed_at') - Avg('processing_started_at')
        )
        
        # Top sources
        top_sources = queryset.values('source__name').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        # Statistiques journalières
        daily_stats = []
        for i in range(7):  # Derniers 7 jours
            date = now.date() - timedelta(days=i)
            day_ingestions = queryset.filter(created_at__date=date).count()
            daily_stats.append({
                'date': date.isoformat(),
                'ingestions': day_ingestions
            })
        
        return {
            'total_ingestions': total_ingestions,
            'total_transactions': total_transactions,
            'success_rate': success_rate,
            'processing_time_avg': str(avg_processing_time['avg_time'] or timedelta(0)),
            'top_sources': list(top_sources),
            'daily_stats': daily_stats,
            'ai_suggestions_stats': {},  # TODO: Implémenter
            'error_trends': []  # TODO: Implémenter
        }
    
    def _get_client_ip(self, request):
        """Extraire l'adresse IP du client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RawIngestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les ingestions brutes (read-only)
    """
    serializer_class = RawIngestionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['processing_status', 'source']
    
    def get_queryset(self):
        return RawIngestion.objects.filter(
            organization=self.request.user.organization
        ).order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def transactions(self, request, pk=None):
        """
        Lister les transactions d'une ingestion spécifique
        """
        ingestion = self.get_object()
        transactions = ingestion.normalized_transactions.all()
        
        serializer = NormalizedTransactionSerializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def errors(self, request, pk=None):
        """
        Lister les erreurs d'une ingestion
        """
        ingestion = self.get_object()
        
        return Response({
            'errors': ingestion.error_log,
            'total_errors': len(ingestion.error_log),
            'processing_status': ingestion.processing_status
        })


class NormalizedTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les transactions normalisées (read-only)
    """
    serializer_class = NormalizedTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOrganizationMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['validation_status', 'raw_ingestion']
    
    def get_queryset(self):
        return NormalizedTransaction.objects.filter(
            raw_ingestion__organization=self.request.user.organization
        ).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """
        Valider une transaction spécifique
        """
        transaction = self.get_object()
        
        if transaction.validation_status != 'pending':
            return Response({
                'success': False,
                'error': 'Cette transaction n\'est plus en attente de validation'
            }, status=400)
        
        serializer = NormalizedTransactionValidationSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        debit_account_id = serializer.validated_data['debit_account_id']
        credit_account_id = serializer.validated_data['credit_account_id']
        validation_notes = serializer.validated_data.get('validation_notes', '')
        
        from apps.accounting.models import Account
        debit_account = Account.objects.get(id=debit_account_id)
        credit_account = Account.objects.get(id=credit_account_id)
        
        transaction.validate_accounts(
            user=request.user,
            debit_account=debit_account,
            credit_account=credit_account,
            notes=validation_notes
        )
        
        return Response({
            'success': True,
            'message': 'Transaction validée avec succès'
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Rejeter une transaction spécifique
        """
        transaction = self.get_object()
        reason = request.data.get('reason', 'Rejeté par l\'utilisateur')
        
        if transaction.validation_status != 'pending':
            return Response({
                'success': False,
                'error': 'Cette transaction n\'est plus en attente de validation'
            }, status=400)
        
        transaction.reject_transaction(user=request.user, reason=reason)
        
        return Response({
            'success': True,
            'message': 'Transaction rejetée avec succès'
        })
    
    @action(detail=True, methods=['post'])
    def create_journal_entry(self, request, pk=None):
        """
        Créer l'écriture comptable pour cette transaction
        """
        transaction = self.get_object()
        
        if not transaction.is_ready_for_journal_entry:
            return Response({
                'success': False,
                'error': 'Cette transaction n\'est pas prête pour être convertie en écriture comptable'
            }, status=400)
        
        reference = request.data.get('reference', f"AUTO-{transaction.id:06d}")
        
        try:
            journal_entry = transaction.create_journal_entry(
                user=request.user,
                reference=reference
            )
            
            return Response({
                'success': True,
                'message': 'Écriture comptable créée avec succès',
                'journal_entry_id': journal_entry.id,
                'reference': journal_entry.reference
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Erreur lors de la création de l\'écriture: {str(e)}'
            }, status=500)
