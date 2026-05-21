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
            'user_type',
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
    """Serializer for user registration"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email',
            'username',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
            'user_type'
        ]
    
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
    
    def validate(self, attrs):
        """Validate password confirmation"""
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        
        if password != password_confirm:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user
