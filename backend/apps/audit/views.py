from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .models import AuditLog, JournalEntryAudit, SystemAudit
from .serializers import AuditLogSerializer, JournalEntryAuditSerializer, SystemAuditSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour consulter les logs d'audit
    Read-only pour préserver l'intégrité
    """
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['action_type', 'severity', 'user', 'content_type']
    
    def get_queryset(self):
        return AuditLog.objects.filter(
            organization=self.request.user.organization
        )
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Statistiques sur les logs d'audit
        """
        queryset = self.get_queryset()
        
        # Statistiques générales
        total_logs = queryset.count()
        last_24h = queryset.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).count()
        
        # Actions par type
        actions_by_type = queryset.values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Actions par sévérité
        actions_by_severity = queryset.values('severity').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Top utilisateurs
        top_users = queryset.values('user__email', 'user__first_name', 'user__last_name').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Activité récente (dernières 24h)
        recent_activity = queryset.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).order_by('-timestamp')[:20]
        
        return Response({
            'total_logs': total_logs,
            'last_24h_count': last_24h,
            'actions_by_type': list(actions_by_type),
            'actions_by_severity': list(actions_by_severity),
            'top_users': list(top_users),
            'recent_activity': AuditLogSerializer(recent_activity, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def timeline(self, request):
        """
        Timeline des activités pour le dashboard
        """
        queryset = self.get_queryset()
        
        # Filtrer par date si spécifié
        days = int(request.query_params.get('days', 7))
        start_date = timezone.now() - timedelta(days=days)
        
        timeline = queryset.filter(
            timestamp__gte=start_date
        ).order_by('-timestamp')[:50]
        
        return Response({
            'timeline': AuditLogSerializer(timeline, many=True).data,
            'period': f'{days} days',
            'start_date': start_date.isoformat(),
            'end_date': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Recherche dans les logs d'audit
        """
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Query parameter required'}, status=400)
        
        queryset = self.get_queryset()
        
        # Recherche dans plusieurs champs
        results = queryset.filter(
            Q(object_repr__icontains=query) |
            Q(description__icontains=query) |
            Q(user__email__icontains=query) |
            Q(user__first_name__icontains=query) |
            Q(user__last_name__icontains=query)
        ).order_by('-timestamp')[:100]
        
        return Response({
            'query': query,
            'results': AuditLogSerializer(results, many=True).data,
            'count': results.count()
        })


class JournalEntryAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour les audits d'écritures comptables
    """
    serializer_class = JournalEntryAuditSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['ohada_compliant', 'is_reviewed_by_expert']
    
    def get_queryset(self):
        return JournalEntryAudit.objects.filter(
            journal_entry__organization=self.request.user.organization
        ).select_related('journal_entry', 'expert_reviewer')
    
    @action(detail=True, methods=['post'])
    def expert_review(self, request, pk=None):
        """
        Validation par un expert-comptable
        """
        audit = self.get_object()
        
        # Vérifier que l'utilisateur a les permissions d'expert
        if not request.user.has_perm('audit.can_review_journal_entry'):
            return Response(
                {'error': 'Permissions insuffisantes pour valider en tant qu\'expert'},
                status=403
            )
        
        # Marquer comme validé par expert
        audit.is_reviewed_by_expert = True
        audit.expert_reviewer = request.user
        audit.expert_review_date = timezone.now()
        audit.expert_notes = request.data.get('notes', '')
        audit.save()
        
        # Logger l'action
        from .models import AuditLog
        AuditLog.log_action(
            user=request.user,
            action_type='validate',
            content_object=audit.journal_entry,
            severity='high',
            description=f"Validation expert de l'écriture {audit.journal_entry.reference}",
            metadata={'expert_review': True, 'audit_id': audit.id}
        )
        
        return Response(JournalEntryAuditSerializer(audit).data)
    
    @action(detail=False, methods=['get'])
    def compliance_report(self, request):
        """
        Rapport de conformité OHADA
        """
        queryset = self.get_queryset()
        
        # Statistiques de conformité
        total_entries = queryset.count()
        compliant_entries = queryset.filter(ohada_compliant=True).count()
        non_compliant_entries = total_entries - compliant_entries
        
        # Statistiques de validation expert
        expert_reviewed = queryset.filter(is_reviewed_by_expert=True).count()
        
        # Erreurs de validation les plus communes
        common_errors = {}
        for audit in queryset.filter(ohada_compliant=False):
            for error in audit.validation_errors:
                common_errors[error] = common_errors.get(error, 0) + 1
        
        # Trier par fréquence
        sorted_errors = sorted(common_errors.items(), key=lambda x: x[1], reverse=True)
        
        # Écritures nécessitant une attention
        attention_needed = queryset.filter(
            ohada_compliant=False,
            is_reviewed_by_expert=False
        ).order_by('-journal_entry__created_at')[:20]
        
        return Response({
            'total_entries': total_entries,
            'compliant_entries': compliant_entries,
            'non_compliant_entries': non_compliant_entries,
            'compliance_rate': (compliant_entries / total_entries * 100) if total_entries > 0 else 0,
            'expert_reviewed': expert_reviewed,
            'expert_review_rate': (expert_reviewed / total_entries * 100) if total_entries > 0 else 0,
            'common_errors': sorted_errors[:10],
            'attention_needed': JournalEntryAuditSerializer(attention_needed, many=True).data
        })


class SystemAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet pour les audits système
    """
    serializer_class = SystemAuditSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['event_type', 'severity', 'resolved']
    
    def get_queryset(self):
        queryset = SystemAudit.objects.all()
        
        # Filtrer par organisation si l'utilisateur n'est pas superadmin
        if not self.request.user.is_superuser:
            queryset = queryset.filter(
                organization=self.request.user.organization
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """
        Résoudre un événement système
        """
        audit = self.get_object()
        
        audit.resolved = True
        audit.resolved_by = request.user
        audit.resolved_at = timezone.now()
        audit.resolution_notes = request.data.get('notes', '')
        audit.save()
        
        return Response(SystemAuditSerializer(audit).data)
    
    @action(detail=False, methods=['get'])
    def security_summary(self, request):
        """
        Résumé des événements de sécurité
        """
        queryset = self.get_queryset()
        
        # Événements de sécurité récents
        security_events = queryset.filter(
            event_type__in=['login_failed', 'permission_denied', 'suspicious_activity', 'security_alert']
        )
        
        last_24h = security_events.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)
        )
        
        last_7d = security_events.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        )
        
        # Événements non résolus
        unresolved = security_events.filter(resolved=False)
        
        # Événements critiques
        critical = security_events.filter(severity='critical')
        
        return Response({
            'last_24h': {
                'total': last_24h.count(),
                'failed_logins': last_24h.filter(event_type='login_failed').count(),
                'permission_denied': last_24h.filter(event_type='permission_denied').count(),
                'suspicious': last_24h.filter(event_type='suspicious_activity').count(),
            },
            'last_7d': {
                'total': last_7d.count(),
                'by_type': list(last_7d.values('event_type').annotate(count=Count('id')).order_by('-count'))
            },
            'unresolved': {
                'total': unresolved.count(),
                'critical': unresolved.filter(severity='critical').count(),
                'items': SystemAuditSerializer(unresolved.order_by('-created_at')[:20], many=True).data
            },
            'critical_alerts': SystemAuditSerializer(
                critical.filter(resolved=False).order_by('-created_at')[:10], 
                many=True
            ).data
        })
