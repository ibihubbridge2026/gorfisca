from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Organization, OrganizationInvitation
from .serializers import OrganizationSerializer, OrganizationInvitationSerializer


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
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Invite a user to the organization (admin only)"""
        organization = self.get_object()
        
        # Check if user is admin of this organization
        user_role = getattr(request.user, 'role', 'viewer')
        if user_role != 'admin' or request.user.organization != organization:
            return Response(
                {'detail': 'Seuls les administrateurs peuvent inviter des membres.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OrganizationInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create invitation
        invitation = serializer.save(
            organization=organization,
            invited_by=request.user
        )
        
        # In production, send email here
        # For now, return the token for simulation
        return Response({
            'invitation': OrganizationInvitationSerializer(invitation).data,
            'message': f'Invitation envoyée à {invitation.email}',
            'token': str(invitation.token),  # For simulation purposes
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def invitations(self, request, pk=None):
        """Get all invitations for this organization"""
        organization = self.get_object()
        
        # Check if user is admin or accountant
        user_role = getattr(request.user, 'role', 'viewer')
        if user_role not in ['admin', 'accountant'] or request.user.organization != organization:
            return Response(
                {'detail': 'Vous n\'avez pas la permission de voir les invitations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitations = organization.invitations.all()
        serializer = OrganizationInvitationSerializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's organization"""
        user = request.user
        
        if not hasattr(user, 'organization') or not user.organization:
            return Response(
                {'detail': 'Aucune organisation associée à cet utilisateur.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(user.organization)
        return Response(serializer.data)
