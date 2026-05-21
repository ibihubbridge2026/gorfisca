from decimal import Decimal
from datetime import date, timedelta
from django.db.models import Sum, Q, F
from django.utils import timezone
from apps.accounting.models import Account, JournalLine
from apps.invoicing.models import Invoice
from apps.organizations.models import Organization


class OHADAService:
    """Service for generating OHADA compliant financial reports"""
    
    @staticmethod
    def get_balance_sheet(organization, as_of_date=None):
        """
        Generate Balance Sheet (Bilan) according to OHADA standards
        Structure: Assets (Classes 1-5) = Liabilities + Equity (Classes 1-3)
        """
        if as_of_date is None:
            as_of_date = timezone.now().date()
        
        # Get all accounts up to the specified date
        accounts = Account.objects.filter(
            organization=organization,
            is_active=True
        ).order_by('code')
        
        # Calculate balances for each account
        balance_sheet = {
            'as_of_date': as_of_date,
            'assets': {
                'total': Decimal('0.00'),
                'class_1': {'name': 'Capitaux propres et emprunts', 'total': Decimal('0.00'), 'accounts': []},
                'class_2': {'name': 'Immobilisations', 'total': Decimal('0.00'), 'accounts': []},
                'class_3': {'name': 'Stocks', 'total': Decimal('0.00'), 'accounts': []},
                'class_4': {'name': 'Tiers', 'total': Decimal('0.00'), 'accounts': []},
                'class_5': {'name': 'Trésorerie', 'total': Decimal('0.00'), 'accounts': []},
            },
            'liabilities_equity': {
                'total': Decimal('0.00'),
                'class_1': {'name': 'Capitaux propres et emprunts', 'total': Decimal('0.00'), 'accounts': []},
                'class_2': {'name': 'Dettes financières', 'total': Decimal('0.00'), 'accounts': []},
                'class_3': {'name': 'Dettes sociales et fiscales', 'total': Decimal('0.00'), 'accounts': []},
            }
        }
        
        # Calculate account balances
        for account in accounts:
            balance = OHADAService.get_account_balance_as_of_date(account, as_of_date)
            
            if balance == 0:
                continue
            
            account_data = {
                'code': account.code,
                'label': account.label,
                'balance': abs(balance),
                'type': account.account_type,
                'balance_type': 'debit' if balance > 0 else 'credit'
            }
            
            # Classify according to OHADA structure
            if account.account_class == 1:  # Capitaux propres et emprunts
                if account.account_type in ['asset']:
                    balance_sheet['assets']['class_1']['accounts'].append(account_data)
                    balance_sheet['assets']['class_1']['total'] += abs(balance)
                    balance_sheet['assets']['total'] += abs(balance)
                else:  # liability, equity
                    balance_sheet['liabilities_equity']['class_1']['accounts'].append(account_data)
                    balance_sheet['liabilities_equity']['class_1']['total'] += abs(balance)
                    balance_sheet['liabilities_equity']['total'] += abs(balance)
            
            elif account.account_class == 2:  # Immobilisations
                if account.account_type == 'asset':
                    balance_sheet['assets']['class_2']['accounts'].append(account_data)
                    balance_sheet['assets']['class_2']['total'] += abs(balance)
                    balance_sheet['assets']['total'] += abs(balance)
            
            elif account.account_class == 3:  # Stocks
                if account.account_type == 'asset':
                    balance_sheet['assets']['class_3']['accounts'].append(account_data)
                    balance_sheet['assets']['class_3']['total'] += abs(balance)
                    balance_sheet['assets']['total'] += abs(balance)
            
            elif account.account_class == 4:  # Tiers
                if account.account_type == 'asset':
                    balance_sheet['assets']['class_4']['accounts'].append(account_data)
                    balance_sheet['assets']['class_4']['total'] += abs(balance)
                    balance_sheet['assets']['total'] += abs(balance)
                else:  # liability
                    balance_sheet['liabilities_equity']['class_1']['accounts'].append(account_data)
                    balance_sheet['liabilities_equity']['class_1']['total'] += abs(balance)
                    balance_sheet['liabilities_equity']['total'] += abs(balance)
            
            elif account.account_class == 5:  # Trésorerie
                if account.account_type == 'asset':
                    balance_sheet['assets']['class_5']['accounts'].append(account_data)
                    balance_sheet['assets']['class_5']['total'] += abs(balance)
                    balance_sheet['assets']['total'] += abs(balance)
        
        # Check balance sheet equation
        balance_sheet['is_balanced'] = (
            abs(balance_sheet['assets']['total'] - balance_sheet['liabilities_equity']['total']) < Decimal('0.01')
        )
        
        return balance_sheet
    
    @staticmethod
    def get_income_statement(organization, start_date=None, end_date=None):
        """
        Generate Income Statement (Compte de Résultat) according to OHADA standards
        Structure: Revenue - Expenses = Net Income
        """
        if end_date is None:
            end_date = timezone.now().date()
        if start_date is None:
            start_date = end_date - timedelta(days=365)  # Default to 1 year
        
        # Get all accounts
        accounts = Account.objects.filter(
            organization=organization,
            is_active=True
        ).order_by('code')
        
        income_statement = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'revenues': {
                'total': Decimal('0.00'),
                'class_7': {'name': 'Produits', 'total': Decimal('0.00'), 'accounts': []}
            },
            'expenses': {
                'total': Decimal('0.00'),
                'class_6': {'name': 'Charges', 'total': Decimal('0.00'), 'accounts': []}
            },
            'net_income': Decimal('0.00')
        }
        
        # Calculate period balances for revenue and expense accounts
        for account in accounts:
            if account.account_type in ['revenue', 'expense']:
                balance = OHADAService.get_account_balance_for_period(
                    account, start_date, end_date
                )
                
                if balance == 0:
                    continue
                
                account_data = {
                    'code': account.code,
                    'label': account.label,
                    'balance': abs(balance),
                    'type': account.account_type,
                    'period_balance': balance
                }
                
                if account.account_type == 'revenue':
                    # Revenue accounts have credit balances, but we show positive values
                    income_statement['revenues']['class_7']['accounts'].append(account_data)
                    income_statement['revenues']['class_7']['total'] += abs(balance)
                    income_statement['revenues']['total'] += abs(balance)
                
                elif account.account_type == 'expense':
                    # Expense accounts have debit balances
                    income_statement['expenses']['class_6']['accounts'].append(account_data)
                    income_statement['expenses']['class_6']['total'] += abs(balance)
                    income_statement['expenses']['total'] += abs(balance)
        
        # Calculate net income
        income_statement['net_income'] = income_statement['revenues']['total'] - income_statement['expenses']['total']
        
        return income_statement
    
    @staticmethod
    def get_cash_flow_statement(organization, start_date=None, end_date=None):
        """
        Generate Cash Flow Statement (Tableau des Flux de Trésorerie)
        """
        if end_date is None:
            end_date = timezone.now().date()
        if start_date is None:
            start_date = end_date - timedelta(days=365)
        
        # Get cash accounts (Class 5)
        cash_accounts = Account.objects.filter(
            organization=organization,
            account_class=5,
            account_type='asset',
            is_active=True
        )
        
        # Calculate opening and closing cash balances
        opening_balance = Decimal('0.00')
        closing_balance = Decimal('0.00')
        
        for account in cash_accounts:
            opening_balance += OHADAService.get_account_balance_as_of_date(
                account, start_date - timedelta(days=1)
            )
            closing_balance += OHADAService.get_account_balance_as_of_date(account, end_date)
        
        # Get cash movements from journal lines
        cash_movements = JournalLine.objects.filter(
            entry__organization=organization,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=5,
            entry__is_posted=True
        ).select_related('account', 'entry')
        
        # Analyze cash flows
        cash_flow_statement = {
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'opening_balance': opening_balance,
            'closing_balance': closing_balance,
            'net_change': closing_balance - opening_balance,
            'operating_activities': {
                'total': Decimal('0.00'),
                'movements': []
            },
            'investing_activities': {
                'total': Decimal('0.00'),
                'movements': []
            },
            'financing_activities': {
                'total': Decimal('0.00'),
                'movements': []
            }
        }
        
        # Classify cash movements
        for line in cash_movements:
            movement = {
                'date': line.entry.date,
                'description': line.entry.description,
                'account_code': line.account.code,
                'account_label': line.account.label,
                'amount': line.amount,
                'type': 'inflow' if line.line_type == 'debit' else 'outflow'
            }
            
            # Simple classification based on account codes
            if line.account.code.startswith('52'):  # Banques
                if 'vente' in line.entry.description.lower() or 'client' in line.entry.description.lower():
                    cash_flow_statement['operating_activities']['movements'].append(movement)
                    if movement['type'] == 'inflow':
                        cash_flow_statement['operating_activities']['total'] += line.amount
                    else:
                        cash_flow_statement['operating_activities']['total'] -= line.amount
                elif 'investissement' in line.entry.description.lower() or 'immobilisation' in line.entry.description.lower():
                    cash_flow_statement['investing_activities']['movements'].append(movement)
                    if movement['type'] == 'inflow':
                        cash_flow_statement['investing_activities']['total'] += line.amount
                    else:
                        cash_flow_statement['investing_activities']['total'] -= line.amount
                else:
                    cash_flow_statement['financing_activities']['movements'].append(movement)
                    if movement['type'] == 'inflow':
                        cash_flow_statement['financing_activities']['total'] += line.amount
                    else:
                        cash_flow_statement['financing_activities']['total'] -= line.amount
            elif line.account.code.startswith('57'):  # Caisse
                cash_flow_statement['operating_activities']['movements'].append(movement)
                if movement['type'] == 'inflow':
                    cash_flow_statement['operating_activities']['total'] += line.amount
                else:
                    cash_flow_statement['operating_activities']['total'] -= line.amount
        
        return cash_flow_statement
    
    @staticmethod
    def get_trial_balance(organization, as_of_date=None):
        """
        Generate Trial Balance (Balance des comptes)
        """
        if as_of_date is None:
            as_of_date = timezone.now().date()
        
        accounts = Account.objects.filter(
            organization=organization,
            is_active=True
        ).order_by('code')
        
        trial_balance = {
            'as_of_date': as_of_date,
            'accounts': [],
            'total_debit': Decimal('0.00'),
            'total_credit': Decimal('0.00')
        }
        
        for account in accounts:
            balance = OHADAService.get_account_balance_as_of_date(account, as_of_date)
            
            if balance == 0:
                continue
            
            if balance > 0:  # Debit balance
                trial_balance['accounts'].append({
                    'code': account.code,
                    'label': account.label,
                    'account_type': account.account_type,
                    'account_class': account.account_class,
                    'debit': abs(balance),
                    'credit': Decimal('0.00')
                })
                trial_balance['total_debit'] += abs(balance)
            else:  # Credit balance
                trial_balance['accounts'].append({
                    'code': account.code,
                    'label': account.label,
                    'account_type': account.account_type,
                    'account_class': account.account_class,
                    'debit': Decimal('0.00'),
                    'credit': abs(balance)
                })
                trial_balance['total_credit'] += abs(balance)
        
        trial_balance['is_balanced'] = (
            abs(trial_balance['total_debit'] - trial_balance['total_credit']) < Decimal('0.01')
        )
        
        return trial_balance
    
    @staticmethod
    def get_account_balance_as_of_date(account, as_of_date):
        """Get account balance as of specific date"""
        lines = JournalLine.objects.filter(
            account=account,
            entry__date__lte=as_of_date,
            entry__is_posted=True
        )
        
        debit_total = lines.filter(line_type='debit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        credit_total = lines.filter(line_type='credit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Calculate balance based on account type
        if account.account_type in ['asset', 'expense']:
            return debit_total - credit_total
        else:  # liability, equity, revenue
            return credit_total - debit_total
    
    @staticmethod
    def get_account_balance_for_period(account, start_date, end_date):
        """Get account balance for a specific period"""
        lines = JournalLine.objects.filter(
            account=account,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            entry__is_posted=True
        )
        
        debit_total = lines.filter(line_type='debit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        credit_total = lines.filter(line_type='credit').aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Calculate period balance
        if account.account_type in ['asset', 'expense']:
            return debit_total - credit_total
        else:  # liability, equity, revenue
            return credit_total - debit_total
    
    @staticmethod
    def get_aged_receivables(organization, as_of_date=None):
        """
        Generate Aged Receivables Report
        """
        if as_of_date is None:
            as_of_date = timezone.now().date()
        
        # Get customer invoices
        invoices = Invoice.objects.filter(
            organization=organization,
            status__in=['sent', 'overdue'],
            due_date__lte=as_of_date
        ).select_related('journal_entry')
        
        aged_receivables = {
            'as_of_date': as_of_date,
            'total_outstanding': Decimal('0.00'),
            'buckets': {
                'current': {'total': Decimal('0.00'), 'invoices': []},
                '0_30': {'total': Decimal('0.00'), 'invoices': []},
                '31_60': {'total': Decimal('0.00'), 'invoices': []},
                '61_90': {'total': Decimal('0.00'), 'invoices': []},
                'over_90': {'total': Decimal('0.00'), 'invoices': []}
            }
        }
        
        for invoice in invoices:
            days_overdue = max(0, (as_of_date - invoice.due_date).days)
            
            invoice_data = {
                'invoice_number': invoice.invoice_number,
                'client_name': invoice.client_name,
                'due_date': invoice.due_date,
                'amount': invoice.total_amount,
                'days_overdue': days_overdue
            }
            
            # Classify into aging bucket
            if days_overdue == 0:
                bucket = 'current'
            elif days_overdue <= 30:
                bucket = '0_30'
            elif days_overdue <= 60:
                bucket = '31_60'
            elif days_overdue <= 90:
                bucket = '61_90'
            else:
                bucket = 'over_90'
            
            aged_receivables['buckets'][bucket]['invoices'].append(invoice_data)
            aged_receivables['buckets'][bucket]['total'] += invoice.total_amount
            aged_receivables['total_outstanding'] += invoice.total_amount
        
        return aged_receivables
