from rest_framework import serializers
from django.utils import timezone
from .models import Organization, OrganizationInvitation


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    
    active_users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = [
            'id',
            'name',
            'legal_identifier',
            'address',
            'phone',
            'email',
            'status',
            'created_at',
            'updated_at',
            'active_users_count'
        ]
        read_only_fields = ['created_at', 'updated_at', 'active_users_count']
    
    def get_active_users_count(self, obj):
        """Get count of active users in this organization"""
        return obj.active_users_count()
    
    def validate_legal_identifier(self, value):
        """Validate legal identifier uniqueness"""
        if self.instance and self.instance.legal_identifier == value:
            return value
        
        if Organization.objects.filter(legal_identifier=value).exists():
            raise serializers.ValidationError(
                "Cet identifiant légal existe déjà."
            )
        return value


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationInvitation model"""
    
    invited_by_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = OrganizationInvitation
        fields = [
            'id',
            'email',
            'organization',
            'role',
            'token',
            'invited_by',
            'invited_by_name',
            'is_accepted',
            'accepted_at',
            'accepted_by',
            'expires_at',
            'created_at',
            'status_display'
        ]
        read_only_fields = [
            'token',
            'invited_by',
            'accepted_at',
            'accepted_by',
            'created_at',
            'status_display'
        ]
    
    def get_invited_by_name(self, obj):
        """Get name of user who sent invitation"""
        if obj.invited_by:
            return f"{obj.invited_by.first_name} {obj.invited_by.last_name}".strip()
        return None
    
    def get_status_display(self, obj):
        """Get human-readable status"""
        return obj.status_display
    
    def validate_email(self, value):
        """Validate email format and domain"""
        if not value:
            raise serializers.ValidationError("L'email est requis.")
        return value.lower()
    
    def validate(self, attrs):
        """Validate invitation constraints"""
        organization = attrs.get('organization')
        email = attrs.get('email')
        
        # Check if there's already a pending invitation for this email
        if OrganizationInvitation.objects.filter(
            organization=organization,
            email=email,
            is_accepted=False,
            expires_at__gt=timezone.now()
        ).exists():
            raise serializers.ValidationError(
                "Une invitation est déjà en attente pour cet email."
            )
        
        # Check if user is already in organization
        from apps.users.models import User
        if User.objects.filter(email=email, organization=organization).exists():
            raise serializers.ValidationError(
                "Cet utilisateur est déjà membre de l'organisation."
            )
        
        return attrs
