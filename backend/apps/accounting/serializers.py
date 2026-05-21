from rest_framework import serializers
from decimal import Decimal
from .models import Account, JournalEntry, JournalLine


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model"""
    
    balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Account
        fields = [
            'id',
            'code',
            'label',
            'account_type',
            'account_class',
            'is_active',
            'parent',
            'balance',
            'organization',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'balance', 'organization']
    
    def get_balance(self, obj):
        """Get account balance"""
        return obj.get_balance()
    
    def validate_code(self, value):
        """Validate account code format and uniqueness"""
        if self.instance and self.instance.code == value:
            return value
        
        # Check uniqueness within organization
        organization = self.context['request'].user.organization
        if Account.objects.filter(organization=organization, code=value).exists():
            raise serializers.ValidationError(
                "Ce code de compte existe déjà dans votre organisation."
            )
        
        # Validate OHADA code format (first digit should match class)
        if len(value) >= 1:
            try:
                first_digit = int(value[0])
                if first_digit < 1 or first_digit > 8:
                    raise serializers.ValidationError(
                        "Le code doit commencer par un chiffre de 1 à 8 (classes OHADA)."
                    )
            except ValueError:
                raise serializers.ValidationError(
                    "Le code doit commencer par un chiffre."
                )
        
        return value
    
    def validate(self, attrs):
        """Validate account class consistency with code"""
        if 'code' in attrs and 'account_class' in attrs:
            code = attrs['code']
            account_class = attrs['account_class']
            
            if len(code) >= 1:
                first_digit = int(code[0])
                if first_digit != account_class:
                    raise serializers.ValidationError({
                        'account_class': f"La classe du compte ({account_class}) ne correspond pas au premier chiffre du code ({first_digit})."
                    })
        
        return attrs


class JournalLineSerializer(serializers.ModelSerializer):
    """Serializer for JournalLine model"""
    
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_label = serializers.CharField(source='account.label', read_only=True)
    
    class Meta:
        model = JournalLine
        fields = [
            'id',
            'entry',
            'account',
            'account_code',
            'account_label',
            'line_type',
            'amount',
            'description'
        ]
        read_only_fields = ['id']
    
    def validate_amount(self, value):
        """Validate amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à zéro.")
        return value
    
    def validate(self, attrs):
        """Validate line type and account consistency"""
        account = attrs.get('account')
        line_type = attrs.get('line_type')
        
        if account and line_type:
            # Validate debit/credit rules based on account type
            if line_type == 'debit' and account.account_type not in ['asset', 'expense']:
                raise serializers.ValidationError({
                    'line_type': f"Le compte {account.code} ({account.get_account_type_display()}) ne peut pas être débité."
                })
            
            if line_type == 'credit' and account.account_type not in ['liability', 'equity', 'revenue']:
                raise serializers.ValidationError({
                    'line_type': f"Le compte {account.code} ({account.get_account_type_display()}) ne peut pas être crédité."
                })
        
        return attrs


class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer for JournalEntry model"""
    
    lines = JournalLineSerializer(many=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = JournalEntry
        fields = [
            'id',
            'reference',
            'date',
            'description',
            'is_posted',
            'created_by',
            'created_by_name',
            'posted_by',
            'posted_at',
            'organization',
            'lines',
            'total_debit',
            'total_credit',
            'is_balanced',
            'created_at'
        ]
        read_only_fields = [
            'created_by',
            'posted_by',
            'posted_at',
            'organization',
            'created_at',
            'total_debit',
            'total_credit',
            'is_balanced'
        ]
    
    def get_total_debit(self, obj):
        """Calculate total debit amount"""
        return obj.total_debit
    
    def get_total_credit(self, obj):
        """Calculate total credit amount"""
        return obj.total_credit
    
    def get_is_balanced(self, obj):
        """Check if entry is balanced"""
        return obj.is_balanced
    
    def validate_reference(self, value):
        """Validate reference uniqueness"""
        if self.instance and self.instance.reference == value:
            return value
        
        organization = self.context['request'].user.organization
        if JournalEntry.objects.filter(organization=organization, reference=value).exists():
            raise serializers.ValidationError("Cette référence existe déjà dans votre organisation.")
        
        return value
    
    def validate_lines(self, value):
        """Validate journal lines"""
        if not value:
            raise serializers.ValidationError("Une écriture comptable doit contenir au moins une ligne.")
        
        # Validate at least one debit and one credit
        has_debit = any(line['line_type'] == 'debit' for line in value)
        has_credit = any(line['line_type'] == 'credit' for line in value)
        
        if not has_debit or not has_credit:
            raise serializers.ValidationError("L'écriture doit contenir au moins une ligne de débit et une de crédit.")
        
        return value
    
    def validate(self, attrs):
        """Validate the complete journal entry"""
        lines = attrs.get('lines', [])
        
        if lines:
            # Calculate totals
            total_debit = sum(
                Decimal(str(line.get('amount', 0))) 
                for line in lines 
                if line.get('line_type') == 'debit'
            )
            total_credit = sum(
                Decimal(str(line.get('amount', 0))) 
                for line in lines 
                if line.get('line_type') == 'credit'
            )
            
            # Check balance
            if total_debit != total_credit:
                raise serializers.ValidationError(
                    f"L'écriture n'est pas équilibrée: Débit: {total_debit}, Crédit: {total_credit}"
                )
        
        return attrs
    
    def create(self, validated_data):
        """Create journal entry with lines"""
        lines_data = validated_data.pop('lines')
        
        # Create journal entry
        entry = JournalEntry.objects.create(**validated_data)
        
        # Create journal lines
        for line_data in lines_data:
            JournalLine.objects.create(entry=entry, **line_data)
        
        return entry
