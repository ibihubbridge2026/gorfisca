from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Organization model.
    Multi-tenancy: Users can only see their own organization.
    """
    
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'legal_identifier', 'email']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return Organization.objects.all()
        return Organization.objects.filter(id=user.organization.id)
    
    def perform_create(self, serializer):
        """Set organization context for superusers"""
        if self.request.user.is_superuser:
            serializer.save()
        else:
            # Regular users cannot create organizations
            raise permissions.PermissionDenied("Vous n'avez pas la permission de créer une organisation.")
    
    def perform_update(self, serializer):
        """Only superusers can update organization"""
        if not self.request.user.is_superuser:
            raise permissions.PermissionDenied("Vous n'avez pas la permission de modifier cette organisation.")
        serializer.save()
    
    def perform_destroy(self, instance):
        """Only superusers can delete organization"""
        if not self.request.user.is_superuser:
            raise permissions.PermissionDenied("Vous n'avez pas la permission de supprimer cette organisation.")
        instance.delete()
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get users in this organization"""
        organization = self.get_object()
        users = organization.users.all()
        
        from apps.users.serializers import UserSerializer
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get organization statistics"""
        organization = self.get_object()
        
        stats = {
            'active_users_count': organization.active_users_count(),
            'total_accounts_count': organization.accounts.count(),
            'active_accounts_count': organization.accounts.filter(is_active=True).count(),
            'total_journal_entries': organization.journal_entries.count(),
            'posted_journal_entries': organization.journal_entries.filter(is_posted=True).count(),
        }
        
        return Response(stats)
