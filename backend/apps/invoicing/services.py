from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import JournalEntry, JournalLine, Account
from apps.accounting.services import AccountingService
from .models import Invoice, InvoiceItem, InvoiceSequence, TaxConfiguration


class InvoiceService:
    """Service for invoice operations and accounting integration"""
    
    @staticmethod
    def create_invoice(organization, user, invoice_data):
        """Create a new invoice with sequential numbering"""
        with transaction.atomic():
            # Get next invoice number
            invoice_number = InvoiceSequence.get_next_number(organization)
            
            # Get tax configuration
            tax_config = TaxConfiguration.get_for_organization(organization)
            
            # Create invoice
            invoice = Invoice.objects.create(
                organization=organization,
                invoice_number=invoice_number,
                created_by=user,
                tax_rate=tax_config.default_tax_rate if tax_config.tax_enabled else Decimal('0.00'),
                **invoice_data
            )
            
            return invoice
    
    @staticmethod
    def add_invoice_item(invoice, item_data):
        """Add an item to an invoice and recalculate totals"""
        with transaction.atomic():
            # Get tax configuration
            tax_config = TaxConfiguration.get_for_organization(invoice.organization)
            
            # Create invoice item
            item = InvoiceItem.objects.create(
                invoice=invoice,
                tax_rate=tax_config.default_tax_rate if tax_config.tax_enabled else Decimal('0.00'),
                **item_data
            )
            
            # Recalculate invoice totals
            InvoiceService.recalculate_invoice_totals(invoice)
            
            return item
    
    @staticmethod
    def recalculate_invoice_totals(invoice):
        """Recalculate invoice totals from items"""
        items = invoice.items.all()
        
        # Calculate totals
        subtotal = sum(item.subtotal for item in items)
        tax_amount = sum(item.tax_amount for item in items)
        total_amount = sum(item.total for item in items)
        
        # Update invoice
        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = total_amount
        invoice.save()
    
    @staticmethod
    @transaction.atomic
    def post_to_ledger(invoice, user):
        """
        Post invoice to accounting ledger
        Creates a balanced journal entry automatically
        """
        if invoice.journal_entry:
            raise ValidationError("Cette facture est déjà enregistrée en comptabilité.")
        
        if invoice.status == 'cancelled':
            raise ValidationError("Impossible d'enregistrer une facture annulée.")
        
        # Get default accounts for the organization
        try:
            # Revenue account (default for sales)
            revenue_account = Account.objects.filter(
                organization=invoice.organization,
                account_type='revenue',
                account_class=7,  # Class 7 - Products
                is_active=True
            ).first()
            
            if not revenue_account:
                revenue_account = Account.objects.filter(
                    organization=invoice.organization,
                    account_type='revenue',
                    is_active=True
                ).first()
            
            # Client receivables account (default)
            receivables_account = Account.objects.filter(
                organization=invoice.organization,
                account_type='asset',
                account_class=4,  # Class 4 - Third parties
                is_active=True
            ).first()
            
            # VAT account (if applicable)
            vat_account = None
            if invoice.tax_amount > 0:
                vat_account = Account.objects.filter(
                    organization=invoice.organization,
                    account_type='liability',
                    account_class=4,  # Class 4 - Third parties (VAT payable)
                    is_active=True
                ).first()
            
            if not revenue_account or not receivables_account:
                raise ValidationError("Comptes par défaut non configurés. Veuillez configurer les comptes de revenu et de créances clients.")
            
        except Account.DoesNotExist:
            raise ValidationError("Comptes par défaut non trouvés. Veuillez configurer le plan comptable.")
        
        # Create journal entry
        journal_entry = JournalEntry.objects.create(
            organization=invoice.organization,
            reference=f"FACT-{invoice.invoice_number}",
            date=invoice.issue_date,
            description=f"Facture {invoice.invoice_number} - {invoice.client_name}",
            created_by=user
        )
        
        # Create journal lines
        lines = []
        
        # Debit: Client receivables (total amount including VAT)
        lines.append(JournalLine(
            entry=journal_entry,
            account=receivables_account,
            line_type='debit',
            amount=invoice.total_amount,
            description=f"Créance client - Facture {invoice.invoice_number}"
        ))
        
        # Credit: Revenue (subtotal excluding VAT)
        lines.append(JournalLine(
            entry=journal_entry,
            account=revenue_account,
            line_type='credit',
            amount=invoice.subtotal,
            description=f"Vente - Facture {invoice.invoice_number}"
        ))
        
        # Credit: VAT liability (if applicable)
        if vat_account and invoice.tax_amount > 0:
            lines.append(JournalLine(
                entry=journal_entry,
                account=vat_account,
                line_type='credit',
                amount=invoice.tax_amount,
                description=f"TVA collectée - Facture {invoice.invoice_number}"
            ))
        
        # Bulk create lines
        JournalLine.objects.bulk_create(lines)
        
        # Post the journal entry
        journal_entry.post(user)
        
        # Link invoice to journal entry
        invoice.journal_entry = journal_entry
        invoice.save()
        
        return journal_entry
    
    @staticmethod
    @transaction.atomic
    def cancel_invoice(invoice, user, reason=""):
        """
        Cancel an invoice and create reversal entry
        """
        if invoice.status == 'cancelled':
            raise ValidationError("Cette facture est déjà annulée.")
        
        if invoice.status == 'paid':
            raise ValidationError("Impossible d'annuler une facture déjà payée.")
        
        # If invoice is posted to ledger, create reversal entry
        if invoice.journal_entry:
            original_entry = invoice.journal_entry
            
            # Create reversal journal entry
            reversal_entry = JournalEntry.objects.create(
                organization=invoice.organization,
                reference=f"ANNUL-{invoice.invoice_number}",
                date=timezone.now().date(),
                description=f"Annulation facture {invoice.invoice_number} - {reason}",
                created_by=user
            )
            
            # Create reversal lines (swap debit/credit)
            reversal_lines = []
            for line in original_entry.lines.all():
                reversal_lines.append(JournalLine(
                    entry=reversal_entry,
                    account=line.account,
                    line_type='credit' if line.line_type == 'debit' else 'debit',
                    amount=line.amount,
                    description=f"Annulation - {line.description}"
                ))
            
            JournalLine.objects.bulk_create(reversal_lines)
            reversal_entry.post(user)
        
        # Mark invoice as cancelled
        invoice.status = 'cancelled'
        invoice.notes = f"Annulée le {timezone.now().date()}: {reason}"
        invoice.save()
    
    @staticmethod
    def get_invoice_statistics(organization, start_date=None, end_date=None):
        """Get invoice statistics for an organization"""
        queryset = Invoice.objects.filter(organization=organization)
        
        if start_date:
            queryset = queryset.filter(issue_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(issue_date__lte=end_date)
        
        stats = {
            'total_invoices': queryset.count(),
            'draft_invoices': queryset.filter(status='draft').count(),
            'sent_invoices': queryset.filter(status='sent').count(),
            'paid_invoices': queryset.filter(status='paid').count(),
            'overdue_invoices': queryset.filter(status='overdue').count(),
            'cancelled_invoices': queryset.filter(status='cancelled').count(),
            'total_amount': queryset.aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00'),
            'paid_amount': queryset.filter(status='paid').aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00'),
            'outstanding_amount': queryset.filter(status__in=['sent', 'overdue']).aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0.00'),
        }
        
        return stats
    
    @staticmethod
    def validate_invoice_numbering(organization):
        """Validate that invoice numbering is sequential and without gaps"""
        invoices = Invoice.objects.filter(organization=organization).order_by('created_at')
        
        if not invoices.exists():
            return True, "Aucune facture à vérifier"
        
        # Extract numbers from invoice numbers
        numbers = []
        for invoice in invoices:
            try:
                # Extract the last part after the last hyphen
                number_part = invoice.invoice_number.split('-')[-1]
                numbers.append(int(number_part))
            except (ValueError, IndexError):
                return False, f"Format de numéro invalide: {invoice.invoice_number}"
        
        # Check for gaps
        numbers.sort()
        expected = range(numbers[0], numbers[-1] + 1)
        missing = set(expected) - set(numbers)
        
        if missing:
            return False, f"Numéros manquants: {sorted(missing)}"
        
        return True, "Numérotation correcte"
