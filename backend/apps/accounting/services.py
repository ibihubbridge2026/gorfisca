from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.db import transaction, models
from django.utils import timezone
from .models import Account, JournalEntry, JournalLine


class AccountingService:
    """Service layer for accounting operations"""
    
    @staticmethod
    def validate_double_entry(lines_data):
        """
        Validate that debit equals credit for a journal entry
        lines_data: list of dicts with keys: account_id, line_type, amount
        """
        if not lines_data:
            raise ValidationError("Une écriture comptable doit contenir au moins une ligne")
        
        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')
        
        for line_data in lines_data:
            try:
                amount = Decimal(str(line_data.get('amount', '0')))
            except (InvalidOperation, ValueError):
                raise ValidationError(f"Montant invalide: {line_data.get('amount')}")
            
            if amount <= 0:
                raise ValidationError("Le montant doit être supérieur à zéro")
            
            line_type = line_data.get('line_type')
            if line_type == 'debit':
                total_debit += amount
            elif line_type == 'credit':
                total_credit += amount
            else:
                raise ValidationError(f"Type de ligne invalide: {line_type}")
        
        if total_debit != total_credit:
            raise ValidationError(
                f"L'écriture n'est pas équilibrée: "
                f"Débit: {total_debit}, Crédit: {total_credit}"
            )
        
        return True
    
    @staticmethod
    def validate_account_consistency(lines_data, organization):
        """
        Validate that all accounts belong to the same organization
        and that debit/credit rules are respected
        """
        for line_data in lines_data:
            account_id = line_data.get('account_id')
            try:
                account = Account.objects.get(id=account_id, organization=organization)
            except Account.DoesNotExist:
                raise ValidationError(f"Compte {account_id} non trouvé dans l'organisation")
            
            line_type = line_data.get('line_type')
            
            # Validate debit/credit rules based on account type
            if line_type == 'debit' and account.account_type not in ['asset', 'expense']:
                raise ValidationError(
                    f"Le compte {account.code} ({account.get_account_type_display()}) "
                    "ne peut pas être débité"
                )
            
            if line_type == 'credit' and account.account_type not in ['liability', 'equity', 'revenue']:
                raise ValidationError(
                    f"Le compte {account.code} ({account.get_account_type_display()}) "
                    "ne peut pas être crédité"
                )
    
    @staticmethod
    @transaction.atomic
    def create_journal_entry(organization, reference, date, description, lines_data, created_by):
        """
        Create a complete journal entry with validation
        """
        # Validate reference uniqueness
        if JournalEntry.objects.filter(organization=organization, reference=reference).exists():
            raise ValidationError(f"La référence {reference} existe déjà")
        
        # Validate double entry
        AccountingService.validate_double_entry(lines_data)
        
        # Validate account consistency
        AccountingService.validate_account_consistency(lines_data, organization)
        
        # Create journal entry
        entry = JournalEntry.objects.create(
            organization=organization,
            reference=reference,
            date=date,
            description=description,
            created_by=created_by
        )
        
        # Create journal lines
        for line_data in lines_data:
            JournalLine.objects.create(
                entry=entry,
                account_id=line_data['account_id'],
                line_type=line_data['line_type'],
                amount=line_data['amount'],
                description=line_data.get('description', '')
            )
        
        return entry
    
    @staticmethod
    @transaction.atomic
    def post_journal_entry(entry, posted_by):
        """
        Post (validate) a journal entry
        """
        if entry.is_posted:
            raise ValidationError("Cette écriture est déjà validée")
        
        # Additional validation before posting
        if not entry.is_balanced:
            raise ValidationError("L'écriture n'est pas équilibrée")
        
        if not entry.lines.exists():
            raise ValidationError("L'écriture ne contient aucune ligne")
        
        entry.post(posted_by)
        return entry
    
    @staticmethod
    def get_trial_balance(organization, start_date=None, end_date=None):
        """
        Calculate trial balance for an organization
        """
        queryset = Account.objects.filter(organization=organization, is_active=True)
        
        trial_balance = []
        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')
        
        for account in queryset:
            balance = account.get_balance()
            
            if balance > 0:
                if account.account_type in ['asset', 'expense']:
                    trial_balance.append({
                        'account': account,
                        'debit': balance,
                        'credit': Decimal('0.00')
                    })
                    total_debit += balance
                else:
                    trial_balance.append({
                        'account': account,
                        'debit': Decimal('0.00'),
                        'credit': balance
                    })
                    total_credit += balance
            elif balance < 0:
                if account.account_type in ['asset', 'expense']:
                    trial_balance.append({
                        'account': account,
                        'debit': Decimal('0.00'),
                        'credit': abs(balance)
                    })
                    total_credit += abs(balance)
                else:
                    trial_balance.append({
                        'account': account,
                        'debit': abs(balance),
                        'credit': Decimal('0.00')
                    })
                    total_debit += abs(balance)
        
        return {
            'accounts': trial_balance,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'is_balanced': total_debit == total_credit
        }
    
    @staticmethod
    def get_account_balance(account, start_date=None, end_date=None):
        """
        Calculate account balance for a specific period
        """
        lines = account.debit_lines.all() if account.account_type in ['asset', 'expense'] else account.credit_lines.all()
        
        if start_date:
            lines = lines.filter(entry__date__gte=start_date)
        if end_date:
            lines = lines.filter(entry__date__lte=end_date)
        
        total = lines.aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        return total
    
    @staticmethod
    def validate_fiscal_period(organization, date):
        """
        Validate that the date is within an open fiscal period
        """
        # This would typically check against fiscal year periods
        # For now, we'll just ensure it's not in the future
        if date > timezone.now().date():
            raise ValidationError("La date ne peut pas être dans le futur")
        
        # Additional fiscal period validation logic would go here
        return True
