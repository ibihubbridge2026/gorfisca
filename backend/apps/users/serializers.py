from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'role',
            'organization',
            'organization_name',
            'is_active',
            'date_joined',
            'last_login'
        ]
        read_only_fields = [
            'id',
            'full_name',
            'organization_name',
            'date_joined',
            'last_login',
            'organization'
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if self.instance and self.instance.email == value:
            return value
        
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email existe déjà.")
        
        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate(self, attrs):
        """Validate credentials"""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(request=self.context.get('request'),
                            username=email, password=password)
            
            if not user:
                raise serializers.ValidationError('Email ou mot de passe incorrect.')
            
            if not user.is_active:
                raise serializers.ValidationError('Ce compte est désactivé.')
            
            attrs['user'] = user
            return attrs
        
        raise serializers.ValidationError('Email et mot de passe sont requis.')


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration - Simplified for 3-second rule"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    company_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    invitation_token = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email',
            'username',
            'password',
            'first_name',
            'last_name',
            'phone',
            'role',
            'company_name',
            'invitation_token'
        ]
        extra_kwargs = {
            'role': {'required': False, 'allow_null': True},
            'last_name': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True}
        }
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email existe déjà.")
        return value
    
    def validate_username(self, value):
        """Validate username uniqueness"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur existe déjà.")
        return value
    
    def create(self, validated_data):
        """Create user with hashed password - organization handling removed (done in view)"""
        password = validated_data.pop('password')
        # Remove non-model fields
        validated_data.pop('company_name', None)
        validated_data.pop('invitation_token', None)
        
        # Set default values for optional fields
        if 'role' not in validated_data or validated_data['role'] is None:
            validated_data['role'] = 'viewer'  # Default role, will be updated in view
        if 'last_name' not in validated_data:
            validated_data['last_name'] = ''
        if 'phone' not in validated_data:
            validated_data['phone'] = ''
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user
