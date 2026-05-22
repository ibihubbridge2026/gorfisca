"""
Architecture des adaptateurs pour la raffinerie de données
Pattern Strategy pour traiter différentes sources de données
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import pandas as pd
import json
import logging
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from ..models import RawIngestion, NormalizedTransaction

logger = logging.getLogger(__name__)


class ParsedTransaction:
    """
    Objet représentant une transaction parsée
    """
    
    def __init__(self, original_label: str, original_amount: float, 
                 original_date: date, row_index: int = None, **metadata):
        self.original_label = str(original_label).strip()
        self.original_amount = float(original_amount)
        self.original_date = original_date
        self.row_index = row_index
        self.metadata = metadata or {}
        
        # Normalisation basique
        self.normalized_label = self._normalize_label(self.original_label)
        self.normalized_amount = Decimal(str(original_amount))
        self.normalized_date = original_date
    
    def _normalize_label(self, label: str) -> str:
        """Normalisation basique du libellé"""
        # Supprimer les espaces multiples et mettre en majuscules
        normalized = ' '.join(label.split())
        return normalized.upper() if len(normalized) < 50 else normalized[:50].upper()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir en dictionnaire pour la sérialisation"""
        return {
            'original_label': self.original_label,
            'original_amount': float(self.original_amount),
            'original_date': self.original_date.isoformat(),
            'normalized_label': self.normalized_label,
            'normalized_amount': float(self.normalized_amount),
            'normalized_date': self.normalized_date.isoformat(),
            'row_index': self.row_index,
            'metadata': self.metadata
        }


class BaseAdapter(ABC):
    """
    Classe de base abstraite pour tous les adaptateurs
    Pattern Strategy
    """
    
    def __init__(self, raw_ingestion: RawIngestion):
        self.raw_ingestion = raw_ingestion
        self.organization = raw_ingestion.organization
        self.source = raw_ingestion.source
        self.errors = []
        self.warnings = []
    
    @abstractmethod
    def parse(self) -> List[ParsedTransaction]:
        """
        Méthode principale pour parser les données brutes
        
        Returns:
            List[ParsedTransaction]: Liste des transactions parsées
        """
        pass
    
    @abstractmethod
    def validate_input(self) -> bool:
        """
        Valider que les données d'entrée sont compatibles avec cet adaptateur
        
        Returns:
            bool: True si les données sont valides
        """
        pass
    
    def add_error(self, message: str, row_index: int = None):
        """Ajouter une erreur de parsing"""
        error = {
            'message': message,
            'row_index': row_index,
            'timestamp': timezone.now().isoformat()
        }
        self.errors.append(error)
        logger.error(f"Adapter error: {message} (row: {row_index})")
    
    def add_warning(self, message: str, row_index: int = None):
        """Ajouter un avertissement de parsing"""
        warning = {
            'message': message,
            'row_index': row_index,
            'timestamp': timezone.now().isoformat()
        }
        self.warnings.append(warning)
        logger.warning(f"Adapter warning: {message} (row: {row_index})")
    
    def get_parsing_summary(self) -> Dict[str, Any]:
        """Obtenir un résumé du parsing"""
        return {
            'adapter_type': self.__class__.__name__,
            'source_type': self.source.source_type,
            'errors_count': len(self.errors),
            'warnings_count': len(self.warnings),
            'errors': self.errors,
            'warnings': self.warnings
        }


class ExcelUniversalAdapter(BaseAdapter):
    """
    Adaptateur universel pour les fichiers Excel/CSV
    Utilise pandas pour détecter automatiquement les colonnes
    """
    
    def __init__(self, raw_ingestion: RawIngestion):
        super().__init__(raw_ingestion)
        self.df = None
        self.column_mapping = {}
        self.detected_format = None
    
    def validate_input(self) -> bool:
        """Valider que le fichier est un Excel/CSV valide"""
        if not self.raw_ingestion.file:
            self.add_error("Aucun fichier fourni")
            return False
        
        try:
            # Déterminer le type de fichier
            file_name = self.raw_ingestion.file_name.lower()
            if file_name.endswith(('.xlsx', '.xls')):
                self.detected_format = 'excel'
            elif file_name.endswith('.csv'):
                self.detected_format = 'csv'
            else:
                self.add_error(f"Format de fichier non supporté: {file_name}")
                return False
            
            # Lire le fichier avec pandas
            if self.detected_format == 'excel':
                self.df = pd.read_excel(self.raw_ingestion.file.path)
            else:  # CSV
                # Essayer différents encodages
                for encoding in ['utf-8', 'latin-1', 'cp1252']:
                    try:
                        self.df = pd.read_csv(self.raw_ingestion.file.path, encoding=encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    self.add_error("Impossible de lire le fichier CSV (encodage non supporté)")
                    return False
            
            # Valider que le DataFrame n'est pas vide
            if self.df.empty:
                self.add_error("Le fichier est vide")
                return False
            
            # Détecter les colonnes
            if not self._detect_columns():
                self.add_error("Impossible de détecter les colonnes requises")
                return False
            
            return True
            
        except Exception as e:
            self.add_error(f"Erreur lors de la lecture du fichier: {str(e)}")
            return False
    
    def _detect_columns(self) -> bool:
        """Détecter automatiquement les colonnes de date, libellé et montant"""
        if self.df is None:
            return False
        
        # Nettoyer les noms de colonnes
        self.df.columns = self.df.columns.str.strip()
        
        # Dictionnaires de détection
        date_keywords = ['date', 'Date', 'DATE', 'date opération', 'date_op', 'transaction_date']
        label_keywords = ['libellé', 'libelle', 'description', 'lib', 'label', 'motif', 'transaction', 'opération', 'operation']
        amount_keywords = ['montant', 'amount', 'debit', 'credit', 'valeur', 'value', 'montant_eur', 'montant_xof']
        
        # Détecter la colonne de date
        date_column = self._find_column(date_keywords)
        if not date_column:
            self.add_error("Colonne de date non détectée")
            return False
        
        # Détecter la colonne de libellé
        label_column = self._find_column(label_keywords)
        if not label_column:
            self.add_error("Colonne de libellé non détectée")
            return False
        
        # Détecter la colonne de montant
        amount_column = self._find_column(amount_keywords)
        if not amount_column:
            self.add_error("Colonne de montant non détectée")
            return False
        
        # Stocker le mapping
        self.column_mapping = {
            'date': date_column,
            'label': label_column,
            'amount': amount_column
        }
        
        logger.info(f"Colonnes détectées: {self.column_mapping}")
        return True
    
    def _find_column(self, keywords: List[str]) -> Optional[str]:
        """Trouver une colonne basée sur des mots-clés"""
        for keyword in keywords:
            for col in self.df.columns:
                if keyword.lower() in col.lower():
                    return col
        return None
    
    def parse(self) -> List[ParsedTransaction]:
        """Parser le fichier Excel/CSV"""
        if not self.validate_input():
            return []
        
        transactions = []
        
        try:
            # Nettoyer le DataFrame
            df_clean = self._clean_dataframe()
            
            # Itérer sur les lignes
            for index, row in df_clean.iterrows():
                try:
                    transaction = self._parse_row(row, index)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    self.add_error(f"Erreur ligne {index + 1}: {str(e)}", index)
                    continue
            
            logger.info(f"Parsing terminé: {len(transactions)} transactions extraites")
            return transactions
            
        except Exception as e:
            self.add_error(f"Erreur globale du parsing: {str(e)}")
            return []
    
    def _clean_dataframe(self) -> pd.DataFrame:
        """Nettoyer et préparer le DataFrame"""
        df = self.df.copy()
        
        # Supprimer les lignes complètement vides
        df = df.dropna(how='all')
        
        # Convertir les colonnes pertinentes
        date_col = self.column_mapping['date']
        label_col = self.column_mapping['label']
        amount_col = self.column_mapping['amount']
        
        # Nettoyer la colonne date
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        
        # Nettoyer la colonne libellé
        df[label_col] = df[label_col].astype(str).str.strip()
        df[label_col] = df[label_col].replace('nan', '')
        
        # Nettoyer la colonne montant
        df[amount_col] = pd.to_numeric(df[amount_col], errors='coerce')
        
        # Supprimer les lignes avec des valeurs invalides
        df = df.dropna(subset=[date_col, label_col, amount_col])
        
        # Supprimer les lignes avec montant = 0
        df = df[df[amount_col] != 0]
        
        return df
    
    def _parse_row(self, row: pd.Series, index: int) -> Optional[ParsedTransaction]:
        """Parser une ligne individuelle"""
        try:
            # Extraire les valeurs
            date_col = self.column_mapping['date']
            label_col = self.column_mapping['label']
            amount_col = self.column_mapping['amount']
            
            raw_date = row[date_col]
            raw_label = row[label_col]
            raw_amount = row[amount_col]
            
            # Valider et convertir la date
            if pd.isna(raw_date):
                self.add_error(f"Ligne {index + 1}: Date invalide", index)
                return None
            
            # Convertir en date Python
            if isinstance(raw_date, str):
                try:
                    parsed_date = pd.to_datetime(raw_date).date()
                except:
                    self.add_error(f"Ligne {index + 1}: Format de date non reconnu: {raw_date}", index)
                    return None
            else:
                parsed_date = raw_date.date()
            
            # Valider le libellé
            if not raw_label or raw_label.strip() == '':
                self.add_error(f"Ligne {index + 1}: Libellé vide", index)
                return None
            
            # Valider le montant
            if raw_amount == 0:
                self.add_warning(f"Ligne {index + 1}: Montant nul ignoré", index)
                return None
            
            # Créer la transaction
            transaction = ParsedTransaction(
                original_label=raw_label,
                original_amount=float(raw_amount),
                original_date=parsed_date,
                row_index=index,
                source_file=self.raw_ingestion.file_name,
                adapter_type='excel_universal'
            )
            
            return transaction
            
        except Exception as e:
            self.add_error(f"Ligne {index + 1}: Erreur parsing: {str(e)}", index)
            return None


class JSONAdapter(BaseAdapter):
    """
    Adaptateur pour les données JSON structurées
    """
    
    def validate_input(self) -> bool:
        """Valider que les données sont du JSON valide"""
        if not self.raw_ingestion.raw_data:
            self.add_error("Aucune donnée JSON fournie")
            return False
        
        try:
            # Valider que c'est une liste ou un dict
            data = self.raw_ingestion.raw_data
            if isinstance(data, dict):
                # Si c'est un dict, vérifier qu'il contient une liste de transactions
                if 'transactions' in data:
                    self.raw_ingestion.raw_data = data['transactions']
                elif 'data' in data:
                    self.raw_ingestion.raw_data = data['data']
                else:
                    self.add_error("Structure JSON non reconnue (attendu: {'transactions': [...]})")
                    return False
            elif not isinstance(data, list):
                self.add_error("Le JSON doit contenir une liste de transactions")
                return False
            
            return True
            
        except Exception as e:
            self.add_error(f"Erreur validation JSON: {str(e)}")
            return False
    
    def parse(self) -> List[ParsedTransaction]:
        """Parser les données JSON"""
        if not self.validate_input():
            return []
        
        transactions = []
        
        try:
            data = self.raw_ingestion.raw_data
            
            for index, item in enumerate(data):
                try:
                    transaction = self._parse_json_item(item, index)
                    if transaction:
                        transactions.append(transaction)
                except Exception as e:
                    self.add_error(f"Item {index}: {str(e)}", index)
                    continue
            
            logger.info(f"Parsing JSON terminé: {len(transactions)} transactions extraites")
            return transactions
            
        except Exception as e:
            self.add_error(f"Erreur parsing JSON: {str(e)}")
            return []
    
    def _parse_json_item(self, item: Dict[str, Any], index: int) -> Optional[ParsedTransaction]:
        """Parser un item JSON individuel"""
        try:
            # Extraire les champs requis avec différents noms possibles
            label = (item.get('label') or item.get('description') or 
                    item.get('libelle') or item.get('motif') or item.get('transaction'))
            
            amount = (item.get('amount') or item.get('montant') or 
                     item.get('value') or item.get('valeur'))
            
            date_str = (item.get('date') or item.get('transaction_date') or 
                       item.get('created_at') or item.get('timestamp'))
            
            # Valider les champs requis
            if not label:
                self.add_error(f"Item {index}: Libellé manquant", index)
                return None
            
            if not amount:
                self.add_error(f"Item {index}: Montant manquant", index)
                return None
            
            if not date_str:
                self.add_error(f"Item {index}: Date manquante", index)
                return None
            
            # Parser la date
            try:
                if isinstance(date_str, str):
                    parsed_date = pd.to_datetime(date_str).date()
                else:
                    parsed_date = pd.to_datetime(date_str).date()
            except:
                self.add_error(f"Item {index}: Format de date invalide: {date_str}", index)
                return None
            
            # Créer la transaction
            transaction = ParsedTransaction(
                original_label=label,
                original_amount=float(amount),
                original_date=parsed_date,
                row_index=index,
                adapter_type='json',
                raw_item=item
            )
            
            return transaction
            
        except Exception as e:
            self.add_error(f"Item {index}: Erreur parsing: {str(e)}", index)
            return None


class BankAPIAdapter(BaseAdapter):
    """
    Adaptateur pour les réponses d'API bancaires
    """
    
    def validate_input(self) -> bool:
        """Valider que les données sont une réponse d'API bancaire"""
        if not self.raw_ingestion.raw_data:
            self.add_error("Aucune donnée API fournie")
            return False
        
        try:
            data = self.raw_ingestion.raw_data
            
            # Vérifier la structure typique d'une API bancaire
            if isinstance(data, dict):
                if 'transactions' in data or 'operations' in data:
                    return True
                elif 'data' in data and isinstance(data['data'], list):
                    return True
            
            self.add_error("Structure d'API bancaire non reconnue")
            return False
            
        except Exception as e:
            self.add_error(f"Erreur validation API: {str(e)}")
            return False
    
    def parse(self) -> List[ParsedTransaction]:
        """Parser la réponse de l'API bancaire"""
        if not self.validate_input():
            return []
        
        # Utiliser JSONAdapter comme base avec une logique spécifique bancaire
        json_adapter = JSONAdapter(self.raw_ingestion)
        return json_adapter.parse()


# Factory pour créer le bon adaptateur
class AdapterFactory:
    """
    Factory pour créer le bon adaptateur selon le type de source
    """
    
    ADAPTERS = {
        'excel': ExcelUniversalAdapter,
        'csv_bank': ExcelUniversalAdapter,
        'bank_api': BankAPIAdapter,
        'custom_api': JSONAdapter,
        'odoo': JSONAdapter,
        'sage': JSONAdapter,
        'momo': JSONAdapter,
        'quickbooks': JSONAdapter,
    }
    
    @classmethod
    def create_adapter(cls, raw_ingestion: RawIngestion) -> BaseAdapter:
        """
        Créer le bon adaptateur selon le type de source
        
        Args:
            raw_ingestion: L'ingestion brute à traiter
            
        Returns:
            BaseAdapter: L'adaptateur approprié
            
        Raises:
            ValueError: Si aucun adaptateur n'est disponible pour ce type
        """
        source_type = raw_ingestion.source.source_type
        
        adapter_class = cls.ADAPTERS.get(source_type)
        
        if not adapter_class:
            raise ValueError(f"Aucun adaptateur disponible pour le type de source: {source_type}")
        
        logger.info(f"Création de l'adaptateur {adapter_class.__name__} pour {source_type}")
        return adapter_class(raw_ingestion)
    
    @classmethod
    def get_supported_types(cls) -> List[str]:
        """Obtenir la liste des types de sources supportés"""
        return list(cls.ADAPTERS.keys())
    
    @classmethod
    def register_adapter(cls, source_type: str, adapter_class):
        """Enregistrer un nouvel adaptateur"""
        cls.ADAPTERS[source_type] = adapter_class
