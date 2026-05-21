import json
import re
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from typing import Dict, Optional, List, Tuple
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.accounting.models import Account
from apps.organizations.models import Organization
from apps.core.ai_client import get_ai_client


class AccountingAgentService:
    """AI-powered accounting assistant using centralized AI client"""
    
    def __init__(self):
        # Use centralized AI client
        self.ai_client = get_ai_client()
    
    def analyze_document_text(self, text: str, organization: Organization) -> Dict:
        """
        Analyze document text and extract accounting information
        
        Args:
            text: Raw text from invoice/receipt
            organization: User's organization for account context
            
        Returns:
            Dict with extracted information and account suggestions
        """
        
        # Get organization's chart of accounts for context
        accounts = Account.objects.filter(organization=organization, is_active=True)
        account_context = self._build_account_context(accounts)
        
        # Build the prompt for Mistral AI
        prompt = self._build_analysis_prompt(text, account_context)
        
        try:
            # Use centralized AI client for accounting analysis
            analysis_result = self.ai_client.analyze_accounting_document(
                text=text,
                account_context=account_context,
                document_type='invoice'
            )
            
            # Validate and enhance with account suggestions
            validated_data = self._validate_and_enrich_data(analysis_result, accounts)
            
            return {
                'success': True,
                'data': validated_data,
                'raw_response': json.dumps(analysis_result),
                'confidence': self._calculate_confidence(validated_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': "Erreur lors de l'analyse du document"
            }
    
    def _build_account_context(self, accounts) -> str:
        """Build context string with available accounts"""
        context = "Comptes disponibles dans le plan comptable OHADA:\n\n"
        
        # Group accounts by type
        accounts_by_type = {}
        for account in accounts:
            if account.account_type not in accounts_by_type:
                accounts_by_type[account.account_type] = []
            accounts_by_type[account.account_type].append(account)
        
        for account_type, account_list in accounts_by_type.items():
            context += f"{account_type.upper()}:\n"
            for account in account_list:
                context += f"  - {account.code}: {account.label}\n"
            context += "\n"
        
        return context
    
    def _build_analysis_prompt(self, text: str, account_context: str) -> str:
        """Build the analysis prompt for the AI"""
        
        prompt = f"""
Analyse ce document comptable et extrait les informations suivantes:

DOCUMENT:
{text}

CONTEXTE COMPTABLE:
{account_context}

INSTRUCTIONS:
1. Extrait la date (format YYYY-MM-DD)
2. Extrait le montant TTC
3. Extrait le montant HT et le taux de TVA
4. Identifie le fournisseur/client
5. Suggère les comptes OHADA appropriés (Classe 6 pour charges, Classe 4 pour fournisseurs)
6. Détermine si c'est une charge ou un revenu

Réponds UNIQUEMENT au format JSON suivant:
{{
    "date": "YYYY-MM-DD",
    "amount_ttc": 12345.67,
    "amount_ht": 10000.00,
    "vat_rate": 18.0,
    "vat_amount": 2345.67,
    "supplier": "Nom du fournisseur",
    "description": "Description de l'opération",
    "document_type": "expense" ou "revenue",
    "suggested_accounts": [
        {{
            "account_code": "6011-000",
            "account_label": "Achats de matières premières",
            "account_type": "expense",
            "confidence": 0.95,
            "reasoning": "Correspond aux achats de matières premières"
        }},
        {{
            "account_code": "4456-000", 
            "account_label": "TVA déductible",
            "account_type": "asset",
            "confidence": 0.90,
            "reasoning": "TVA déductible sur achats"
        }},
        {{
            "account_code": "4011-000",
            "account_label": "Fournisseurs",
            "account_type": "liability", 
            "confidence": 0.85,
            "reasoning": "Créance fournisseur"
        }}
    ],
    "extracted_text_snippets": [
        "Texte pertinent 1",
        "Texte pertinent 2"
    ]
}}

Important:
- Utilise uniquement les comptes disponibles dans le contexte
- Sois précis dans les montants et dates
- Indique un niveau de confiance (0.0 à 1.0) pour chaque suggestion
- Fournis une justification pour chaque suggestion de compte
"""
        
        return prompt
    
    def _parse_ai_response(self, ai_response: str) -> Dict:
        """Parse the AI response and extract JSON"""
        try:
            # Look for JSON in the response
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Fallback: try to parse the whole response
                return json.loads(ai_response)
        except json.JSONDecodeError:
            # If JSON parsing fails, create a basic structure
            return self._create_fallback_structure(ai_response)
    
    def _create_fallback_structure(self, ai_response: str) -> Dict:
        """Create fallback structure when JSON parsing fails"""
        return {
            'date': None,
            'amount_ttc': None,
            'amount_ht': None,
            'vat_rate': None,
            'vat_amount': None,
            'supplier': None,
            'description': ai_response[:200] if ai_response else "Analyse échouée",
            'document_type': 'expense',
            'suggested_accounts': [],
            'extracted_text_snippets': [ai_response[:200]] if ai_response else [],
            'parsing_error': True
        }
    
    def _validate_and_enrich_data(self, data: Dict, accounts) -> Dict:
        """Validate and enrich the parsed data"""
        validated = data.copy()
        
        # Validate and parse amounts
        for field in ['amount_ttc', 'amount_ht', 'vat_amount']:
            if field in validated and validated[field]:
                try:
                    validated[field] = float(Decimal(str(validated[field])))
                except (InvalidOperation, ValueError):
                    validated[field] = None
        
        # Validate date
        if 'date' in validated and validated['date']:
            try:
                # Try to parse date
                if isinstance(validated['date'], str):
                    # Handle various date formats
                    date_str = validated['date']
                    if re.match(r'\d{4}-\d{2}-\d{2}', date_str):
                        validated['date'] = date_str
                    else:
                        # Try to parse other formats
                        parsed_date = self._parse_date(date_str)
                        validated['date'] = parsed_date.strftime('%Y-%m-%d') if parsed_date else None
            except Exception:
                validated['date'] = None
        
        # Validate VAT rate
        if 'vat_rate' in validated and validated['vat_rate']:
            try:
                validated['vat_rate'] = float(Decimal(str(validated['vat_rate'])))
            except (InvalidOperation, ValueError):
                validated['vat_rate'] = None
        
        # Validate suggested accounts
        if 'suggested_accounts' in validated:
            validated_accounts = []
            account_codes = {account.code: account for account in accounts}
            
            for suggestion in validated['suggested_accounts']:
                if 'account_code' in suggestion:
                    account = account_codes.get(suggestion['account_code'])
                    if account:
                        # Validate the account exists and matches type
                        validated_suggestion = {
                            'account_code': account.code,
                            'account_label': account.label,
                            'account_type': account.account_type,
                            'account_class': account.account_class,
                            'confidence': min(1.0, max(0.0, float(suggestion.get('confidence', 0.5)))),
                            'reasoning': suggestion.get('reasoning', '')
                        }
                        validated_accounts.append(validated_suggestion)
            
            validated['suggested_accounts'] = validated_accounts
        
        return validated
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """Parse various date formats"""
        formats = [
            '%d/%m/%Y', '%d-%m-%Y',
            '%d/%m/%y', '%d-%m-%y',
            '%Y-%m-%d',
            '%d %B %Y', '%d %b %Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except ValueError:
                continue
        
        return None
    
    def _calculate_confidence(self, data: Dict) -> float:
        """Calculate overall confidence score"""
        factors = []
        
        # Date confidence
        if data.get('date'):
            factors.append(0.2)
        else:
            factors.append(0.0)
        
        # Amount confidence
        if data.get('amount_ttc'):
            factors.append(0.2)
        else:
            factors.append(0.0)
        
        # Supplier confidence
        if data.get('supplier'):
            factors.append(0.1)
        else:
            factors.append(0.0)
        
        # Account suggestions confidence
        suggested_accounts = data.get('suggested_accounts', [])
        if suggested_accounts:
            avg_confidence = sum(acc.get('confidence', 0) for acc in suggested_accounts) / len(suggested_accounts)
            factors.append(avg_confidence * 0.5)
        else:
            factors.append(0.0)
        
        return sum(factors)
    
    def suggest_journal_entry(self, analysis_data: Dict, organization: Organization) -> Dict:
        """
        Suggest a complete journal entry based on analysis
        
        Returns:
            Dict with suggested journal lines
        """
        if not analysis_data.get('success'):
            return {'success': False, 'error': 'No valid analysis data'}
        
        data = analysis_data['data']
        document_type = data.get('document_type', 'expense')
        
        suggested_entry = {
            'date': data.get('date'),
            'description': data.get('description', ''),
            'reference': f"AI-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'lines': []
        }
        
        # Get suggested accounts
        suggested_accounts = data.get('suggested_accounts', [])
        
        if document_type == 'expense':
            # Expense entry: Debit expense accounts, Credit supplier and VAT
            total_amount = data.get('amount_ttc', 0)
            
            # Find expense accounts (Class 6)
            expense_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'expense']
            for acc in expense_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'debit',
                    'amount': data.get('amount_ht', total_amount),
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
            
            # Find VAT account (Class 4)
            vat_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'asset' and 'TVA' in acc['account_label']]
            for acc in vat_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'debit',
                    'amount': data.get('vat_amount', 0),
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
            
            # Find supplier account (Class 4)
            supplier_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'liability' and 'Fournisseur' in acc['account_label']]
            for acc in supplier_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'credit',
                    'amount': total_amount,
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
        
        elif document_type == 'revenue':
            # Revenue entry: Debit customer, Credit revenue and VAT
            total_amount = data.get('amount_ttc', 0)
            
            # Find customer account (Class 4)
            customer_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'asset' and 'Client' in acc['account_label']]
            for acc in customer_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'debit',
                    'amount': total_amount,
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
            
            # Find revenue account (Class 7)
            revenue_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'revenue']
            for acc in revenue_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'credit',
                    'amount': data.get('amount_ht', total_amount),
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
            
            # Find VAT account (Class 4)
            vat_accounts = [acc for acc in suggested_accounts if acc.get('account_type') == 'liability' and 'TVA' in acc['account_label']]
            for acc in vat_accounts:
                suggested_entry['lines'].append({
                    'account_code': acc['account_code'],
                    'account_label': acc['account_label'],
                    'line_type': 'credit',
                    'amount': data.get('vat_amount', 0),
                    'confidence': acc.get('confidence', 0.5),
                    'reasoning': acc.get('reasoning', '')
                })
        
        # Check if entry is balanced
        total_debit = sum(line['amount'] for line in suggested_entry['lines'] if line['line_type'] == 'debit')
        total_credit = sum(line['amount'] for line in suggested_entry['lines'] if line['line_type'] == 'credit')
        
        suggested_entry['is_balanced'] = abs(total_debit - total_credit) < 0.01
        suggested_entry['total_debit'] = total_debit
        suggested_entry['total_credit'] = total_credit
        suggested_entry['confidence'] = analysis_data.get('confidence', 0.0)
        
        return {
            'success': True,
            'suggested_entry': suggested_entry,
            'analysis_data': data
        }
