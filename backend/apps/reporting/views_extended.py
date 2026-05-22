from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal
from django.db.models import Sum
from apps.accounting.models import Account, JournalLine

class TreasuryRevenueViewSetMixin:
    """Mixin pour ajouter les endpoints treasury et revenue au ReportingViewSet"""
    
    @action(detail=False, methods=['get'], url_path='treasury', permission_classes=[IsAuthenticated])
    def treasury(self, request):
        print("🔍 GORFISCA DEBUG: Treasury endpoint called!")
        """
        Get treasury data (Classe 5: comptes 52 et 57)
        Returns total treasury balance and account details
        """
        try:
            print(f"🔍 GORFISCA DEBUG: User {request.user}, Org: {getattr(request.user, 'organization', 'None')}")
            organization = self._get_organization()
            if not organization:
                print("⚠️ GORFISCA DEBUG: No organization found, returning 0")
                return Response({'total_treasury': 0, 'accounts': []})
            
            print(f"🔍 GORFISCA DEBUG: Organization {organization.id} found")
            
            # Get Classe 5 accounts (52 and 57)
            treasury_accounts = Account.objects.filter(
                organization=organization,
                code__in=['52', '57']
            ).select_related('parent')
            
            print(f"🔍 GORFISCA DEBUG: Found {treasury_accounts.count()} treasury accounts")
            
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
            
            print(f"🔍 GORFISCA DEBUG: Total treasury calculated: {total_treasury}")
            
            return Response({
                'total_treasury': float(total_treasury),
                'accounts': accounts_data
            })
        except Exception as e:
            print(f"❌ GORFISCA ERROR: Treasury endpoint failed: {str(e)}")
            return Response({
                'total_treasury': 0,
                'accounts': []
            })

    @action(detail=False, methods=['get'], url_path='revenue', permission_classes=[IsAuthenticated])
    def revenue(self, request):
        print("🔍 GORFISCA DEBUG: Revenue endpoint called!")
        """
        Get revenue data (Classe 7: comptes 701100, 706100)
        Returns total revenue and account details
        """
        try:
            print(f"🔍 GORFISCA DEBUG: User {request.user}, Org: {getattr(request.user, 'organization', 'None')}")
            organization = self._get_organization()
            if not organization:
                print("⚠️ GORFISCA DEBUG: No organization found, returning 0")
                return Response({'total_revenue': 0, 'accounts': []})
            
            print(f"🔍 GORFISCA DEBUG: Organization {organization.id} found")
            
            # Get Classe 7 accounts (701100, 706100)
            revenue_accounts = Account.objects.filter(
                organization=organization,
                code__in=['701100', '706100']
            ).select_related('parent')
            
            print(f"🔍 GORFISCA DEBUG: Found {revenue_accounts.count()} revenue accounts")
            
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
            
            print(f"🔍 GORFISCA DEBUG: Total revenue calculated: {total_revenue}")
            
            return Response({
                'total_revenue': float(total_revenue),
                'accounts': accounts_data
            })
        except Exception as e:
            print(f"❌ GORFISCA ERROR: Revenue endpoint failed: {str(e)}")
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
