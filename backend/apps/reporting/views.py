from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Count, Q, F, Prefetch
from django.core.cache import cache
from decimal import Decimal
from datetime import datetime, timedelta
import json

from apps.accounting.models import Account, JournalEntry, JournalLine
from apps.invoicing.models import Invoice, InvoiceItem
from apps.reconciliation.models import BankTransaction
from apps.core.ai_client import get_ai_client
from .services.integrity_service import IntegrityService
from .views_extended import TreasuryRevenueViewSetMixin


class ReportingViewSet(TreasuryRevenueViewSetMixin, viewsets.ViewSet):
    """
    ViewSet for financial reporting and KPIs
    Optimized for dashboard performance with <300ms response time
    """
    
    def get_queryset(self):
        """Filter by organization for multi-tenancy"""
        user = self.request.user
        if not hasattr(user, 'organization'):
            return Account.objects.none()
        return Account.objects.filter(organization=user.organization)
    
    @action(detail=False, methods=['get'])
    def kpis(self, request):
        """
        Get critical KPIs for dashboard
        Optimized with select_related/prefetch_related for <300ms load time
        """
        try:
            organization = request.user.organization
            today = timezone.now().date()
            month_start = today.replace(day=1)
            
            # Cache key for performance
            cache_key = f"kpis_{organization.id}_{today}"
            cached_data = cache.get(cache_key)
            
            if cached_data:
                return Response(cached_data)
            
            # Optimized queries with select_related/prefetch_related
            start_time = timezone.now()
            
            # 1. Trésorerie Réelle (Classe 5) - Optimized (Only validated entries)
            cash_accounts = Account.objects.filter(
                organization=organization,
                account_class__in=[5],  # Classe 5 - Trésorerie
                is_active=True
            ).select_related('organization').only('code', 'label', 'account_class')
            
            cash_balances = []
            for account in cash_accounts:
                balance = JournalLine.objects.filter(
                    entry__organization=organization,
                    account=account,
                    entry__posted=True,
                    entry__is_validated=True  # Only validated entries
                ).aggregate(
                    debit_sum=Sum('amount', filter=Q(line_type='debit')),
                    credit_sum=Sum('amount', filter=Q(line_type='credit'))
                )
                
                debit = balance['debit_sum'] or Decimal('0')
                credit = balance['credit_sum'] or Decimal('0')
                account_balance = debit - credit
                
                cash_balances.append({
                    'account_code': account.code,
                    'account_label': account.label,
                    'balance': float(account_balance)
                })
            
            total_cash = sum(item['balance'] for item in cash_balances)
            
            # 2. Performance Mensuelle (Produits vs Charges) - Optimized (Only validated entries)
            monthly_revenue = JournalLine.objects.filter(
                entry__organization=organization,
                entry__posted=True,
                entry__is_validated=True,  # Only validated entries
                entry__date__gte=month_start,
                entry__date__lte=today,
                account__account_class__in=[7],  # Classe 7 - Produits
                line_type='credit'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            monthly_expenses = JournalLine.objects.filter(
                entry__organization=organization,
                entry__posted=True,
                entry__is_validated=True,  # Only validated entries
                entry__date__gte=month_start,
                entry__date__lte=today,
                account__account_class__in=[6],  # Classe 6 - Charges
                line_type='debit'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            monthly_result = monthly_revenue - monthly_expenses
            
            # 3. Créances Client à Recouvrer - Optimized
            week_from_now = today + timedelta(days=7)
            overdue_receivables = JournalLine.objects.filter(
                entry__organization=organization,
                entry__posted=True,
                account__account_class__in=[4],  # Classe 4 - Tiers
                account__account_type='asset',
                line_type='debit',
                entry__date__lte=week_from_now
            ).select_related('account', 'entry').only(
                'amount', 'entry__date', 'account__label', 'account__code'
            )
            
            total_receivables = overdue_receivables.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            # 4. Factures en attente - Optimized
            pending_invoices = Invoice.objects.filter(
                organization=organization,
                status__in=['draft', 'sent']
            ).select_related('organization').only(
                'id', 'invoice_number', 'total_amount', 'status', 'due_date'
            )
            
            pending_amount = pending_invoices.aggregate(
                total=Sum('total_amount')
            )['total'] or Decimal('0')
            
            # 5. Transactions bancaires non rapprochées - Optimized
            unreconciled_transactions = BankTransaction.objects.filter(
                organization=organization,
                status='pending'
            ).select_related('organization').only('amount', 'transaction_date')
            
            unreconciled_amount = unreconciled_transactions.aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            # 6. Generate AI Alert - Using Mistral
            ai_alert = self._generate_ai_alert(
                total_receivables=total_receivables,
                pending_invoices=pending_invoices.count(),
                cash_balance=total_cash,
                monthly_result=monthly_result
            )
            
            # Calculate performance metrics
            query_time = (timezone.now() - start_time).total_seconds() * 1000
            
            kpis_data = {
                'cash_real': {
                    'total': float(total_cash),
                    'breakdown': cash_balances,
                    'currency': 'XOF'
                },
                'monthly_performance': {
                    'revenue': float(monthly_revenue),
                    'expenses': float(monthly_expenses),
                    'result': float(monthly_result),
                    'period': {
                        'start': month_start.isoformat(),
                        'end': today.isoformat()
                    }
                },
                'receivables': {
                    'total': float(total_receivables),
                    'count': overdue_receivables.count(),
                    'week_total': float(total_receivables)
                },
                'pending_invoices': {
                    'count': pending_invoices.count(),
                    'amount': float(pending_amount)
                },
                'unreconciled_transactions': {
                    'count': unreconciled_transactions.count(),
                    'amount': float(unreconciled_amount)
                },
                'ai_alert': ai_alert,
                'performance': {
                    'query_time_ms': round(query_time, 2),
                    'cache_hit': False
                },
                'last_updated': timezone.now().isoformat()
            }
            
            # Cache for 5 minutes
            cache.set(cache_key, kpis_data, 300)
            
            return Response(kpis_data)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors du chargement des KPIs'
            }, status=500)
    
    def _generate_ai_alert(self, total_receivables, pending_invoices, cash_balance, monthly_result):
        """Generate AI-powered alert using Mistral"""
        try:
            ai_client = get_ai_client()
            
            # Prepare context for AI
            context = f"""
            Situation financière actuelle:
            - Créances clients à recouvrir: {total_receivables:,.0f} FCFA
            - Factures en attente: {pending_invoices}
            - Trésorerie disponible: {cash_balance:,.0f} FCFA
            - Résultat mensuel: {monthly_result:,.0f} FCFA
            
            Génère une alerte concise et actionnable pour le dirigeant d'entreprise.
            """
            
            messages = [
                {
                    "role": "system",
                    "content": "Tu es un conseiller financier expert pour PME africaines. Génère des alertes brèves, précises et actionnables basées sur les données financières fournies."
                },
                {
                    "role": "user",
                    "content": f"""
                    {context}
                    
                    Réponds UNIQUEMENT au format JSON:
                    {{
                        "alert_level": "high|medium|low",
                        "title": "Titre court de l'alerte",
                        "message": "Message clair et actionnable",
                        "recommendation": "Recommandation spécifique",
                        "priority_actions": ["Action 1", "Action 2"]
                    }}
                    """
                }
            ]
            
            response = ai_client.chat(
                messages=messages,
                use_case='quick_analysis',
                temperature=0.3
            )
            
            alert_data = ai_client.extract_json_from_response(response)
            
            if alert_data:
                return {
                    'success': True,
                    'data': alert_data
                }
            else:
                # Fallback alert
                return {
                    'success': False,
                    'fallback': f"Vous avez {total_receivables:,.0f} FCFA de créances client à recouvrer cette semaine."
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback': f"Vous avez {total_receivables:,.0f} FCFA de créances client à recouvrer cette semaine."
            }
    
    @action(detail=False, methods=['get'])
    def flash_report(self, request):
        """
        Generate flash report PDF for bankers
        Includes key financial metrics and AI insights
        """
        try:
            organization = request.user.organization
            today = timezone.now().date()
            month_start = today.replace(day=1)
            
            # Get KPI data (reuse cached data if available)
            kpis_response = self.kpis(request)
            kpis_data = kpis_response.data if kpis_response.status_code == 200 else {}
            
            # Additional data for flash report
            balance_sheet_data = self._get_balance_sheet_summary(organization, today)
            income_statement_data = self._get_income_statement_summary(organization, month_start, today)
            
            flash_report_data = {
                'organization': {
                    'name': organization.name,
                    'report_date': today.isoformat(),
                    'period': f"{month_start.strftime('%B %Y')}"
                },
                'kpis': kpis_data,
                'balance_sheet': balance_sheet_data,
                'income_statement': income_statement_data,
                'generated_at': timezone.now().isoformat()
            }
            
            return Response(flash_report_data)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors de la génération du rapport flash'
            }, status=500)
    
    def _get_balance_sheet_summary(self, organization, as_of_date):
        """Get summarized balance sheet data"""
        # Assets (Classes 1-5)
        assets = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__lte=as_of_date,
            account__account_class__in=[1, 2, 3, 4, 5],
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Liabilities + Equity (Classes 1-4, 8)
        liabilities_equity = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__lte=as_of_date,
            account__account_class__in=[1, 4, 8],
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return {
            'total_assets': float(assets),
            'total_liabilities_equity': float(liabilities_equity),
            'is_balanced': abs(assets - liabilities_equity) < 0.01,
            'as_of_date': as_of_date.isoformat()
        }
    
    @action(detail=False, methods=['get'])
    def integrity_check(self, request):
        """
        Check financial integrity for the user's organization
        Returns global balance verification and integrity status
        """
        try:
            organization = request.user.organization
            integrity_service = IntegrityService()
            
            # Check if maintenance mode is active
            if integrity_service.is_maintenance_active(organization.id):
                maintenance_status = integrity_service.get_integrity_status(organization.id)
                return Response({
                    'status': 'maintenance',
                    'message': 'Financial data is currently under maintenance',
                    'maintenance_info': maintenance_status.get('maintenance_mode'),
                    'timestamp': timezone.now().isoformat()
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            # Perform global balance verification
            balance_result = integrity_service.verify_global_balance(organization.id)
            
            # Get current integrity status
            integrity_status = integrity_service.get_integrity_status(organization.id)
            
            return Response({
                'balance_verification': balance_result,
                'integrity_status': integrity_status,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors de la vérification d\'intégrité'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def verify_chains(self, request):
        """
        Verify blockchain integrity for all posted entries
        """
        try:
            organization = request.user.organization
            integrity_service = IntegrityService()
            
            # Perform chain verification
            chain_result = integrity_service.verify_organization_chains(organization.id)
            
            return Response(chain_result)
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors de la vérification des chaînes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def disable_maintenance(self, request):
        """
        Manually disable maintenance mode (admin only)
        """
        try:
            organization = request.user.organization
            
            # Check if user is admin
            if not request.user.is_staff and not request.user.is_superuser:
                return Response({
                    'error': 'Permission denied',
                    'message': 'Seuls les administrateurs peuvent désactiver le mode maintenance'
                }, status=status.HTTP_403_FORBIDDEN)
            
            integrity_service = IntegrityService()
            integrity_service.disable_maintenance_mode(organization.id, request.user)
            
            return Response({
                'success': True,
                'message': 'Mode maintenance désactivé',
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors de la désactivation du mode maintenance'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_income_statement_summary(self, organization, start_date, end_date):
        """Get summarized income statement data"""
        # Revenue (Class 7) - Only include validated entries
        revenue = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__is_validated=True,  # Only validated entries
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class__in=[7],
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Expenses (Class 6) - Only include validated entries
        expenses = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__is_validated=True,  # Only validated entries
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class__in=[6],
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        net_result = revenue - expenses
        
        return {
            'total_revenue': float(revenue),
            'total_expenses': float(expenses),
            'net_result': float(net_result),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
    
    @action(detail=False, methods=['get'], url_path='financial_summary')
    def financial_summary(self, request):
        """Get comprehensive financial summary for dashboard"""
        try:
            organization = self._get_organization()
            if not organization:
                return Response({'error': 'Organization not found'}, status=404)
            
            # Get date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)  # Last 30 days
            
            # Get key metrics
            key_metrics = self._get_key_metrics(organization, start_date, end_date)
            
            # Get balance sheet summary
            balance_sheet = self._get_balance_sheet_summary(organization)
            
            # Get income statement summary
            income_statement = self._get_income_statement_summary(organization, start_date, end_date)
            
            # Get cash flow summary
            cash_flow = self._get_cash_flow_summary(organization, start_date, end_date)
            
            return Response({
                'balance_sheet': balance_sheet,
                'income_statement': income_statement,
                'cash_flow': cash_flow,
                'key_metrics': key_metrics
            })
            
        except Exception as e:
            return Response({
                'error': str(e),
                'message': 'Erreur lors du chargement des rapports'
            }, status=500)
    
    def _get_key_metrics(self, organization, start_date, end_date):
        """Get key financial metrics"""
        # Total revenue
        total_revenue = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=7,
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Total expenses
        total_expenses = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=6,
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Net income
        net_income = total_revenue - total_expenses
        
        # Total assets
        total_assets = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            account__account_class__in=[1, 2, 3, 4, 5],
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Total liabilities
        total_liabilities = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            account__account_class=1,
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Equity
        equity = total_assets - total_liabilities
        
        # Cash balance
        cash_balance = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            account__account_number__startswith='5',
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Working capital
        working_capital = cash_balance - total_liabilities
        
        return {
            'total_revenue': float(total_revenue),
            'total_expenses': float(total_expenses),
            'net_income': float(net_income),
            'total_assets': float(total_assets),
            'total_liabilities': float(total_liabilities),
            'equity': float(equity),
            'cash_balance': float(cash_balance),
            'working_capital': float(working_capital)
        }
    
    def _get_cash_flow_summary(self, organization, start_date, end_date):
        """Get cash flow summary"""
        # Operating cash flow
        operating_cf = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class__in=[6, 7],
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Investing cash flow
        investing_cf = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class__in=[2, 3, 4, 5],
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Financing cash flow
        financing_cf = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=1,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        return {
            'operating_cash_flow': float(operating_cf),
            'investing_cash_flow': float(investing_cf),
            'financing_cash_flow': float(financing_cf),
            'net_cash_flow': float(operating_cf + investing_cf + financing_cf)
        }
    
    def _get_organization(self):
        """Get user's organization"""
        user = self.request.user
        if hasattr(user, 'organization'):
            return user.organization
        return None
    
    def _get_balance_sheet_summary(self, organization):
        """Get balance sheet summary"""
        # Assets (Classes 1-5)
        assets = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            account__account_class__in=[1, 2, 3, 4, 5],
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Liabilities (Class 1)
        liabilities = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            account__account_class=1,
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Equity (Assets - Liabilities)
        equity = assets - liabilities
        
        return {
            'total_assets': float(assets),
            'total_liabilities': float(liabilities),
            'equity': float(equity)
        }
    
    def _get_income_statement_summary(self, organization, start_date, end_date):
        """Get income statement summary"""
        # Revenue (Class 7)
        revenue = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=7,
            line_type='credit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        # Expenses (Class 6)
        expenses = JournalLine.objects.filter(
            entry__organization=organization,
            entry__posted=True,
            entry__date__gte=start_date,
            entry__date__lte=end_date,
            account__account_class=6,
            line_type='debit'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
        
        net_result = revenue - expenses
        
        return {
            'total_revenue': float(revenue),
            'total_expenses': float(expenses),
            'net_result': float(net_result),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        }
