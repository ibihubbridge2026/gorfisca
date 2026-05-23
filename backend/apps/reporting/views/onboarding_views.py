"""
Views pour la gestion de l'onboarding des organisations
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.organizations.models import Organization
from apps.organizations.serializers import OrganizationSerializer
from apps.reporting.services.onboarding_service import FiscalValidator, OHADASeeder


class OnboardingCompleteView(APIView):
    """
    Endpoint pour finaliser l'onboarding d'une organisation.
    Valide les informations fiscales et initialise le plan comptable OHADA.
    
    POST /api/v1/onboarding/complete/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Vérifier que l'utilisateur a une organisation
        if not hasattr(user, 'organization') or not user.organization:
            return Response(
                {'detail': 'Aucune organisation associée à ce compte.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        organization = user.organization
        
        # Vérifier si déjà onboardé
        if not organization.needs_onboarding:
            return Response(
                {'detail': 'Cette organisation a déjà complété son onboarding.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data = request.data
        country_code = data.get('country_code', 'CD').upper()
        nif = data.get('nif', '').strip()
        rccm = data.get('rccm', '').strip()
        official_name = data.get('official_name', '').strip()
        address = data.get('address', '').strip()
        phone = data.get('phone', '').strip()
        
        # Validations basiques
        if not official_name:
            return Response(
                {'detail': 'Le nom officiel de l\'entreprise est requis.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validation NIF
        if nif and not FiscalValidator.validate_nif(nif, country_code):
            return Response(
                {
                    'detail': f'Le format du NIF est invalide pour le pays {country_code}.',
                    'expected_format': 'Voir documentation fiscale locale.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validation RCCM
        if rccm and not FiscalValidator.validate_rccm(rccm, country_code):
            return Response(
                {
                    'detail': f'Le format du RCCM est invalide pour le pays {country_code}.',
                    'expected_format': 'Voir documentation commerciale locale.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Mise à jour des informations de l'organisation
            organization.legal_identifier = nif if nif else organization.legal_identifier
            organization.name = official_name
            organization.address = address
            organization.phone = phone
            
            # Sauvegarde temporaire pour mettre à jour le serializer si besoin
            organization.save(update_fields=['legal_identifier', 'name', 'address', 'phone'])
            
            # Initialisation du Plan Comptable OHADA
            accounts_created = OHADASeeder.seed_chart_of_accounts(organization)
            
            # Marquer l'onboarding comme terminé
            organization.needs_onboarding = False
            organization.save(update_fields=['needs_onboarding'])
            
            return Response({
                'detail': 'Onboarding complété avec succès.',
                'data': {
                    'organization': OrganizationSerializer(organization).data,
                    'accounts_created': accounts_created,
                    'next_step': 'dashboard'
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'detail': f'Erreur lors de l\'onboarding: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OnboardingStatusView(APIView):
    """
    Vérifie le statut de l'onboarding pour l'organisation de l'utilisateur.
    GET /api/v1/onboarding/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        if not hasattr(user, 'organization') or not user.organization:
            return Response(
                {'needs_onboarding': False, 'detail': 'Aucune organisation associée.'},
                status=status.HTTP_200_OK
            )
        
        organization = user.organization
        
        return Response({
            'needs_onboarding': organization.needs_onboarding,
            'organization_id': organization.id,
            'organization_name': organization.name,
            'has_legal_identifier': bool(organization.legal_identifier and organization.legal_identifier != 'PENDING-PLACEHOLDER'),
            'step': 'fiscal_info' if organization.needs_onboarding else 'complete'
        }, status=status.HTTP_200_OK)
