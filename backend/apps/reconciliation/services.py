import csv
import io
import uuid
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.accounting.models import JournalLine
from .models import BankTransaction, ImportBatch, ReconciliationRule


class TransactionParserService:
    """Service for parsing CSV bank transaction files"""
    
    @staticmethod
    def parse_csv_file(csv_file, organization, created_by, receipt_image=None) -> ImportBatch:
        """
        Parse CSV file and create bank transactions
        
        Expected CSV format:
        Date,Description,Amount,Reference
        2024-05-21,"Payment from Client",50000.00,"REF001"
        """
        
        # Create import batch
        batch_id = f"IMPORT_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        batch = ImportBatch.objects.create(
            organization=organization,
            batch_id=batch_id,
            filename=csv_file.name,
            created_by=created_by
        )
        
        try:
            # Read CSV content
            csv_content = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            transactions = []
            failed_rows = 0
            
            for row_num, row in enumerate(csv_reader, start=1):
                try:
                    transaction_data = TransactionParserService.parse_row(row, batch_id, organization)
                    if transaction_data:
                        # Add receipt image to the first transaction if provided
                        if receipt_image and len(transactions) == 0:
                            transaction_data['receipt_image'] = receipt_image
                        transactions.append(BankTransaction(**transaction_data))
                except Exception as e:
                    failed_rows += 1
                    print(f"Error parsing row {row_num}: {e}")
                    continue
            
            # Create transactions in bulk
            with transaction.atomic():
                BankTransaction.objects.bulk_create(transactions, batch_size=100)
            
            # Update batch status
            batch.total_rows = len(transactions) + failed_rows
            batch.imported_rows = len(transactions)
            batch.failed_rows = failed_rows
            batch.status = 'completed'
            batch.completed_at = timezone.now()
            batch.save()
            
        except Exception as e:
            batch.status = 'failed'
            batch.error_message = str(e)
            batch.save()
            raise ValidationError(f"Erreur lors du traitement du fichier: {e}")
        
        return batch
    
    @staticmethod
    def parse_row(row: Dict, batch_id: str, organization) -> Optional[Dict]:
        """Parse a single CSV row"""
        
        # Required fields
        date_str = row.get('Date', '').strip()
        description = row.get('Description', '').strip()
        amount_str = row.get('Amount', '').strip()
        reference = row.get('Reference', '').strip()
        
        if not all([date_str, description, amount_str]):
            raise ValueError("Champs requis manquants: Date, Description, Amount")
        
        # Parse date
        try:
            if '/' in date_str:
                # Format: DD/MM/YYYY
                day, month, year = date_str.split('/')
                transaction_date = date(int(year), int(month), int(day))
            elif '-' in date_str:
                # Format: YYYY-MM-DD
                transaction_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                raise ValueError("Format de date non reconnu")
        except Exception:
            raise ValueError(f"Date invalide: {date_str}")
        
        # Parse amount
        try:
            amount = Decimal(str(amount_str).replace(',', '').replace(' ', ''))
            if amount < 0:
                amount = abs(amount)
                transaction_type = 'debit'
            else:
                transaction_type = 'credit'
        except (InvalidOperation, ValueError):
            raise ValueError(f"Montant invalide: {amount_str}")
        
        # Generate reference if not provided
        if not reference:
            reference = f"AUTO_{transaction_date.strftime('%Y%m%d')}_{uuid.uuid4().hex[:12].upper()}"
        else:
            # Si une référence est fournie, ajouter un suffixe unique pour éviter les doublons
            from .models import BankTransaction
            original_ref = reference
            counter = 1
            while BankTransaction.objects.filter(reference=reference, organization=organization).exists():
                reference = f"{original_ref}_DUPLICATE_{counter}"
                counter += 1
        
        return {
            'organization': organization,
            'date': transaction_date,
            'description': description[:500],  # Limit to 500 chars
            'amount': amount,
            'transaction_type': transaction_type,
            'reference': reference,
            'import_batch_id': batch_id,
        }


class MatchingService:
    """Service for matching bank transactions with journal lines"""
    
    @staticmethod
    def find_matches_for_transaction(bank_transaction: BankTransaction) -> List[Tuple[JournalLine, int]]:
        """
        Find potential matches for a bank transaction
        Returns list of (journal_line, confidence_score) tuples
        """
        
        organization = bank_transaction.organization
        matches = []
        
        # Get unmatched journal lines for the same organization
        unmatched_lines = JournalLine.objects.filter(
            entry__organization=organization,
            reconciled=False,
            amount=bank_transaction.amount
        ).select_related('account', 'entry')
        
        for line in unmatched_lines:
            confidence = MatchingService.calculate_match_score(bank_transaction, line)
            if confidence > 30:  # Minimum confidence threshold
                matches.append((line, confidence))
        
        # Sort by confidence score (highest first)
        matches.sort(key=lambda x: x[1], reverse=True)
        
        return matches
    
    @staticmethod
    def calculate_match_score(bank_transaction: BankTransaction, journal_line: JournalLine) -> int:
        """Calculate confidence score for matching"""
        
        score = 0
        
        # Exact amount match (base score)
        if bank_transaction.amount == journal_line.amount:
            score += 50
        
        # Date proximity (within 3 days)
        if bank_transaction.date == journal_line.entry.date:
            score += 30
        elif abs((bank_transaction.date - journal_line.entry.date).days) <= 3:
            score += 20
        
        # Description matching
        bank_desc = bank_transaction.description.lower()
        entry_desc = journal_line.entry.description.lower()
        
        if bank_desc in entry_desc or entry_desc in bank_desc:
            score += 15
        
        # Account type matching (heuristic)
        if bank_transaction.transaction_type == 'credit':
            # Credit transaction should match revenue or liability accounts
            if journal_line.account.account_type in ['revenue', 'liability', 'equity']:
                score += 10
        else:
            # Debit transaction should match asset or expense accounts
            if journal_line.account.account_type in ['asset', 'expense']:
                score += 10
        
        # Apply reconciliation rules
        rules = ReconciliationRule.objects.filter(
            organization=bank_transaction.organization,
            is_active=True,
            target_account=journal_line.account
        )
        
        for rule in rules:
            if MatchingService.apply_rule(bank_transaction, rule):
                score += rule.confidence_boost
        
        return min(score, 100)  # Cap at 100
    
    @staticmethod
    def apply_rule(bank_transaction: BankTransaction, rule: ReconciliationRule) -> bool:
        """Apply a reconciliation rule to a transaction"""
        
        params = rule.parameters
        
        if rule.rule_type == 'amount_exact':
            return bank_transaction.amount == Decimal(str(params.get('amount', 0)))
        
        elif rule.rule_type == 'amount_range':
            min_amount = Decimal(str(params.get('min_amount', 0)))
            max_amount = Decimal(str(params.get('max_amount', 999999999)))
            return min_amount <= bank_transaction.amount <= max_amount
        
        elif rule.rule_type == 'description_contains':
            keywords = params.get('keywords', [])
            if isinstance(keywords, str):
                keywords = [keywords]
            
            bank_desc = bank_transaction.description.lower()
            return any(keyword.lower() in bank_desc for keyword in keywords)
        
        elif rule.rule_type == 'reference_contains':
            keywords = params.get('keywords', [])
            if isinstance(keywords, str):
                keywords = [keywords]
            
            bank_ref = bank_transaction.reference.lower()
            return any(keyword.lower() in bank_ref for keyword in keywords)
        
        elif rule.rule_type == 'date_range':
            start_date = datetime.strptime(params.get('start_date'), '%Y-%m-%d').date()
            end_date = datetime.strptime(params.get('end_date'), '%Y-%m-%d').date()
            return start_date <= bank_transaction.date <= end_date
        
        return False
    
    @staticmethod
    @transaction.atomic
    def reconcile_transaction(bank_transaction: BankTransaction, journal_line: JournalLine, matched_by=None):
        """
        Atomically reconcile a bank transaction with a journal line
        """
        
        # Mark transaction as matched
        bank_transaction.mark_as_matched(journal_line, matched_by)
        
        # Mark journal line as reconciled
        journal_line.reconciled = True
        journal_line.reconciled_at = timezone.now()
        journal_line.reconciled_by = matched_by
        journal_line.save()
        
        # Update confidence score
        confidence = MatchingService.calculate_match_score(bank_transaction, journal_line)
        bank_transaction.confidence_score = confidence
        bank_transaction.save()
    
    @staticmethod
    def auto_match_transactions(organization, limit: int = 100):
        """
        Automatically match transactions with high confidence scores
        """
        
        # Get pending transactions
        pending_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='pending'
        ).order_by('-date')[:limit]
        
        matches_made = 0
        
        for transaction in pending_transactions:
            potential_matches = MatchingService.find_matches_for_transaction(transaction)
            
            # Auto-match if confidence is high (>= 80)
            if potential_matches and potential_matches[0][1] >= 80:
                journal_line, confidence = potential_matches[0]
                MatchingService.reconcile_transaction(transaction, journal_line)
                matches_made += 1
        
        return matches_made
    
    @staticmethod
    def get_reconciliation_stats(organization):
        """Get reconciliation statistics for an organization"""
        
        total_transactions = BankTransaction.objects.filter(organization=organization).count()
        matched_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='matched'
        ).count()
        pending_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='pending'
        ).count()
        flagged_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='flagged'
        ).count()
        
        total_journal_lines = JournalLine.objects.filter(entry__organization=organization).count()
        reconciled_lines = JournalLine.objects.filter(
            entry__organization=organization,
            reconciled=True
        ).count()
        
        return {
            'total_transactions': total_transactions,
            'matched_transactions': matched_transactions,
            'pending_transactions': pending_transactions,
            'flagged_transactions': flagged_transactions,
            'reconciliation_rate': (matched_transactions / total_transactions * 100) if total_transactions > 0 else 0,
            'total_journal_lines': total_journal_lines,
            'reconciled_lines': reconciled_lines,
            'journal_reconciliation_rate': (reconciled_lines / total_journal_lines * 100) if total_journal_lines > 0 else 0,
        }
