"""
Moteur de Normalization pour la raffinerie de données
Coordonne le flux: Ingestion -> Adaptateur -> Mapping IA -> Validation
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from django.db import transaction
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from ..models import RawIngestion, NormalizedTransaction
from ..services.adapters import AdapterFactory, ParsedTransaction
from apps.ai_assistant.services import AccountingAgentService
from apps.accounting.models import Account

logger = logging.getLogger(__name__)


class NormalizationEngine:
    """
    Moteur principal de normalisation
    Orchestre tout le processus de transformation des données brutes
    """
    
    def __init__(self, raw_ingestion: RawIngestion):
        self.raw_ingestion = raw_ingestion
        self.organization = raw_ingestion.organization
        self.source = raw_ingestion.source
        self.adapter = None
        self.parsed_transactions = []
        self.normalized_transactions = []
        self.errors = []
        self.warnings = []
        self.stats = {}
    
    def process(self) -> Dict[str, Any]:
        """
        Méthode principale pour orchestrer tout le processus
        
        Returns:
            Dict: Résultat du traitement avec statistiques
        """
        try:
            # Marquer le début du traitement
            self.raw_ingestion.start_processing()
            
            # Étape 1: Créer l'adaptateur et parser les données
            self._parse_raw_data()
            
            # Étape 2: Normaliser les transactions
            self._normalize_transactions()
            
            # Étape 3: Mapping IA des comptes OHADA
            self._map_ohada_accounts()
            
            # Étape 4: Validation et sauvegarde
            self._validate_and_save()
            
            # Compléter le traitement
            total_records = len(self.parsed_transactions)
            processed_records = len(self.normalized_transactions)
            failed_records = len(self.errors)
            
            self.raw_ingestion.complete_processing(total_records, processed_records, failed_records)
            
            # Générer le rapport
            return self._generate_processing_report()
            
        except Exception as e:
            error_msg = f"Erreur critique du traitement: {str(e)}"
            logger.error(error_msg)
            self.raw_ingestion.fail_processing(error_msg)
            
            return {
                'success': False,
                'error': error_msg,
                'stats': self._get_basic_stats()
            }
    
    def _parse_raw_data(self):
        """Étape 1: Parser les données brutes avec l'adaptateur approprié"""
        try:
            logger.info(f"Début du parsing pour {self.raw_ingestion.id}")
            
            # Créer l'adaptateur
            self.adapter = AdapterFactory.create_adapter(self.raw_ingestion)
            
            # Parser les données
            self.parsed_transactions = self.adapter.parse()
            
            # Collecter les erreurs de l'adaptateur
            self.errors.extend(self.adapter.errors)
            self.warnings.extend(self.adapter.warnings)
            
            logger.info(f"Parsing terminé: {len(self.parsed_transactions)} transactions extraites")
            
            if not self.parsed_transactions:
                raise ValueError("Aucune transaction n'a pu être extraite")
            
        except Exception as e:
            error_msg = f"Erreur parsing: {str(e)}"
            logger.error(error_msg)
            self.errors.append({'message': error_msg, 'timestamp': timezone.now().isoformat()})
            raise
    
    def _normalize_transactions(self):
        """Étape 2: Normaliser les transactions parsées"""
        logger.info("Début de la normalisation des transactions")
        
        for i, parsed_tx in enumerate(self.parsed_transactions):
            try:
                # Créer la transaction normalisée
                normalized_tx = self._create_normalized_transaction(parsed_tx, i)
                
                if normalized_tx:
                    self.normalized_transactions.append(normalized_tx)
                    
            except Exception as e:
                error_msg = f"Erreur normalisation transaction {i}: {str(e)}"
                logger.error(error_msg)
                self.errors.append({
                    'message': error_msg,
                    'transaction_index': i,
                    'timestamp': timezone.now().isoformat()
                })
        
        logger.info(f"Normalisation terminée: {len(self.normalized_transactions)} transactions normalisées")
    
    def _create_normalized_transaction(self, parsed_tx: ParsedTransaction, index: int) -> Optional[NormalizedTransaction]:
        """Créer une transaction normalisée à partir d'une transaction parsée"""
        try:
            # Validation des données
            if not self._validate_parsed_transaction(parsed_tx):
                return None
            
            # Créer l'objet NormalizedTransaction
            normalized_tx = NormalizedTransaction(
                raw_ingestion=self.raw_ingestion,
                original_label=parsed_tx.original_label,
                original_amount=Decimal(str(parsed_tx.original_amount)),
                original_date=parsed_tx.original_date,
                normalized_label=parsed_tx.normalized_label,
                normalized_amount=parsed_tx.normalized_amount,
                normalized_date=parsed_tx.normalized_date,
                validation_status='pending'
            )
            
            return normalized_tx
            
        except Exception as e:
            error_msg = f"Erreur création transaction normalisée {index}: {str(e)}"
            logger.error(error_msg)
            self.errors.append({
                'message': error_msg,
                'transaction_index': index,
                'timestamp': timezone.now().isoformat()
            })
            return None
    
    def _validate_parsed_transaction(self, parsed_tx: ParsedTransaction) -> bool:
        """Valider une transaction parsée"""
        # Valider le montant
        if parsed_tx.original_amount == 0:
            self.warnings.append({
                'message': f"Montant nul ignoré: {parsed_tx.original_label}",
                'transaction_index': parsed_tx.row_index,
                'timestamp': timezone.now().isoformat()
            })
            return False
        
        # Valider la date
        if not parsed_tx.original_date:
            self.errors.append({
                'message': f"Date invalide: {parsed_tx.original_label}",
                'transaction_index': parsed_tx.row_index,
                'timestamp': timezone.now().isoformat()
            })
            return False
        
        # Valider le libellé
        if not parsed_tx.original_label or len(parsed_tx.original_label.strip()) < 3:
            self.errors.append({
                'message': f"Libellé trop court ou vide",
                'transaction_index': parsed_tx.row_index,
                'timestamp': timezone.now().isoformat()
            })
            return False
        
        return True
    
    def _map_ohada_accounts(self):
        """Étape 3: Utiliser l'IA pour suggérer les comptes OHADA"""
        logger.info("Début du mapping IA des comptes OHADA")
        
        # Récupérer les comptes de l'organisation
        accounts = self._get_organization_accounts()
        
        if not accounts:
            error_msg = "Aucun compte OHADA trouvé pour l'organisation"
            logger.error(error_msg)
            self.errors.append({'message': error_msg, 'timestamp': timezone.now().isoformat()})
            return
        
        # Créer le service IA
        ai_service = AccountingAgentService()
        
        for i, normalized_tx in enumerate(self.normalized_transactions):
            try:
                # Obtenir les suggestions de l'IA
                suggestions = self._get_ai_suggestions(ai_service, normalized_tx, accounts)
                
                # Appliquer les suggestions
                if suggestions:
                    self._apply_ai_suggestions(normalized_tx, suggestions)
                else:
                    self.warnings.append({
                        'message': f"Aucune suggestion IA pour: {normalized_tx.original_label}",
                        'transaction_index': i,
                        'timestamp': timezone.now().isoformat()
                    })
                
            except Exception as e:
                error_msg = f"Erreur mapping IA transaction {i}: {str(e)}"
                logger.error(error_msg)
                self.warnings.append({
                    'message': error_msg,
                    'transaction_index': i,
                    'timestamp': timezone.now().isoformat()
                })
        
        logger.info("Mapping IA terminé")
    
    def _get_organization_accounts(self) -> List[Account]:
        """Récupérer les comptes OHADA de l'organisation"""
        try:
            return Account.objects.filter(
                organization=self.organization,
                is_active=True
            ).order_by('code')
        except Exception as e:
            logger.error(f"Erreur récupération comptes: {str(e)}")
            return []
    
    def _get_ai_suggestions(self, ai_service: AccountingAgentService, 
                           normalized_tx: NormalizedTransaction, 
                           accounts: List[Account]) -> Optional[Dict[str, Any]]:
        """Obtenir les suggestions de comptes de l'IA"""
        try:
            # Construire le contexte des comptes
            account_context = self._build_account_context(accounts)
            
            # Appeler le service IA
            response = ai_service.suggest_accounts(
                description=normalized_tx.original_label,
                amount=float(normalized_tx.original_amount),
                account_context=account_context
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Erreur suggestions IA: {str(e)}")
            return None
    
    def _build_account_context(self, accounts: List[Account]) -> str:
        """Construire le contexte des comptes pour l'IA"""
        context = "Comptes OHADA disponibles:\n\n"
        
        # Grouper par classe
        accounts_by_class = {}
        for account in accounts:
            if account.account_class not in accounts_by_class:
                accounts_by_class[account.account_class] = []
            accounts_by_class[account.account_class].append(account)
        
        # Formatter par classe
        class_names = {
            1: "Classe 1 - Capitaux propres et emprunts",
            2: "Classe 2 - Immobilisations",
            3: "Classe 3 - Stocks",
            4: "Classe 4 - Tiers",
            5: "Classe 5 - Trésorerie",
            6: "Classe 6 - Charges",
            7: "Classe 7 - Produits",
            8: "Classe 8 - Engagements hors bilan"
        }
        
        for class_id in sorted(accounts_by_class.keys()):
            class_name = class_names.get(class_id, f"Classe {class_id}")
            context += f"{class_name}:\n"
            for account in accounts_by_class[class_id]:
                context += f"  - {account.code}: {account.label}\n"
            context += "\n"
        
        return context
    
    def _apply_ai_suggestions(self, normalized_tx: NormalizedTransaction, suggestions: Dict[str, Any]):
        """Appliquer les suggestions de l'IA à la transaction"""
        try:
            # Extraire les suggestions de débit et crédit
            debit_suggestion = suggestions.get('debit_account')
            credit_suggestion = suggestions.get('credit_account')
            
            # Appliquer les suggestions de débit
            if debit_suggestion and 'account_code' in debit_suggestion:
                debit_account = self._find_account_by_code(debit_suggestion['account_code'])
                if debit_account:
                    normalized_tx.suggested_debit_account = debit_account
                    normalized_tx.debit_confidence_score = debit_suggestion.get('confidence', 50)
            
            # Appliquer les suggestions de crédit
            if credit_suggestion and 'account_code' in credit_suggestion:
                credit_account = self._find_account_by_code(credit_suggestion['account_code'])
                if credit_account:
                    normalized_tx.suggested_credit_account = credit_account
                    normalized_tx.credit_confidence_score = credit_suggestion.get('confidence', 50)
            
            # Stocker les suggestions complètes
            normalized_tx.ai_suggestions = suggestions
            
        except Exception as e:
            logger.error(f"Erreur application suggestions IA: {str(e)}")
    
    def _find_account_by_code(self, account_code: str) -> Optional[Account]:
        """Trouver un compte par son code"""
        try:
            return Account.objects.get(
                organization=self.organization,
                code=account_code,
                is_active=True
            )
        except Account.DoesNotExist:
            return None
    
    def _validate_and_save(self):
        """Étape 4: Valider et sauvegarder les transactions normalisées"""
        logger.info("Début de la validation et sauvegarde")
        
        with transaction.atomic():
            for i, normalized_tx in enumerate(self.normalized_transactions):
                try:
                    # Validation finale
                    validation_result = self._validate_final_transaction(normalized_tx)
                    
                    if validation_result['valid']:
                        # Sauvegarder la transaction
                        normalized_tx.save()
                    else:
                        self.warnings.append({
                            'message': f"Transaction non valide: {validation_result['reason']}",
                            'transaction_index': i,
                            'timestamp': timezone.now().isoformat()
                        })
                
                except Exception as e:
                    error_msg = f"Erreur sauvegarde transaction {i}: {str(e)}"
                    logger.error(error_msg)
                    self.errors.append({
                        'message': error_msg,
                        'transaction_index': i,
                        'timestamp': timezone.now().isoformat()
                    })
        
        logger.info(f"Validation et sauvegarde terminées")
    
    def _validate_final_transaction(self, normalized_tx: NormalizedTransaction) -> Dict[str, Any]:
        """Validation finale d'une transaction normalisée"""
        try:
            # Valider le montant
            if normalized_tx.normalized_amount <= 0:
                return {'valid': False, 'reason': 'Montant négatif ou nul'}
            
            # Valider la date
            if not normalized_tx.normalized_date:
                return {'valid': False, 'reason': 'Date manquante'}
            
            # Valider le libellé
            if not normalized_tx.normalized_label or len(normalized_tx.normalized_label.strip()) < 3:
                return {'valid': False, 'reason': 'Libellé trop court ou vide'}
            
            # Valider les suggestions IA (optionnelles)
            if not normalized_tx.suggested_debit_account or not normalized_tx.suggested_credit_account:
                return {'valid': False, 'reason': 'Suggestions IA incomplètes'}
            
            return {'valid': True, 'reason': None}
            
        except Exception as e:
            return {'valid': False, 'reason': f'Erreur validation: {str(e)}'}
    
    def _generate_processing_report(self) -> Dict[str, Any]:
        """Générer le rapport de traitement"""
        success_count = len(self.normalized_transactions)
        error_count = len(self.errors)
        warning_count = len(self.warnings)
        
        # Statistiques sur les suggestions IA
        ai_stats = self._calculate_ai_stats()
        
        return {
            'success': True,
            'stats': {
                'total_parsed': len(self.parsed_transactions),
                'total_normalized': success_count,
                'total_errors': error_count,
                'total_warnings': warning_count,
                'success_rate': (success_count / len(self.parsed_transactions) * 100) if self.parsed_transactions else 0,
                'ai_suggestions': ai_stats
            },
            'transactions': [tx.id for tx in self.normalized_transactions],
            'errors': self.errors,
            'warnings': self.warnings,
            'raw_ingestion_id': self.raw_ingestion.id,
            'source_type': self.source.source_type,
            'processing_time': self._calculate_processing_time()
        }
    
    def _calculate_ai_stats(self) -> Dict[str, Any]:
        """Calculer les statistiques sur les suggestions IA"""
        if not self.normalized_transactions:
            return {}
        
        total_with_suggestions = 0
        total_debit_confidence = 0
        total_credit_confidence = 0
        high_confidence_count = 0
        
        for tx in self.normalized_transactions:
            if tx.suggested_debit_account and tx.suggested_credit_account:
                total_with_suggestions += 1
                
                if tx.debit_confidence_score:
                    total_debit_confidence += tx.debit_confidence_score
                
                if tx.credit_confidence_score:
                    total_credit_confidence += tx.credit_confidence_score
                
                avg_confidence = tx.confidence_average
                if avg_confidence and avg_confidence >= 80:
                    high_confidence_count += 1
        
        avg_debit_confidence = total_debit_confidence / total_with_suggestions if total_with_suggestions > 0 else 0
        avg_credit_confidence = total_credit_confidence / total_with_suggestions if total_with_suggestions > 0 else 0
        high_confidence_rate = (high_confidence_count / total_with_suggestions * 100) if total_with_suggestions > 0 else 0
        
        return {
            'total_with_suggestions': total_with_suggestions,
            'suggestion_rate': (total_with_suggestions / len(self.normalized_transactions) * 100),
            'avg_debit_confidence': avg_debit_confidence,
            'avg_credit_confidence': avg_credit_confidence,
            'high_confidence_count': high_confidence_count,
            'high_confidence_rate': high_confidence_rate
        }
    
    def _calculate_processing_time(self) -> str:
        """Calculer le temps de traitement"""
        if self.raw_ingestion.processing_started_at and self.raw_ingestion.processing_completed_at:
            duration = self.raw_ingestion.processing_completed_at - self.raw_ingestion.processing_started_at
            return str(duration)
        return "N/A"
    
    def _get_basic_stats(self) -> Dict[str, Any]:
        """Obtenir les statistiques de base en cas d'erreur"""
        return {
            'total_parsed': len(self.parsed_transactions),
            'total_normalized': len(self.normalized_transactions),
            'total_errors': len(self.errors),
            'total_warnings': len(self.warnings)
        }


class BatchNormalizationEngine:
    """
    Moteur pour traiter plusieurs ingestions en lot
    """
    
    @staticmethod
    def process_batch(raw_ingestions: List[RawIngestion]) -> List[Dict[str, Any]]:
        """
        Traiter plusieurs ingestions en parallèle si possible
        
        Args:
            raw_ingestions: Liste des ingestions à traiter
            
        Returns:
            List[Dict]: Résultats de traitement pour chaque ingestion
        """
        results = []
        
        for ingestion in raw_ingestions:
            try:
                engine = NormalizationEngine(ingestion)
                result = engine.process()
                results.append(result)
            except Exception as e:
                error_msg = f"Erreur traitement ingestion {ingestion.id}: {str(e)}"
                logger.error(error_msg)
                results.append({
                    'success': False,
                    'error': error_msg,
                    'raw_ingestion_id': ingestion.id
                })
        
        return results
