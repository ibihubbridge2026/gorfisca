from rest_framework import serializers
from .models import Organization


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
