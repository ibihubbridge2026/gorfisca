import re
import math
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Tuple, Dict, Optional
from django.db.models import Q, Avg
from .models import BankTransaction
from apps.accounting.models import JournalLine, JournalEntry

# Try to import invoicing models, but handle gracefully if not available
try:
    from apps.invoicing.models import Invoice
    INVOICING_AVAILABLE = True
except ImportError:
    INVOICING_AVAILABLE = False


class MatchingEngineService:
    """
    Service for intelligent matching between bank transactions and accounting records
    using advanced algorithms: Levenshtein distance, temporal tolerance, and confidence scoring
    """
    
    # Weight configuration for confidence score calculation
    TEXTUAL_WEIGHT = 0.40    # 40% for textual similarity
    AMOUNT_WEIGHT = 0.40    # 40% for exact amount match
    TEMPORAL_WEIGHT = 0.20  # 20% for date proximity
    
    # Temporal tolerance thresholds (in days)
    PERFECT_DATE_MATCH = 0      # 0 days = 100% temporal score
    GOOD_DATE_RANGE = 2         # 0-2 days = 100% temporal score
    ACCEPTABLE_DATE_RANGE = 7   # 3-7 days = 50% temporal score
    PENALTY_THRESHOLD = 7       # >7 days = temporal penalty
    
    @staticmethod
    def calculate_levenshtein_distance(s1: str, s2: str) -> int:
        """
        Calculate the Levenshtein distance between two strings
        This measures the number of edits needed to transform one string into another
        """
        # Normalize strings: lowercase, remove special characters, extra spaces
        s1 = MatchingEngineService.normalize_text(s1)
        s2 = MatchingEngineService.normalize_text(s2)
        
        # If strings are identical, return 0 immediately
        if s1 == s2:
            return 0
        
        len1, len2 = len(s1), len(s2)
        
        # Create matrix for dynamic programming
        matrix = [[0] * (len2 + 1) for _ in range(len1 + 1)]
        
        # Initialize first row and column
        for i in range(len1 + 1):
            matrix[i][0] = i
        for j in range(len2 + 1):
            matrix[0][j] = j
        
        # Fill the matrix
        for i in range(1, len1 + 1):
            for j in range(1, len2 + 1):
                cost = 0 if s1[i-1] == s2[j-1] else 1
                matrix[i][j] = min(
                    matrix[i-1][j] + 1,      # deletion
                    matrix[i][j-1] + 1,      # insertion
                    matrix[i-1][j-1] + cost  # substitution
                )
        
        return matrix[len1][len2]
    
    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Normalize text for comparison:
        - Convert to lowercase
        - Remove special characters and numbers
        - Remove extra spaces
        - Handle common African name patterns
        """
        if not text:
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Remove common transaction prefixes/suffixes
        prefixes_to_remove = ['transfert', 'reçu', 'envoyé', 'paiement', 'dépôt', 'retrait', 'facture', 'fact']
        suffixes_to_remove = ['moov', 'mtn', 'orange', 'wave', 'flooz', 'money', 'tmoney', 'om']
        
        for prefix in prefixes_to_remove:
            text = text.replace(prefix, '')
        
        for suffix in suffixes_to_remove:
            text = text.replace(suffix, '')
        
        # Remove special characters but keep letters and spaces
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        
        # Remove extra spaces and strip
        text = ' '.join(text.split())
        
        return text.strip()
    
    @staticmethod
    def calculate_textual_similarity(transaction_text: str, record_text: str) -> float:
        """
        Calculate textual similarity score (0-1) using Levenshtein distance
        Returns 1.0 for perfect match, 0.0 for completely different strings
        """
        if not transaction_text or not record_text:
            return 0.0
        
        # Normalize both texts
        norm_tx = MatchingEngineService.normalize_text(transaction_text)
        norm_record = MatchingEngineService.normalize_text(record_text)
        
        # If either is empty after normalization, return 0
        if not norm_tx or not norm_record:
            return 0.0
        
        # Calculate Levenshtein distance
        distance = MatchingEngineService.calculate_levenshtein_distance(norm_tx, norm_record)
        
        # Calculate maximum possible distance (length of longer string)
        max_distance = max(len(norm_tx), len(norm_record))
        
        if max_distance == 0:
            return 1.0  # Both strings are empty after normalization
        
        # Convert distance to similarity score (0-1)
        similarity = 1 - (distance / max_distance)
        
        return max(0.0, similarity)
    
    @staticmethod
    def calculate_temporal_score(tx_date: date, record_date: date) -> float:
        """
        Calculate temporal proximity score (0-1) based on date difference
        - Same day: 1.0
        - 1-2 days difference: 1.0
        - 3-7 days difference: 0.5
        - >7 days difference: decreasing penalty
        """
        if not tx_date or not record_date:
            return 0.0
        
        # Calculate absolute difference in days
        date_diff = abs((tx_date - record_date).days)
        
        if date_diff <= MatchingEngineService.GOOD_DATE_RANGE:
            return 1.0  # Perfect temporal match
        elif date_diff <= MatchingEngineService.ACCEPTABLE_DATE_RANGE:
            return 0.5  # Acceptable temporal match
        else:
            # Exponential decay for dates beyond acceptable range
            penalty_days = date_diff - MatchingEngineService.PENALTY_THRESHOLD
            decay_factor = math.exp(-penalty_days / 7.0)  # Decay over weeks
            return max(0.1, decay_factor * 0.5)  # Minimum 0.1 score
    
    @staticmethod
    def calculate_amount_score(tx_amount: Decimal, record_amount: Decimal) -> float:
        """
        Calculate amount match score (0-1)
        Returns 1.0 for exact match, 0.0 for different amounts
        """
        if tx_amount is None or record_amount is None:
            return 0.0
        
        return 1.0 if tx_amount == record_amount else 0.0
    
    @staticmethod
    def calculate_confidence_score(
        textual_similarity: float,
        amount_score: float,
        temporal_score: float
    ) -> float:
        """
        Calculate combined confidence score using weighted formula
        Formula: (textual * 0.40) + (amount * 0.40) + (temporal * 0.20)
        Returns score between 0 and 100
        """
        weighted_textual = textual_similarity * MatchingEngineService.TEXTUAL_WEIGHT
        weighted_amount = amount_score * MatchingEngineService.AMOUNT_WEIGHT
        weighted_temporal = temporal_score * MatchingEngineService.TEMPORAL_WEIGHT
        
        combined_score = weighted_textual + weighted_amount + weighted_temporal
        
        # Convert to 0-100 scale and round to 2 decimal places
        return round(combined_score * 100, 2)
    
    @staticmethod
    def find_matches_for_transaction(bank_transaction: BankTransaction) -> List[Dict]:
        """
        Find potential matches for a bank transaction across:
        - Journal entries (accounting records)
        - Invoices (customer/supplier invoices)
        
        Returns list of matches with confidence scores and details
        """
        organization = bank_transaction.organization
        matches = []
        
        # Search for matching journal lines
        journal_matches = MatchingEngineService._find_journal_matches(bank_transaction, organization)
        matches.extend(journal_matches)
        
        # Search for matching invoices
        invoice_matches = MatchingEngineService._find_invoice_matches(bank_transaction, organization)
        matches.extend(invoice_matches)
        
        # Sort by confidence score (highest first)
        matches.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        return matches
    
    @staticmethod
    def _find_journal_matches(bank_transaction: BankTransaction, organization) -> List[Dict]:
        """Find matches in journal lines"""
        matches = []
        
        # Get unmatched journal lines for the same organization
        journal_lines = JournalLine.objects.filter(
            entry__organization=organization,
            reconciled=False
        ).select_related('account', 'entry')
        
        # Filter by amount first (more efficient)
        amount_matches = journal_lines.filter(amount=bank_transaction.amount)
        
        for journal_line in amount_matches:
            # Calculate individual scores
            textual_sim = MatchingEngineService.calculate_textual_similarity(
                bank_transaction.description,
                journal_line.entry.description
            )
            amount_score = MatchingEngineService.calculate_amount_score(
                bank_transaction.amount,
                journal_line.amount
            )
            temporal_score = MatchingEngineService.calculate_temporal_score(
                bank_transaction.date,
                journal_line.entry.date
            )
            
            # Calculate combined confidence score
            confidence = MatchingEngineService.calculate_confidence_score(
                textual_sim, amount_score, temporal_score
            )
            
            # Only include matches with reasonable confidence
            if confidence >= 30:  # Minimum threshold
                matches.append({
                    'type': 'journal',
                    'id': journal_line.id,
                    'reference': journal_line.entry.reference,
                    'description': journal_line.entry.description,
                    'account_code': journal_line.account.code,
                    'account_label': journal_line.account.label,
                    'amount': journal_line.amount,
                    'date': journal_line.entry.date,
                    'confidence_score': confidence,
                    'textual_similarity': textual_sim,
                    'amount_score': amount_score,
                    'temporal_score': temporal_score
                })
        
        return matches
    
    @staticmethod
    def _find_invoice_matches(bank_transaction: BankTransaction, organization) -> List[Dict]:
        """Find matches in invoices"""
        matches = []
        
        if not INVOICING_AVAILABLE:
            return matches
            
        # Get unpaid invoices for the same organization
        invoices = Invoice.objects.filter(
            organization=organization,
            status__in=['sent', 'overdue']
        )
            
            # Filter by amount
        amount_matches = invoices.filter(total_amount=bank_transaction.amount)
        
        for invoice in amount_matches:
            # Calculate individual scores
            textual_sim = MatchingEngineService.calculate_textual_similarity(
                bank_transaction.description,
                f"{invoice.customer_name} {invoice.reference}"
            )
            amount_score = MatchingEngineService.calculate_amount_score(
                bank_transaction.amount,
                invoice.total_amount
            )
            temporal_score = MatchingEngineService.calculate_temporal_score(
                bank_transaction.date,
                invoice.issue_date
            )
            
            # Calculate combined confidence score
            confidence = MatchingEngineService.calculate_confidence_score(
                textual_sim, amount_score, temporal_score
            )
            
            # Only include matches with reasonable confidence
            if confidence >= 30:  # Minimum threshold
                matches.append({
                    'type': 'invoice',
                    'id': invoice.id,
                    'reference': invoice.reference,
                    'description': f"Facture {invoice.customer_name}",
                    'account_code': '411000',  # Customers account
                    'account_label': 'Clients',
                    'amount': invoice.total_amount,
                    'date': invoice.issue_date,
                    'confidence_score': confidence,
                    'textual_similarity': textual_sim,
                    'amount_score': amount_score,
                    'temporal_score': temporal_score
                })
        
        return matches
    
    @staticmethod
    def auto_match_transactions(organization, confidence_threshold: float = 80.0) -> Dict:
        """
        Automatically match transactions with high confidence scores
        Returns statistics about the matching process
        """
        # Get pending transactions
        pending_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='pending'
        )
        
        matches_made = 0
        total_processed = 0
        high_confidence_matches = 0
        
        for transaction in pending_transactions:
            matches = MatchingEngineService.find_matches_for_transaction(transaction)
            total_processed += 1
            
            if matches and matches[0]['confidence_score'] >= confidence_threshold:
                # Auto-match the highest confidence match
                best_match = matches[0]
                
                # Update transaction with confidence score
                transaction.confidence_score = best_match['confidence_score']
                
                # Here you would typically perform the actual matching
                # For now, we'll just mark as high confidence
                matches_made += 1
                high_confidence_matches += 1
        
        return {
            'total_processed': total_processed,
            'matches_made': matches_made,
            'high_confidence_matches': high_confidence_matches,
            'confidence_threshold': confidence_threshold
        }
    
    @staticmethod
    def get_matching_statistics(organization) -> Dict:
        """Get comprehensive matching statistics for an organization"""
        
        total_transactions = BankTransaction.objects.filter(organization=organization).count()
        matched_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='matched'
        ).count()
        pending_transactions = BankTransaction.objects.filter(
            organization=organization,
            status='pending'
        ).count()
        
        # Calculate average confidence score
        avg_confidence = BankTransaction.objects.filter(
            organization=organization,
            confidence_score__gt=0
        ).aggregate(avg_score=Avg('confidence_score'))['avg_score'] or 0
        
        return {
            'total_transactions': total_transactions,
            'matched_transactions': matched_transactions,
            'pending_transactions': pending_transactions,
            'reconciliation_rate': (matched_transactions / total_transactions * 100) if total_transactions > 0 else 0,
            'average_confidence_score': round(avg_confidence, 2),
            'high_confidence_matches': BankTransaction.objects.filter(
                organization=organization,
                confidence_score__gte=80
            ).count(),
            'medium_confidence_matches': BankTransaction.objects.filter(
                organization=organization,
                confidence_score__gte=50,
                confidence_score__lt=80
            ).count(),
            'low_confidence_matches': BankTransaction.objects.filter(
                organization=organization,
                confidence_score__gt=0,
                confidence_score__lt=50
            ).count()
        }
