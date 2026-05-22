from rest_framework import serializers
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import JournalEntry, JournalLine, Account
from apps.organizations.models import Organization


class OHADAAccountSerializer(serializers.ModelSerializer):
    """
    Serializer pour les comptes OHADA avec validations strictes
    """
    
    class Meta:
        model = Account
        fields = [
            'id', 'code', 'label', 'account_type', 'account_class', 
            'is_active', 'parent', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_code(self, value):
        """
        Valider le code de compte OHADA
        """
        if not value:
            raise serializers.ValidationError("Le code du compte est obligatoire")
        
        if len(value) < 1 or len(value) > 10:
            raise serializers.ValidationError("Le code doit contenir entre 1 et 10 caractères")
        
        # Vérifier que le premier caractère est un chiffre
        if not value[0].isdigit():
            raise serializers.ValidationError("Le code doit commencer par un chiffre (1-8)")
        
        # Vérifier que le premier chiffre correspond à une classe OHADA valide
        first_digit = int(value[0])
        if first_digit not in range(1, 9):
            raise serializers.ValidationError("La classe du compte doit être entre 1 et 8")
        
        return value
    
    def validate_account_class(self, value):
        """
        Valider la cohérence entre le code et la classe de compte
        """
        if 'code' not in self.initial_data:
            return value
        
        code = self.initial_data['code']
        if code and len(code) >= 1:
            expected_class = int(code[0])
            if value != expected_class:
                raise serializers.ValidationError(
                    f"La classe du compte ({value}) ne correspond pas au premier chiffre du code ({expected_class})"
                )
        
        return value
    
    def validate(self, data):
        """
        Validation globale du compte OHADA
        """
        # Validation de la hiérarchie des comptes
        if data.get('parent'):
            parent = data['parent']
            
            # Un compte ne peut pas être son propre parent
            if 'id' in data and parent.id == data['id']:
                raise serializers.ValidationError("Un compte ne peut pas être son propre parent")
            
            # La classe doit être cohérente avec le parent
            if parent.account_class != data.get('account_class'):
                raise serializers.ValidationError(
                    "La classe du compte doit être la même que celle du compte parent"
                )
        
        return data


class OHADAJournalLineSerializer(serializers.ModelSerializer):
    """
    Serializer pour les lignes d'écriture avec validations OHADA strictes
    """
    
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_label = serializers.CharField(source='account.label', read_only=True)
    
    class Meta:
        model = JournalLine
        fields = [
            'id', 'account', 'account_code', 'account_label', 'line_type', 
            'amount', 'description', 'reconciled', 'reconciled_at', 
            'reconciled_by', 'created_at'
        ]
        read_only_fields = ['id', 'reconciled', 'reconciled_at', 'reconciled_by', 'created_at']
    
    def validate_amount(self, value):
        """
        Valider le montant de la ligne
        """
        if value is None:
            raise serializers.ValidationError("Le montant est obligatoire")
        
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être strictement positif")
        
        # Vérifier la précision décimale (max 2 décimales pour OHADA)
        try:
            rounded = value.quantize(Decimal('0.01'))
            if abs(value - rounded) > Decimal('0.000001'):
                raise serializers.ValidationError("Le montant ne peut avoir que 2 décimales maximum")
        except InvalidOperation:
            raise serializers.ValidationError("Format de montant invalide")
        
        return value
    
    def validate(self, data):
        """
        Validation OHADA de la ligne d'écriture
        """
        account = data.get('account')
        line_type = data.get('line_type')
        
        if not account or not line_type:
            return data
        
        # Validation des règles de la comptabilité en partie double OHADA
        if line_type == 'debit':
            # Les comptes d'actif (classe 1, 2, 3, 5) et de charges (classe 6) sont débités
            debit_accounts = [1, 2, 3, 5, 6]
            if account.account_class not in debit_accounts:
                raise serializers.ValidationError(
                    f"Un compte de classe {account.account_class} ne peut pas être débité. "
                    f"Seuls les comptes de classes 1, 2, 3, 5, 6 peuvent être débités."
                )
        
        elif line_type == 'credit':
            # Les comptes de passif (classe 1, 4, 5) et de produits (classe 7) sont crédités
            credit_accounts = [1, 4, 5, 7]
            if account.account_class not in credit_accounts:
                raise serializers.ValidationError(
                    f"Un compte de classe {account.account_class} ne peut pas être crédité. "
                    f"Seuls les comptes de classes 1, 4, 5, 7 peuvent être crédités."
                )
        
        return data


class OHADAJournalEntrySerializer(serializers.ModelSerializer):
    """
    Serializer pour les écritures comptables avec validations OHADA strictes
    """
    
    lines = OHADAJournalLineSerializer(many=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'reference', 'date', 'description', 'is_posted', 
            'created_by', 'posted_by', 'created_at', 'posted_at',
            'source', 'is_validated', 'validated_by', 'validated_at',
            'hash', 'previous_hash', 'lines', 'total_debit', 
            'total_credit', 'is_balanced'
        ]
        read_only_fields = [
            'id', 'created_by', 'posted_by', 'created_at', 'posted_at',
            'validated_by', 'validated_at', 'hash', 'previous_hash'
        ]
    
    def get_total_debit(self, obj):
        """Calculer le total débit"""
        return obj.total_debit
    
    def get_total_credit(self, obj):
        """Calculer le total crédit"""
        return obj.total_credit
    
    def get_is_balanced(self, obj):
        """Vérifier si l'écriture est équilibrée"""
        return obj.is_balanced
    
    def validate_reference(self, value):
        """
        Valider la référence de l'écriture
        """
        if not value:
            raise serializers.ValidationError("La référence est obligatoire")
        
        # Format: PIECE-YYYY-NNNNN
        if not value.startswith('PIECE-'):
            raise serializers.ValidationError("La référence doit commencer par 'PIECE-'")
        
        try:
            parts = value.split('-')
            if len(parts) != 3:
                raise ValueError()
            
            year = int(parts[1])
            if len(str(year)) != 4 or year < 2000 or year > 2100:
                raise ValueError()
            
            number = int(parts[2])
            if number <= 0:
                raise ValueError()
                
        except (ValueError, IndexError):
            raise serializers.ValidationError(
                "Format de référence invalide. Attendu: PIECE-YYYY-NNNNN"
            )
        
        return value
    
    def validate_date(self, value):
        """
        Valider la date de l'écriture
        """
        if not value:
            raise serializers.ValidationError("La date est obligatoire")
        
        # La date ne peut pas être dans le futur
        if value > timezone.now().date():
            raise serializers.ValidationError("La date ne peut pas être dans le futur")
        
        # La date ne peut pas être trop ancienne (plus de 5 ans)
        min_date = timezone.now().date() - timezone.timedelta(days=5*365)
        if value < min_date:
            raise serializers.ValidationError("La date est trop ancienne (plus de 5 ans)")
        
        return value
    
    def validate_lines(self, value):
        """
        Valider les lignes de l'écriture selon les règles OHADA
        """
        if not value:
            raise serializers.ValidationError("Une écriture doit contenir au moins une ligne")
        
        if len(value) < 2:
            raise serializers.ValidationError("Une écriture doit contenir au moins 2 lignes (débit + crédit)")
        
        # Vérifier qu'il y a au moins une ligne débit et une ligne crédit
        has_debit = any(line.get('line_type') == 'debit' for line in value)
        has_credit = any(line.get('line_type') == 'credit' for line in value)
        
        if not has_debit:
            raise serializers.ValidationError("Une écriture doit contenir au moins une ligne de débit")
        
        if not has_credit:
            raise serializers.ValidationError("Une écriture doit contenir au moins une ligne de crédit")
        
        # Vérifier qu'il n'y a pas de comptes dupliqués
        account_ids = [line.get('account') for line in value]
        if len(set(account_ids)) != len(account_ids):
            raise serializers.ValidationError("Un compte ne peut apparaître qu'une seule fois par écriture")
        
        return value
    
    def validate(self, data):
        """
        Validation OHADA complète de l'écriture comptable
        """
        lines = data.get('lines', [])
        
        if not lines:
            return data
        
        # Calculer les totaux
        total_debit = sum(
            Decimal(str(line.get('amount', 0))) 
            for line in lines if line.get('line_type') == 'debit'
        )
        
        total_credit = sum(
            Decimal(str(line.get('amount', 0))) 
            for line in lines if line.get('line_type') == 'credit'
        )
        
        # Vérifier l'équilibre Débit = Crédit
        if total_debit != total_credit:
            difference = abs(total_debit - total_credit)
            raise serializers.ValidationError(
                f"L'écriture n'est pas équilibrée. "
                f"Total Débit: {total_debit}, Total Crédit: {total_credit}, "
                f"Différence: {difference}"
            )
        
        # Vérifier que les montants ne sont pas nuls
        if total_debit == 0:
            raise serializers.ValidationError("Les montants ne peuvent pas être nuls")
        
        # Validation supplémentaire pour les écritures validées
        if data.get('is_posted'):
            self._validate_posted_entry(data)
        
        return data
    
    def _validate_posted_entry(self, data):
        """
        Validation spécifique pour les écritures validées
        """
        # Une écriture validée ne peut pas être modifiée
        if self.instance and self.instance.is_posted:
            raise serializers.ValidationError(
                "Une écriture validée ne peut pas être modifiée"
            )
        
        # Vérifier que toutes les lignes utilisent des comptes valides
        lines = data.get('lines', [])
        for line in lines:
            account = line.get('account')
            if account and not account.is_active:
                raise serializers.ValidationError(
                    f"Le compte {account.code} n'est pas actif"
                )
    
    def create(self, validated_data):
        """
        Créer une écriture comptable avec validation OHADA
        """
        lines_data = validated_data.pop('lines')
        
        # Créer l'écriture
        journal_entry = JournalEntry.objects.create(**validated_data)
        
        # Créer les lignes
        for line_data in lines_data:
            JournalLine.objects.create(
                entry=journal_entry,
                **line_data
            )
        
        return journal_entry
    
    def update(self, instance, validated_data):
        """
        Mettre à jour une écriture comptable avec validation OHADA
        """
        # Empêcher la modification des écritures validées
        if instance.is_posted:
            raise serializers.ValidationError(
                "Une écriture validée ne peut pas être modifiée"
            )
        
        lines_data = validated_data.pop('lines', None)
        
        # Mettre à jour les champs de l'écriture
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mettre à jour les lignes si fournies
        if lines_data is not None:
            # Supprimer les anciennes lignes
            instance.lines.all().delete()
            
            # Créer les nouvelles lignes
            for line_data in lines_data:
                JournalLine.objects.create(
                    entry=instance,
                    **line_data
                )
        
        return instance


class OHADABalanceSheetSerializer(serializers.Serializer):
    """
    Serializer pour le bilan OHADA
    """
    
    actif = serializers.DictField()
    passif = serializers.DictField()
    total_actif = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_passif = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_balanced = serializers.BooleanField()
    date = serializers.DateField()
    organization = serializers.CharField()


class OHADATrialBalanceSerializer(serializers.Serializer):
    """
    Serializer pour la balance des comptes OHADA
    """
    
    accounts = serializers.ListField(child=serializers.DictField())
    total_debit = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_credit = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_balanced = serializers.BooleanField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()


class OHADAIncomeStatementSerializer(serializers.Serializer):
    """
    Serializer pour le compte de résultat OHADA
    """
    
    charges = serializers.DictField()
    produits = serializers.DictField()
    total_charges = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_produits = serializers.DecimalField(max_digits=15, decimal_places=2)
    resultat = serializers.DecimalField(max_digits=15, decimal_places=2)
    period_start = serializers.DateField()
    period_end = serializers.DateField()


class OHADAValidationSerializer(serializers.Serializer):
    """
    Serializer pour la validation OHADA
    """
    
    is_valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())
    compliance_score = serializers.IntegerField(min_value=0, max_value=100)
    
    def validate(self, data):
        """
        Valider les données de conformité OHADA
        """
        if data.get('is_valid') and data.get('errors'):
            raise serializers.ValidationError(
                "Une écriture valide ne peut pas contenir d'erreurs"
            )
        
        return data
