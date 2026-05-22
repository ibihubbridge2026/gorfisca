from rest_framework.decorators import action
from rest_framework.response import Response
from decimal import Decimal
from apps.accounting.models import Account, JournalLine

class TreasuryRevenueMixin:
    """Mixin pour ajouter les endpoints treasury et revenue au ReportingViewSet"""
    
    @action(detail=False, methods=['get'], url_path='treasury')
    def treasury(self, request):
        """
        Get treasury data (Classe 5: comptes 52 et 57)
        Returns total treasury balance and account details
        """
        try:
            organization = self._get_organization()
            if not organization:
                return Response({'error': 'Organization not found'}, status=404)
            
            # Get Classe 5 accounts (52 and 57)
            treasury_accounts = Account.objects.filter(
                organization=organization,
                code__in=['52', '57']
            ).select_related('parent')
            
            total_treasury = Decimal('0.00')
            accounts_data = []
            
            for account in treasury_accounts:
                balance = self._get_account_balance(account)
                total_treasury += balance
                
                accounts_data.append({
                    'code': account.code,
                    'label': account.name,
                    'balance': float(balance)
                })
            
            return Response({
                'total_treasury': float(total_treasury),
                'accounts': accounts_data
            })
        except Exception as e:
            return Response({
                'total_treasury': 0,
                'accounts': []
            })

    @action(detail=False, methods=['get'], url_path='revenue')
    def revenue(self, request):
        """
        Get revenue data (Classe 7: comptes 701100, 706100)
        Returns total revenue and account details
        """
        try:
            organization = self._get_organization()
            if not organization:
                return Response({'error': 'Organization not found'}, status=404)
            
            # Get Classe 7 accounts (701100, 706100)
            revenue_accounts = Account.objects.filter(
                organization=organization,
                code__in=['701100', '706100']
            ).select_related('parent')
            
            total_revenue = Decimal('0.00')
            accounts_data = []
            
            for account in revenue_accounts:
                balance = self._get_account_balance(account)
                total_revenue += balance
                
                accounts_data.append({
                    'code': account.code,
                    'label': account.name,
                    'balance': float(balance)
                })
            
            return Response({
                'total_revenue': float(total_revenue),
                'accounts': accounts_data
            })
        except Exception as e:
            return Response({
                'total_revenue': 0,
                'accounts': []
            })

    def _get_organization(self):
        """Get current user's organization"""
        user = self.request.user
        if hasattr(user, 'organization'):
            return user.organization
        return None

    def _get_account_balance(self, account):
        """Calculate account balance from journal lines"""
        from django.db.models import Sum
        
        debit_total = JournalLine.objects.filter(
            account=account,
            entry__posted=True,
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        credit_total = JournalLine.objects.filter(
            account=account,
            entry__posted=True,
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Calculate balance based on account type
        if account.account_type in ['asset', 'expense']:
            return debit_total - credit_total
        else:  # liability, equity, revenue
            return credit_total - debit_total
