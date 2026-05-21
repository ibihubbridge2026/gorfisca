from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg, Count, Q
from .models import UserFeedback, FeedbackAggregation
from .serializers import UserFeedbackSerializer, FeedbackAggregationSerializer


class UserFeedbackViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les feedbacks utilisateurs
    """
    serializer_class = UserFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['feedback_type', 'rating', 'suggested_account_code']
    
    def get_queryset(self):
        return UserFeedback.objects.filter(
            organization=self.request.user.organization
        )
    
    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            user=self.request.user
        )
        # Mettre à jour l'agrégation après création
        self._update_aggregation(serializer.instance)
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Endpoint pour analyser les performances des suggestions IA
        """
        queryset = self.get_queryset()
        
        # Statistiques globales
        total_feedbacks = queryset.count()
        avg_rating = queryset.aggregate(avg_rating=Avg('rating'))['avg_rating'] or 0
        
        # Performance par type de feedback
        feedback_types = queryset.values('feedback_type').annotate(
            count=Count('id'),
            avg_rating=Avg('rating')
        ).order_by('-count')
        
        # Performance par compte suggéré
        account_performance = queryset.filter(
            suggested_account_code__isnull=False
        ).values('suggested_account_code', 'suggested_account_label').annotate(
            count=Count('id'),
            avg_rating=Avg('rating'),
            correct_count=Count('id', filter=Q(suggested_account_code=F('actual_account_code')))
        ).order_by('-count')
        
        # Taux de précision global
        correct_suggestions = queryset.filter(
            suggested_account_code=F('actual_account_code')
        ).count()
        accuracy_rate = (correct_suggestions / total_feedbacks * 100) if total_feedbacks > 0 else 0
        
        return Response({
            'total_feedbacks': total_feedbacks,
            'average_rating': round(avg_rating, 2),
            'accuracy_rate': round(accuracy_rate, 2),
            'feedback_types': list(feedback_types),
            'account_performance': list(account_performance),
            'correct_suggestions': correct_suggestions,
            'incorrect_suggestions': total_feedbacks - correct_suggestions
        })
    
    @action(detail=False, methods=['get'])
    def improvement_suggestions(self, request):
        """
        Endpoint pour obtenir les suggestions d'amélioration basées sur les feedbacks
        """
        queryset = self.get_queryset()
        
        # Comptes avec les plus mauvais ratings
        problematic_accounts = queryset.filter(
            rating__lte=2,
            suggested_account_code__isnull=False
        ).values('suggested_account_code', 'suggested_account_label').annotate(
            count=Count('id'),
            avg_rating=Avg('rating')
        ).order_by('avg_rating', '-count')
        
        # Types de feedback problématiques
        problematic_types = queryset.filter(
            rating__lte=2
        ).values('feedback_type').annotate(
            count=Count('id'),
            avg_rating=Avg('rating')
        ).order_by('avg_rating', '-count')
        
        # Suggestions d'amélioration les plus fréquentes
        improvement_text = queryset.filter(
            improvement_suggestion__isnull=False
        ).values_list('improvement_suggestion', flat=True)[:10]
        
        return Response({
            'problematic_accounts': list(problematic_accounts),
            'problematic_types': list(problematic_types),
            'improvement_suggestions': list(improvement_text)
        })
    
    def _update_aggregation(self, feedback):
        """
        Met à jour l'agrégation des feedbacks
        """
        from django.utils import timezone
        from datetime import timedelta
        
        # Période d'agrégation (mois courant)
        today = timezone.now().date()
        period_start = today.replace(day=1)
        period_end = (period_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        # Créer ou mettre à jour l'agrégation
        aggregation, created = FeedbackAggregation.objects.get_or_create(
            organization=feedback.organization,
            feedback_type=feedback.feedback_type,
            account_code=feedback.suggested_account_code or 'unknown',
            period_start=period_start,
            period_end=period_end,
            defaults={
                'total_feedbacks': 1,
                'average_rating': feedback.rating,
                'correct_suggestions': 1 if feedback.suggested_account_code == feedback.actual_account_code else 0,
                'incorrect_suggestions': 0 if feedback.suggested_account_code == feedback.actual_account_code else 1,
            }
        )
        
        if not created:
            # Mettre à jour les statistiques
            feedbacks = UserFeedback.objects.filter(
                organization=feedback.organization,
                feedback_type=feedback.feedback_type,
                suggested_account_code=feedback.suggested_account_code,
                created_at__gte=period_start,
                created_at__lte=period_end
            )
            
            aggregation.total_feedbacks = feedbacks.count()
            aggregation.average_rating = feedbacks.aggregate(avg=Avg('rating'))['avg'] or 0
            aggregation.correct_suggestions = feedbacks.filter(
                suggested_account_code=F('actual_account_code')
            ).count()
            aggregation.incorrect_suggestions = aggregation.total_feedbacks - aggregation.correct_suggestions
            aggregation.save()


class FeedbackAggregationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les agrégations de feedbacks
    """
    serializer_class = FeedbackAggregationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['feedback_type', 'account_code']
    
    def get_queryset(self):
        return FeedbackAggregation.objects.filter(
            organization=self.request.user.organization
        ).order_by('-period_end')
