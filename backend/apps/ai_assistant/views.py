from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.core.files.base import ContentFile
from django.utils import timezone
import io
import logging
import PyPDF2
from PIL import Image
try:
    import pytesseract  # Optional OCR dependency
except ImportError:
    pytesseract = None

# Logger spécifique pour le monitoring IA
logger = logging.getLogger('ai_monitoring')
from .serializers import (
    DocumentAnalysisSerializer,
    DocumentAnalysisResponseSerializer,
    SuggestedJournalEntrySerializer
)
from .services import AccountingAgentService


class AIAssistantViewSet(viewsets.ViewSet):
    """
    ViewSet for AI-powered accounting assistant
    Multi-tenancy: Users can only analyze documents for their organization
    """
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_agent_service(self):
        """Get the AI agent service instance"""
        return AccountingAgentService()
    
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
    
    @action(detail=False, methods=['post'])
    def analyze_text(self, request):
        """
        Analyze raw text and extract accounting information
        """
        serializer = DocumentAnalysisSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            agent = self.get_agent_service()
            result = agent.analyze_document_text(
                text=serializer.validated_data['text'],
                organization=request.user.organization
            )
            
            response_serializer = DocumentAnalysisResponseSerializer(result)
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': "Erreur lors de l'analyse du texte"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def analyze_file(self, request):
        """
        Analyze uploaded file (PDF, image) and extract text using OCR
        """
        if 'file' not in request.FILES:
            return Response({
                'success': False,
                'error': 'Aucun fichier fourni'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['file']
        
        # Check file type
        if not self._is_supported_file_type(file):
            return Response({
                'success': False,
                'error': 'Type de fichier non supporté. Utilisez PDF, JPG, PNG ou TIFF'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Extract text from file
            extracted_text = self._extract_text_from_file(file)
            
            if not extracted_text.strip():
                return Response({
                    'success': False,
                    'error': 'Aucun texte extrait du fichier. Vérifiez que le fichier est lisible.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Analyze extracted text
            agent = self.get_agent_service()
            result = agent.analyze_document_text(
                text=extracted_text,
                organization=request.user.organization
            )
            
            # Add file information to result
            result['file_info'] = {
                'filename': file.name,
                'size': file.size,
                'content_type': file.content_type
            }
            
            response_serializer = DocumentAnalysisResponseSerializer(result)
            return Response(response_serializer.data)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': "Erreur lors de l'analyse du fichier"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def suggest_journal_entry(self, request):
        """
        Suggest a complete journal entry based on analysis data
        """
        analysis_data = request.data.get('analysis_data')
        
        if not analysis_data:
            return Response({
                'success': False,
                'error': 'Données d\'analyse requises'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get AI client instance
            from apps.core.ai_client import get_ai_client
            ai_client = get_ai_client()
            
            # Build organization context
            from apps.accounting.models import Account
            accounts = Account.objects.filter(
                organization=request.user.organization,
                is_active=True
            )
            account_context = self._build_account_context(accounts)
            
            # Generate journal entry suggestion
            suggested_entry = ai_client.generate_journal_entry_suggestion(
                analysis_data=analysis_data,
                organization_context=account_context
            )
            
            serializer = SuggestedJournalEntrySerializer(suggested_entry)
            return Response({
                'success': True,
                'suggested_entry': serializer.data,
                'analysis_data': analysis_data
            })
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': "Erreur lors de la suggestion d'écriture"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _is_supported_file_type(self, file):
        """Check if file type is supported for OCR"""
        supported_types = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/tiff',
            'image/bmp'
        ]
        return file.content_type in supported_types
    
    def _extract_text_from_file(self, file):
        """Extract text from uploaded file using OCR"""
        # Read file content
        file_content = file.read()
        
        if file.content_type == 'application/pdf':
            return self._extract_text_from_pdf(file_content)
        else:
            # Handle image files
            return self._extract_text_from_image(file_content)
    
    def _extract_text_from_pdf(self, file_content):
        """Extract text from PDF file"""
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            return text.strip()
            
        except Exception as e:
            raise ValueError(f"Erreur lors de l'extraction du PDF: {e}")
    
    def _extract_text_from_image(self, file_content):
        """Extract text from image file using OCR"""
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(file_content))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Extract text using Tesseract OCR
            # Configure for French language
            custom_config = r'--oem 3 --psm 6 -l fra'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            return text.strip()
            
        except Exception as e:
            raise ValueError(f"Erreur lors de l'OCR: {e}")
    
    @action(detail=False, methods=['get'])
    def supported_formats(self, request):
        """
        Get list of supported file formats for analysis
        """
        return Response({
            'supported_formats': {
                'pdf': ['application/pdf'],
                'images': [
                    'image/jpeg',
                    'image/jpg', 
                    'image/png',
                    'image/tiff',
                    'image/bmp'
                ]
            },
            'max_file_size': 10 * 1024 * 1024,  # 10MB
            'ocr_languages': ['fra'],
            'features': [
                'text_extraction',
                'document_analysis',
                'account_suggestion',
                'journal_entry_generation'
            ]
        })
    
    @action(detail=False, methods=['post'])
    def validate_suggested_entry(self, request):
        """
        Validate a suggested journal entry before creation
        """
        suggested_entry = request.data.get('suggested_entry')
        
        if not suggested_entry:
            return Response({
                'success': False,
                'error': 'Écriture suggérée requise'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Basic validation
            lines = suggested_entry.get('lines', [])
            if not lines:
                return Response({
                    'success': False,
                    'error': 'L\'écriture doit contenir au moins une ligne'
                })
            
            # Check balance
            total_debit = sum(line.get('amount', 0) for line in lines if line.get('line_type') == 'debit')
            total_credit = sum(line.get('amount', 0) for line in lines if line.get('line_type') == 'credit')
            
            is_balanced = abs(total_debit - total_credit) < 0.01
            
            # Validate accounts exist
            from apps.accounting.models import Account
            account_codes = [line.get('account_code') for line in lines]
            existing_accounts = Account.objects.filter(
                organization=request.user.organization,
                code__in=account_codes,
                is_active=True
            ).values_list('code', flat=True)
            
            missing_accounts = set(account_codes) - set(existing_accounts)
            
            validation_result = {
                'success': True,
                'is_balanced': is_balanced,
                'total_debit': total_debit,
                'total_credit': total_credit,
                'balance_difference': abs(total_debit - total_credit),
                'missing_accounts': list(missing_accounts),
                'validation_errors': []
            }
            
            if not is_balanced:
                validation_result['validation_errors'].append(
                    "L'écriture n'est pas équilibrée"
                )
            
            if missing_accounts:
                validation_result['validation_errors'].append(
                    f"Comptes non trouvés: {', '.join(missing_accounts)}"
                )
            
            return Response(validation_result)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': "Erreur lors de la validation"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def magic_match(self, request):
        """
        AI-powered Magic Match for bank reconciliation
        Uses Mistral AI to suggest OHADA-aware account matches
        """
        transaction_data = request.data.get('transaction')
        journal_entries = request.data.get('journal_entries', [])
        
        if not transaction_data:
            return Response({
                'success': False,
                'error': 'Données de transaction requises'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get AI client instance
            from apps.core.ai_client import get_ai_client
            ai_client = get_ai_client()
            
            if not ai_client:
                # Fallback to heuristic matching if AI is not available
                logger.warning("IA_FALLBACK_TRIGGERED - AI client not available, using heuristic matching")
                return Response({
                    'success': True,
                    'matches': self._heuristic_magic_match(transaction_data, journal_entries),
                    'ai_enabled': False
                })
            
            # Build organization context with OHADA accounts
            from apps.accounting.models import Account
            accounts = Account.objects.filter(
                organization=request.user.organization,
                is_active=True
            )
            account_context = self._build_account_context(accounts)
            
            # Generate AI-powered matches
            matches = ai_client.generate_magic_match_suggestions(
                transaction_data=transaction_data,
                journal_entries=journal_entries,
                organization_context=account_context
            )
            
            logger.info(f"IA_SUCCESS - Magic Match completed successfully with {len(matches)} matches")
            
            return Response({
                'success': True,
                'matches': matches,
                'ai_enabled': True
            })
                
        except Exception as e:
            # Fallback to heuristic matching on error
            try:
                logger.warning(f"IA_FALLBACK_TRIGGERED - AI error: {str(e)}, using heuristic matching")
                matches = self._heuristic_magic_match(transaction_data, journal_entries)
                return Response({
                    'success': True,
                    'matches': matches,
                    'ai_enabled': False,
                    'error': f"AI error, using heuristic matching: {str(e)}"
                })
            except Exception as fallback_error:
                return Response({
                    'success': False,
                    'error': f"AI and heuristic matching failed: {str(e)} / {str(fallback_error)}",
                    'message': "Erreur lors du Magic Match"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _heuristic_magic_match(self, transaction_data, journal_entries):
        """
        Fallback heuristic matching when AI is not available
        Implements OHADA-aware scoring
        """
        import math
        from difflib import SequenceMatcher
        
        matches = []
        transaction_amount = abs(float(transaction_data.get('amount', 0)))
        transaction_date = transaction_data.get('date', '')
        transaction_description = transaction_data.get('description', '').lower()
        
        for entry in journal_entries:
            entry_amount = abs(float(entry.get('amount', 0)))
            entry_date = entry.get('date', '')
            entry_description = entry.get('description', '').lower()
            
            # Calculate similarity scores
            amount_score = 1.0 - abs(transaction_amount - entry_amount) / max(transaction_amount, entry_amount, 1)
            
            # Date similarity (within 7 days = good match)
            date_score = 0.0
            if transaction_date and entry_date:
                try:
                    from datetime import datetime
                    t_date = datetime.strptime(transaction_date[:10], '%Y-%m-%d')
                    e_date = datetime.strptime(entry_date[:10], '%Y-%m-%d')
                    days_diff = abs((t_date - e_date).days)
                    date_score = max(0, 1.0 - days_diff / 7)
                except:
                    pass
            
            # Text similarity using Jaccard
            words_t = set(transaction_description.split())
            words_e = set(entry_description.split())
            intersection = words_t.intersection(words_e)
            union = words_t.union(words_e)
            text_score = len(intersection) / len(union) if union else 0
            
            # Combined score with OHADA weighting
            combined_score = (amount_score * 0.4) + (date_score * 0.3) + (text_score * 0.3)
            
            # OHADA account suggestion
            suggested_account = self._suggest_ohada_account_heuristic(
                transaction_data, 
                transaction_amount > 0  # True for credit, False for debit
            )
            
            if combined_score > 0.3:  # Minimum threshold
                matches.append({
                    'journal_entry': entry,
                    'score': round(combined_score, 3),
                    'suggested_account': suggested_account,
                    'confidence': 'high' if combined_score > 0.8 else 'medium' if combined_score > 0.6 else 'low',
                    'match_reasons': [
                        f"Amount similarity: {amount_score:.2f}",
                        f"Date similarity: {date_score:.2f}",
                        f"Text similarity: {text_score:.2f}"
                    ]
                })
        
        # Sort by score descending
        matches.sort(key=lambda x: x['score'], reverse=True)
        return matches[:5]  # Return top 5 matches
    
    def _suggest_ohada_account_heuristic(self, transaction_data, is_credit):
        """
        Heuristic OHADA account suggestion
        """
        description = transaction_data.get('description', '').lower()
        amount = abs(float(transaction_data.get('amount', 0)))
        
        # Common keywords for OHADA classes
        expense_keywords = {
            '60': ['achat', 'fournisseur', 'marchandise', 'stock'],
            '61': ['transport', 'déplacement', 'voyage', 'carburant'],
            '62': ['service', 'honoraires', 'consultant', 'avocat'],
            '63': ['taxe', 'impôt', 'douane', 'tva'],
            '64': ['personnel', 'salaire', 'prime', 'cotisation'],
            '65': ['loyer', 'entretien', 'réparation', 'assurance'],
            '66': ['frais', 'bancaire', 'commission', 'charge'],
            '68': ['dotation', 'amortissement', 'provision'],
        }
        
        revenue_keywords = {
            '70': ['vente', 'client', 'facture', 'produit'],
            '71': ['subvention', 'aide', 'don'],
            '72': ['production', 'fabrication', 'transformation'],
            '73': ['marge', 'bénéfice', 'gain'],
            '75': ['location', 'redevance', 'royalty'],
            '76': ['intérêt', 'dividende', 'placement'],
            '77': ['cession', 'vente immobilisation'],
            '78': ['reprise', 'amortissement', 'provision'],
        }
        
        keywords = expense_keywords if not is_credit else revenue_keywords
        
        # Search for keyword matches
        for account_code, words in keywords.items():
            for word in words:
                if word in description:
                    return {
                        'code': account_code,
                        'label': self._get_ohada_account_label(account_code),
                        'reason': f"Keyword '{word}' suggests {account_code}"
                    }
        
        # Default suggestions based on transaction type
        if is_credit:
            return {
                'code': '701',
                'label': 'Ventes de produits finis',
                'reason': 'Default revenue account for credits'
            }
        else:
            return {
                'code': '601',
                'label': 'Achats de marchandises',
                'reason': 'Default expense account for debits'
            }
    
    def _get_ohada_account_label(self, account_code):
        """
        Get OHADA account label for common accounts
        """
        labels = {
            '601': 'Achats de marchandises',
            '607': 'Achats non stockés de matières et fournitures',
            '611': 'Transports',
            '613': 'Locations',
            '621': 'Rémunérations d\'intermédiaires et honoraires',
            '631': 'Impôts, taxes et versements assimilés',
            '641': 'Rémunérations du personnel',
            '651': 'Redevances de crédit-bail',
            '661': 'Charges d\'intérêts',
            '681': 'Dotations aux amortissements',
            '701': 'Ventes de produits finis',
            '706': 'Prestations de services',
            '707': 'Ventes de marchandises',
            '751': 'Revenus des titres de participation',
            '758': 'Produits divers de gestion courante',
            '761': 'Produits des titres de placement',
            '771': 'Produits des cessions d\'immobilisations',
            '781': 'Reprises sur amortissements'
        }
        return labels.get(account_code, f'Compte {account_code}')
