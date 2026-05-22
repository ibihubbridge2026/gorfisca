from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import User
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for User model.
    Multi-tenancy: Users can only see users from their organization.
    """
    
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name', 'username']
    ordering_fields = ['email', 'first_name', 'last_name', 'date_joined']
    ordering = ['email']
    
    def get_queryset(self):
        """Filter queryset to user's organization only"""
        user = self.request.user
        if user.is_superuser:
            return User.objects.all()
        return User.objects.filter(organization=user.organization)
    
    def perform_create(self, serializer):
        """Set organization for new user"""
        if not self.request.user.is_superuser:
            # Regular users cannot create users
            raise permissions.PermissionDenied("Vous n'avez pas la permission de créer des utilisateurs.")
        
        # Superusers can create users and set organization
        organization = serializer.validated_data.get('organization')
        if not organization:
            organization = self.request.user.organization
        serializer.save(organization=organization)
    
    def perform_update(self, serializer):
        """Only superusers and users themselves can update profile"""
        if self.request.user.is_superuser:
            serializer.save()
        elif self.request.user.id == self.get_object().id:
            # Users can update their own profile (except organization and role)
            restricted_data = serializer.validated_data.copy()
            restricted_data.pop('organization', None)
            restricted_data.pop('role', None)
            serializer.save(**restricted_data)
        else:
            raise permissions.PermissionDenied("Vous n'avez pas la permission de modifier cet utilisateur.")
    
    def perform_destroy(self, instance):
        """Only superusers can delete users"""
        if not self.request.user.is_superuser:
            raise permissions.PermissionDenied("Vous n'avez pas la permission de supprimer cet utilisateur.")
        instance.delete()
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Login user and return JWT token"""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        login(request, user)
        
        # Generate JWT tokens (compatible with SimpleJWT in REST_FRAMEWORK config)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Logout user and delete token"""
        try:
            token = Token.objects.get(user=request.user)
            token.delete()
        except Token.DoesNotExist:
            pass
        
        logout(request)
        return Response({'detail': 'Déconnecté avec succès.'})
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Register new user with automatic organization creation"""
        print("=" * 60)
        print("[REGISTER] Data received:", dict(request.data))
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            print("[REGISTER] Validation errors:", serializer.errors)
            print("=" * 60)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        print("[REGISTER] Validation OK")
        print("=" * 60)
        
        # Check for invitation token
        invitation_token = request.data.get('invitation_token')
        company_name = request.data.get('company_name', '')
        organization = None
        
        if invitation_token:
            # Handle invitation case - user joins existing organization
            from apps.organizations.models import OrganizationInvitation
            from django.utils import timezone
            try:
                invitation = OrganizationInvitation.objects.get(
                    token=invitation_token,
                    is_accepted=False
                )
                organization = invitation.organization
                user_role = invitation.role
                # Mark invitation as accepted
                invitation.is_accepted = True
                invitation.accepted_at = timezone.now()
                invitation.save()
            except OrganizationInvitation.DoesNotExist:
                return Response(
                    {'detail': 'Token d\'invitation invalide ou expiré.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create user
        user = serializer.save()
        
        if organization:
            # Assign to existing organization (invitation case)
            user.organization = organization
            user.role = user_role
        else:
            # Create automatic organization for new founder
            from apps.organizations.models import Organization
            import uuid
            
            # Create personalized organization
            org_name = company_name if company_name else f"Entreprise de {user.first_name}" if user.first_name else "Mon Entreprise"
            # Generate unique placeholder legal_identifier (will be set in onboarding/settings)
            placeholder_legal_id = f"PENDING-{uuid.uuid4().hex[:12].upper()}"
            organization = Organization.objects.create(
                name=org_name,
                legal_identifier=placeholder_legal_id,
                status='active'
            )
            
            # Assign user as admin of their organization
            user.organization = organization
            user.role = 'admin'
        
        user.save()
        
        # Login and return JWT token
        from rest_framework_simplejwt.tokens import RefreshToken
        login(request, user)
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'organization': {
                'id': organization.id,
                'name': organization.name,
                'legal_identifier': organization.legal_identifier
            },
            'needs_onboarding': organization.legal_identifier.startswith('PENDING-')
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user with organization info"""
        user = request.user
        data = UserSerializer(user).data
        
        # Add organization details
        if user.organization:
            from apps.organizations.serializers import OrganizationSerializer
            org_serializer = OrganizationSerializer(user.organization)
            data['organization'] = org_serializer.data
        
        return Response(data)
