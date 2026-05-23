import json
import logging
from typing import Dict, List, Optional, Union, Any
from django.conf import settings
from django.core.exceptions import ValidationError

# Lazy / version-tolerant import of the Mistral SDK.
# v1.x exports `Mistral`, v0.x exported `MistralClient`. We try both.
try:
    from mistralai import Mistral  # type: ignore
except ImportError:  # pragma: no cover
    try:
        from mistralai.client import MistralClient as Mistral  # type: ignore
    except ImportError:
        Mistral = None  # type: ignore

# ChatCompletionResponse was relocated/renamed across versions.
try:
    from mistralai.models import ChatCompletionResponse  # type: ignore
except ImportError:  # pragma: no cover
    ChatCompletionResponse = Any  # type: ignore

logger = logging.getLogger(__name__)


class AIClient:
    """
    Centralized AI client wrapper for Mistral AI services
    Supports multiple models with intelligent routing based on task complexity
    """
    
    # Model configurations
    MODELS = {
        'small': {
            'name': 'mistral-small-latest',
            'max_tokens': 1000,
            'temperature': 0.1,
            'use_cases': ['quick_analysis', 'simple_extraction', 'basic_classification']
        },
        'large': {
            'name': 'mistral-large-latest', 
            'max_tokens': 4000,
            'temperature': 0.2,
            'use_cases': ['complex_analysis', 'document_parsing', 'accounting_reasoning', 'journal_entry_generation']
        }
    }
    
    def __init__(self):
        """Initialize AI client with API key from settings"""
        self.api_key = getattr(settings, 'MISTRAL_API_KEY', None)
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY is not configured in settings")
        
        self.client = Mistral(api_key=self.api_key)
        self.default_model = 'small'
        
    def chat(self, 
             messages: List[Dict[str, str]], 
             model: Optional[str] = None,
             temperature: Optional[float] = None,
             max_tokens: Optional[int] = None,
             use_case: Optional[str] = None) -> ChatCompletionResponse:
        """
        Send chat completion request to Mistral AI
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Override model selection
            temperature: Override temperature
            max_tokens: Override max tokens
            use_case: Use case for intelligent model selection
            
        Returns:
            ChatCompletionResponse from Mistral AI
        """
        try:
            # Determine model to use
            selected_model = self._select_model(model, use_case)
            model_config = self.MODELS[selected_model]
            
            # Prepare parameters
            params = {
                'model': model_config['name'],
                'messages': messages,
                'temperature': temperature or model_config['temperature'],
                'max_tokens': max_tokens or model_config['max_tokens']
            }
            
            logger.info(f"AI Request - Model: {model_config['name']}, Use case: {use_case}")
            
            # Make the API call
            response = self.client.chat.complete(**params)
            
            logger.info(f"AI Response - Tokens used: {response.usage.total_tokens if response.usage else 'N/A'}")
            
            return response
            
        except Exception as e:
            logger.error(f"AI API Error: {str(e)}")
            raise ValidationError(f"Erreur lors de l'appel à l'IA: {str(e)}")

    def chat_completion(self,
                        messages: List[Dict[str, str]],
                        temperature: float = 0.7,
                        max_tokens: int = 800) -> str:
        """
        Méthode simplifiée pour conversation chat - wrapper autour de chat()
        Utilisée par Moki pour les conversations naturelles
        
        Args:
            messages: Historique de conversation avec rôles
            temperature: Créativité (0.7 = équilibré)
            max_tokens: Longueur max de réponse
            
        Returns:
            str: Contenu texte de la réponse
        """
        try:
            response = self.chat(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                use_case='chat_assistant'
            )
            
            # Extraire le contenu de la réponse
            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
            else:
                return "Désolé, je n'ai pas pu générer de réponse."
                
        except Exception as e:
            logger.error(f"Chat completion error: {str(e)}")
            return f"Erreur technique: {str(e)}"
    
    def _select_model(self, model: Optional[str], use_case: Optional[str]) -> str:
        """
        Intelligent model selection based on use case or explicit model choice
        """
        if model and model in self.MODELS:
            return model
        
        if use_case:
            for model_name, config in self.MODELS.items():
                if use_case in config['use_cases']:
                    return model_name
        
        return self.default_model
    
    def extract_json_from_response(self, response: ChatCompletionResponse) -> Optional[Dict]:
        """
        Extract JSON from AI response content
        """
        if not response.choices or not response.choices[0].message.content:
            return None
        
        content = response.choices[0].message.content
        
        try:
            # Look for JSON in the response
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # Try to parse the whole response as JSON
                return json.loads(content)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON from AI response: {e}")
            return None
    
    def analyze_accounting_document(self, 
                                  text: str, 
                                  account_context: str,
                                  document_type: str = 'invoice') -> Dict:
        """
        Specialized method for accounting document analysis
        
        Args:
            text: Document text to analyze
            account_context: Available accounts context
            document_type: Type of document (invoice, receipt, etc.)
            
        Returns:
            Dict with extracted accounting information
        """
        system_prompt = self._build_accounting_system_prompt(document_type)
        user_prompt = self._build_accounting_user_prompt(text, account_context)
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(
            messages=messages,
            use_case='complex_analysis',
            temperature=0.1
        )
        
        # Extract and validate the response
        extracted_data = self.extract_json_from_response(response)
        
        if not extracted_data:
            # Fallback to basic text analysis
            return self._fallback_text_analysis(text, document_type)
        
        return self._validate_accounting_data(extracted_data)
    
    def generate_journal_entry_suggestion(self, 
                                       analysis_data: Dict,
                                       organization_context: str) -> Dict:
        """
        Generate journal entry suggestion based on analysis data
        
        Args:
            analysis_data: Results from document analysis
            organization_context: Organization-specific accounting context
            
        Returns:
            Dict with suggested journal entry
        """
        system_prompt = """
        Tu es un expert-comptable OHADA. Génère une écriture comptable équilibrée 
        basée sur les données d'analyse fournies.
        
        Règles importantes:
        1. L'écriture doit être équilibrée (Total Débit = Total Crédit)
        2. Utilise les comptes OHADA appropriés
        3. Respecte le principe de la partie double
        4. Fournis une justification pour chaque ligne
        """
        
        user_prompt = f"""
        Données d'analyse:
        {json.dumps(analysis_data, indent=2)}
        
        Contexte organisation:
        {organization_context}
        
        Génère une écriture comptable au format JSON:
        {{
            "date": "YYYY-MM-DD",
            "description": "Description de l'opération",
            "reference": "Référence automatique",
            "lines": [
                {{
                    "account_code": "XXXX-XXX",
                    "account_label": "Nom du compte",
                    "line_type": "debit|credit",
                    "amount": 12345.67,
                    "confidence": 0.95,
                    "reasoning": "Justification de la ligne"
                }}
            ],
            "is_balanced": true,
            "total_debit": 12345.67,
            "total_credit": 12345.67
        }}
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(
            messages=messages,
            use_case='journal_entry_generation',
            temperature=0.1
        )
        
        suggested_entry = self.extract_json_from_response(response)
        
        if suggested_entry:
            return self._validate_journal_entry(suggested_entry)
        else:
            return self._create_fallback_journal_entry(analysis_data)
    
    def classify_document_type(self, text: str) -> Dict:
        """
        Classify document type using AI
        
        Args:
            text: Document text to classify
            
        Returns:
            Dict with classification results
        """
        system_prompt = """
        Classifie le type de document comptable. Réponds uniquement au format JSON:
        {
            "document_type": "invoice|receipt|expense|revenue|other",
            "confidence": 0.95,
            "reasoning": "Justification de la classification"
        }
        """
        
        user_prompt = f"""
        Texte du document:
        {text[:2000]}  # Limit to first 2000 chars for classification
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(
            messages=messages,
            use_case='simple_classification',
            temperature=0.1
        )
        
        return self.extract_json_from_response(response) or {
            "document_type": "other",
            "confidence": 0.0,
            "reasoning": "Classification échouée"
        }
    
    def extract_entities(self, text: str, entity_types: List[str]) -> Dict:
        """
        Extract specific entities from text
        
        Args:
            text: Text to extract entities from
            entity_types: List of entity types to extract
            
        Returns:
            Dict with extracted entities
        """
        system_prompt = f"""
        Extrais les entités suivantes du texte: {', '.join(entity_types)}
        Réponds uniquement au format JSON:
        {{
            "entities": {{
                "date": "YYYY-MM-DD",
                "amount": 12345.67,
                "supplier": "Nom du fournisseur",
                "vat_rate": 18.0
            }}
        }}
        """
        
        user_prompt = f"""
        Texte à analyser:
        {text}
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response = self.chat(
            messages=messages,
            use_case='simple_extraction',
            temperature=0.1
        )
        
        return self.extract_json_from_response(response) or {"entities": {}}
    
    def _build_accounting_system_prompt(self, document_type: str) -> str:
        """Build system prompt for accounting document analysis"""
        return f"""
        Tu es un expert-comptable spécialisé dans la comptabilité OHADA pour les PME africaines.
        Analyse ce {document_type} et extrait les informations comptables pertinentes.
        
        Instructions:
        1. Extrait la date (format YYYY-MM-DD)
        2. Extrait les montants (HT, TTC, TVA)
        3. Identifie le fournisseur/client
        4. Suggère les comptes OHADA appropriés
        5. Indique un niveau de confiance pour chaque suggestion
        
        Réponds UNIQUEMENT au format JSON structuré.
        """
    
    def _build_accounting_user_prompt(self, text: str, account_context: str) -> str:
        """Build user prompt for accounting analysis"""
        return f"""
        DOCUMENT:
        {text}
        
        CONTEXTE COMPTABLE:
        {account_context}
        
        Analyse ce document et extrait les informations comptables au format JSON:
        {{
            "date": "YYYY-MM-DD",
            "amount_ttc": 12345.67,
            "amount_ht": 10000.00,
            "vat_rate": 18.0,
            "vat_amount": 2345.67,
            "supplier": "Nom du fournisseur",
            "description": "Description de l'opération",
            "document_type": "expense|revenue",
            "suggested_accounts": [
                {{
                    "account_code": "XXXX-XXX",
                    "account_label": "Nom du compte",
                    "account_type": "expense|revenue|asset|liability|equity",
                    "confidence": 0.95,
                    "reasoning": "Justification du choix"
                }}
            ]
        }}
        """
    
    def _validate_accounting_data(self, data: Dict) -> Dict:
        """Validate and clean accounting data"""
        validated = data.copy()
        
        # Validate amounts
        for field in ['amount_ttc', 'amount_ht', 'vat_amount']:
            if field in validated and validated[field]:
                try:
                    validated[field] = float(validated[field])
                except (ValueError, TypeError):
                    validated[field] = None
        
        # Validate VAT rate
        if 'vat_rate' in validated and validated['vat_rate']:
            try:
                validated['vat_rate'] = float(validated['vat_rate'])
            except (ValueError, TypeError):
                validated['vat_rate'] = None
        
        # Validate suggested accounts
        if 'suggested_accounts' in validated:
            validated_accounts = []
            for account in validated['suggested_accounts']:
                if 'account_code' in account and 'confidence' in account:
                    account['confidence'] = min(1.0, max(0.0, float(account['confidence'])))
                    validated_accounts.append(account)
            validated['suggested_accounts'] = validated_accounts
        
        return validated
    
    def _validate_journal_entry(self, entry: Dict) -> Dict:
        """Validate journal entry structure and balance"""
        if 'lines' not in entry:
            return entry
        
        lines = entry['lines']
        total_debit = sum(line.get('amount', 0) for line in lines if line.get('line_type') == 'debit')
        total_credit = sum(line.get('amount', 0) for line in lines if line.get('line_type') == 'credit')
        
        entry['total_debit'] = total_debit
        entry['total_credit'] = total_credit
        entry['is_balanced'] = abs(total_debit - total_credit) < 0.01
        
        return entry
    
    def _fallback_text_analysis(self, text: str, document_type: str) -> Dict:
        """Fallback basic text analysis when AI fails"""
        return {
            'date': None,
            'amount_ttc': None,
            'amount_ht': None,
            'vat_rate': None,
            'vat_amount': None,
            'supplier': None,
            'description': f"Analyse {document_type} échouée",
            'document_type': 'expense',
            'suggested_accounts': [],
            'fallback_mode': True
        }
    
    def _create_fallback_journal_entry(self, analysis_data: Dict) -> Dict:
        """Create fallback journal entry when AI generation fails"""
        return {
            'date': analysis_data.get('date'),
            'description': analysis_data.get('description', 'Écriture générée automatiquement'),
            'reference': f"FALLBACK-{__import__('datetime').datetime.now().strftime('%Y%m%d%H%M%S')}",
            'lines': [],
            'is_balanced': False,
            'total_debit': 0,
            'total_credit': 0,
            'fallback_mode': True
        }
    
    def generate_magic_match_suggestions(self, 
                                      transaction_data: Dict,
                                      journal_entries: List[Dict],
                                      organization_context: str) -> List[Dict]:
        """
        Generate AI-powered Magic Match suggestions for bank reconciliation
        
        Args:
            transaction_data: Bank transaction data
            journal_entries: List of journal entries to match against
            organization_context: Organization-specific accounting context
            
        Returns:
            List of match suggestions with scores and OHADA account suggestions
        """
        system_prompt = """
        Tu es un expert-comptable OHADA spécialisé en rapprochement bancaire.
        Analyse une transaction bancaire et suggères les meilleures correspondances 
        avec les écritures comptables existantes.
        
        Règles importantes:
        1. Compare le montant, la date et la description
        2. Suggères des comptes OHADA appropriés (classes 6 pour charges, 7 pour produits)
        3. Fournis un score de confiance (0-1) pour chaque correspondance
        4. Expliques tes raisonnements
        5. Respectes les normes comptables OHADA
        """
        
        user_prompt = f"""
        TRANSACTION BANCAIRE:
        {json.dumps(transaction_data, indent=2)}
        
        ÉCRITURES COMPTABLES DISPONIBLES:
        {json.dumps(journal_entries[:10], indent=2)}  # Limit to 10 for context
        
        CONTEXTE ORGANISATION:
        {organization_context}
        
        Génères des suggestions de correspondance au format JSON:
        {{
            "matches": [
                {{
                    "journal_entry": {{
                        "id": 123,
                        "date": "YYYY-MM-DD",
                        "description": "Description",
                        "amount": 12345.67
                    }},
                    "score": 0.95,
                    "suggested_account": {{
                        "code": "601",
                        "label": "Achats de marchandises",
                        "reason": "Justification du choix du compte"
                    }},
                    "confidence": "high|medium|low",
                    "match_reasons": [
                        "Montant identique",
                        "Date proche",
                        "Mots-clés similaires"
                    ]
                }}
            ]
        }}
        
        Retournes uniquement les 5 meilleures correspondances avec un score > 0.3.
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            response = self.chat(
                messages=messages,
                use_case='complex_analysis',
                temperature=0.1
            )
            
            ai_result = self.extract_json_from_response(response)
            
            if ai_result and 'matches' in ai_result:
                matches = ai_result['matches']
                # Validate and clean matches
                validated_matches = []
                for match in matches:
                    if 'score' in match and 'journal_entry' in match:
                        match['score'] = min(1.0, max(0.0, float(match['score'])))
                        if match['score'] > 0.3:  # Minimum threshold
                            validated_matches.append(match)
                
                # Sort by score descending and return top 5
                validated_matches.sort(key=lambda x: x['score'], reverse=True)
                return validated_matches[:5]
            
            return []
            
        except Exception as e:
            logger.error(f"Magic Match AI error: {str(e)}")
            return []


# Singleton instance for application-wide use
_ai_client_instance = None

def get_ai_client() -> AIClient:
    """Get singleton AI client instance"""
    global _ai_client_instance
    if _ai_client_instance is None:
        _ai_client_instance = AIClient()
    return _ai_client_instance
