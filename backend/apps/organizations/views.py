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
    
    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """Get current user's organization - Ultra-robuste multi-tenant"""
        user = request.user
        
        # 1. Priorité 1: current_organization sur le User (si existant)
        if hasattr(user, 'current_organization') and user.current_organization:
            organization = user.current_organization
        
        # 2. Priorité 2: organization direct (legacy)
        elif hasattr(user, 'organization') and user.organization:
            organization = user.organization
        
        # 3. Priorité 3: Première organisation liée à l'utilisateur
        else:
            from .models import Organization
            organization = Organization.objects.filter(users=user).first()
        
        # 4. Fallback pour les devs locaux (is_staff)
        if not organization and user.is_staff:
            from .models import Organization
            organization = Organization.objects.first()
            if organization:
                # Auto-lier le dev pour corriger la session
                organization.users.add(user)
                if hasattr(user, 'organization'):
                    user.organization = organization
                    user.save()
        
        # 5. Si vraiment aucune organisation
        if not organization:
            return Response(
                {
                    'detail': 'Aucune organisation associée à cet utilisateur.',
                    'code': 'NO_ORGANIZATION',
                    'user_id': user.id,
                    'email': user.email
                },
                status=status.HTTP_400_BAD_REQUEST  # 400 au lieu de 404
            )
        
        serializer = self.get_serializer(organization)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='accept-invite')
    def accept_invite(self, request):
        """Accepter une invitation et rattacher/utiliser l'utilisateur"""
        from rest_framework import status
        from apps.users.models import User
        from django.utils import timezone
        
        token = request.data.get('token')
        user_data = request.data.get('user', {})  # Pour création de compte si nécessaire
        
        if not token:
            return Response(
                {'detail': 'Token d\'invitation requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invitation = self.get_queryset().get(
                token=token,
                is_accepted=False
            )
        except self.get_queryset().model.DoesNotExist:
            return Response(
                {'detail': 'Token d\'invitation invalide ou déjà utilisé.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier l'expiration
        if invitation.is_expired():
            return Response(
                {'detail': 'L\'invitation a expiré.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cas 1: Utilisateur existe déjà (connecté)
        if request.user.is_authenticated:
            user = request.user
            
            # Vérifier que l'email correspond
            if user.email.lower() != invitation.email.lower():
                return Response(
                    {'detail': 'Cette invitation n\'est pas pour votre adresse email.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Accepter l'invitation
            if invitation.accept(user):
                # Rattacher à l'organisation
                invitation.organization.users.add(user)
                
                # Mettre à jour le rôle si nécessaire
                if hasattr(user, 'role'):
                    user.role = invitation.role
                    user.save()
                
                return Response({
                    'message': 'Invitation acceptée avec succès.',
                    'organization': self.get_serializer(invitation.organization).data,
                    'role': invitation.role
                })
            else:
                return Response(
                    {'detail': 'Impossible d\'accepter cette invitation.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Cas 2: Création de compte + acceptation
        else:
            if not user_data.get('email') or not user_data.get('password'):
                return Response(
                    {'detail': 'Email et mot de passe requis pour créer un compte.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Vérifier que l'email correspond à l'invitation
            if user_data['email'].lower() != invitation.email.lower():
                return Response(
                    {'detail': 'L\'email ne correspond pas à l\'invitation.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Créer l'utilisateur
            try:
                user = User.objects.create_user(
                    username=user_data['email'],
                    email=user_data['email'],
                    password=user_data['password'],
                    first_name=user_data.get('first_name', ''),
                    last_name=user_data.get('last_name', '')
                )
                
                # Accepter l'invitation
                if invitation.accept(user):
                    # Rattacher à l'organisation
                    invitation.organization.users.add(user)
                    user.role = invitation.role
                    user.save()
                    
                    # Générer des tokens JWT
                    from rest_framework_simplejwt.tokens import RefreshToken
                    refresh = RefreshToken.for_user(user)
                    
                    return Response({
                        'message': 'Compte créé et invitation acceptée.',
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'role': user.role
                        },
                        'organization': self.get_serializer(invitation.organization).data,
                        'token': str(refresh.access_token),
                        'refresh': str(refresh)
                    })
                else:
                    user.delete()  # Nettoyer si l'acceptation échoue
                    return Response(
                        {'detail': 'Impossible d\'accepter cette invitation.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
            except Exception as e:
                return Response(
                    {'detail': f'Erreur lors de la création du compte: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
