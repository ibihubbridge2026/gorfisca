"""
Hooks de validation Expert-Comptable pour Gorfisca
Système de validation multi-niveaux pour les écritures comptables
"""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from .models import JournalEntry, JournalLine
from apps.audit.models import JournalEntryAudit
from apps.permissions.services import PermissionService
from apps.notifications.services import NotificationService


class ExpertValidationHook:
    """
    Hook principal pour la validation par expert-comptable
    """
    
    @classmethod
    def validate_entry_for_expert(cls, journal_entry, user=None):
        """
        Valider une écriture selon les critères d'expert-comptable
        """
        validation_errors = []
        validation_warnings = []
        
        # 1. Validation OHADA de base
        ohada_errors = cls._validate_ohada_compliance(journal_entry)
        validation_errors.extend(ohada_errors)
        
        # 2. Validation des montants
        amount_warnings = cls._validate_amounts(journal_entry)
        validation_warnings.extend(amount_warnings)
        
        # 3. Validation des comptes
        account_warnings = cls._validate_accounts(journal_entry)
        validation_warnings.extend(account_warnings)
        
        # 4. Validation de cohérence
        coherence_errors = cls._validate_coherence(journal_entry)
        validation_errors.extend(coherence_errors)
        
        # 5. Validation business rules
        business_warnings = cls._validate_business_rules(journal_entry)
        validation_warnings.extend(business_warnings)
        
        # Calculer le score de conformité
        compliance_score = cls._calculate_compliance_score(
            validation_errors, validation_warnings
        )
        
        return {
            'is_valid': len(validation_errors) == 0,
            'errors': validation_errors,
            'warnings': validation_warnings,
            'compliance_score': compliance_score,
            'requires_expert_review': cls._requires_expert_review(journal_entry, compliance_score)
        }
    
    @classmethod
    def _validate_ohada_compliance(cls, journal_entry):
        """
        Valider la conformité OHADA stricte
        """
        errors = []
        
        # Vérifier l'équilibre Débit = Crédit
        if not journal_entry.is_balanced:
            diff = abs(journal_entry.total_debit - journal_entry.total_credit)
            errors.append(f"Déséquilibre: Débit ({journal_entry.total_debit}) ≠ Crédit ({journal_entry.total_credit}) - Différence: {diff}")
        
        # Vérifier les codes de comptes
        for line in journal_entry.lines.all():
            if not line.account.code:
                errors.append(f"Ligne {line.id}: Code de compte manquant")
                continue
            
            # Vérifier la classe OHADA
            first_digit = int(line.account.code[0])
            if first_digit not in range(1, 9):
                errors.append(f"Ligne {line.id}: Classe OHADA invalide ({first_digit}) pour le compte {line.account.code}")
            
            # Vérifier la cohérence type/compte
            if line.line_type == 'debit':
                if line.account.account_class not in [1, 2, 3, 5, 6]:
                    errors.append(f"Ligne {line.id}: Le compte {line.account.code} (classe {line.account.account_class}) ne peut pas être débité")
            else:  # credit
                if line.account.account_class not in [1, 4, 5, 7]:
                    errors.append(f"Ligne {line.id}: Le compte {line.account.code} (classe {line.account.account_class}) ne peut pas être crédité")
        
        return errors
    
    @classmethod
    def _validate_amounts(cls, journal_entry):
        """
        Valider les montants selon les seuils et règles business
        """
        warnings = []
        
        total_amount = journal_entry.total_debit
        
        # Seuils d'alerte
        warning_threshold = Decimal('1000000')  # 1M XOF
        critical_threshold = Decimal('5000000')  # 5M XOF
        
        if total_amount >= critical_threshold:
            warnings.append(f"Montant critique: {total_amount} XOF (seuil critique: {critical_threshold} XOF)")
        elif total_amount >= warning_threshold:
            warnings.append(f"Montant élevé: {total_amount} XOF (seuil d'alerte: {warning_threshold} XOF)")
        
        # Vérifier les montants individuels
        for line in journal_entry.lines.all():
            if line.amount > warning_threshold:
                warnings.append(f"Ligne {line.id}: Montant élevé {line.amount} XOF pour le compte {line.account.code}")
        
        return warnings
    
    @classmethod
    def _validate_accounts(cls, journal_entry):
        """
        Valider l'utilisation des comptes
        """
        warnings = []
        
        used_accounts = [line.account for line in journal_entry.lines.all()]
        
        # Vérifier l'utilisation de comptes spéciaux
        special_accounts = {
            '101000': 'Capital social',
            '401100': 'Fournisseurs',
            '411100': 'Clients',
            '521000': 'Banque',
            '571000': 'Caisse'
        }
        
        for account in used_accounts:
            if account.code in special_accounts:
                if account.code == '101000' and journal_entry.source != 'manual':
                    warnings.append(f"Utilisation du compte {special_accounts[account.code]} ({account.code}) dans une écriture non manuelle")
        
        # Vérifier la cohérence des comptes tiers
        client_accounts = [acc for acc in used_accounts if acc.code.startswith('411')]
        supplier_accounts = [acc for acc in used_accounts if acc.code.startswith('401')]
        
        if client_accounts and supplier_accounts:
            warnings.append("Présence simultanée de comptes clients et fournisseurs - vérifier la nature de l'opération")
        
        return warnings
    
    @classmethod
    def _validate_coherence(cls, journal_entry):
        """
        Valider la cohérence logique de l'écriture
        """
        errors = []
        
        # Vérifier la description
        if not journal_entry.description or len(journal_entry.description.strip()) < 10:
            errors.append("Description trop courte ou manquante (minimum 10 caractères)")
        
        # Vérifier la cohérence temporelle
        if journal_entry.date > timezone.now().date():
            errors.append("La date de l'écriture ne peut pas être dans le futur")
        
        # Vérifier la cohérence des montants avec la description
        description_lower = journal_entry.description.lower()
        total_amount = journal_entry.total_debit
        
        # Mots-clés pour les montants élevés
        high_amount_keywords = ['achat', 'investissement', 'immobilisation', 'construction']
        if total_amount > Decimal('1000000') and not any(keyword in description_lower for keyword in high_amount_keywords):
            errors.append("Montant élevé sans justification dans la description")
        
        return errors
    
    @classmethod
    def _validate_business_rules(cls, journal_entry):
        """
        Valider les règles business spécifiques
        """
        warnings = []
        
        # Règle: Les écritures de TVA doivent avoir des comptes de TVA
        has_vat_accounts = any(
            line.account.code.startswith('445') 
            for line in journal_entry.lines.all()
        )
        
        if has_vat_accounts:
            # Vérifier la cohérence TVA
            vat_lines = [
                line for line in journal_entry.lines.all()
                if line.account.code.startswith('445')
            ]
            
            if len(vat_lines) > 1:
                warnings.append("Plusieurs comptes de TVA utilisés - vérifier la cohérence")
        
        # Règle: Les opérations bancaires doivent avoir une référence
        bank_accounts = [
            line for line in journal_entry.lines.all()
            if line.account.code.startswith('521')
        ]
        
        if bank_accounts and not journal_entry.description.strip():
            warnings.append("Opération bancaire sans description détaillée")
        
        return warnings
    
    @classmethod
    def _calculate_compliance_score(cls, errors, warnings):
        """
        Calculer le score de conformité (0-100)
        """
        base_score = 100
        
        # Pénaliser les erreurs (-10 points par erreur)
        error_penalty = len(errors) * 10
        base_score -= error_penalty
        
        # Pénaliser les warnings (-2 points par warning)
        warning_penalty = len(warnings) * 2
        base_score -= warning_penalty
        
        # Score minimum 0
        return max(0, base_score)
    
    @classmethod
    def _requires_expert_review(cls, journal_entry, compliance_score):
        """
        Déterminer si une validation expert est requise
        """
        # Toujours requérir une validation expert si le score est bas
        if compliance_score < 80:
            return True
        
        # Validation requise pour les montants élevés
        if journal_entry.total_debit > Decimal('5000000'):
            return True
        
        # Validation requise pour les écritures IA
        if journal_entry.source == 'ai_suggestion':
            return True
        
        # Validation requise pour les comptes sensibles
        sensitive_accounts = ['101000', '401100', '411100']
        for line in journal_entry.lines.all():
            if line.account.code in sensitive_accounts:
                return True
        
        return False


@receiver(pre_save, sender=JournalEntry)
def journal_entry_pre_save(sender, instance, **kwargs):
    """
    Hook pre_save pour les écritures comptables
    """
    # Validation expert pour les nouvelles écritures
    if not instance.pk:  # Nouvelle écriture
        validation_result = ExpertValidationHook.validate_entry_for_expert(instance)
        
        # Créer l'enregistrement d'audit
        audit, created = JournalEntryAudit.objects.get_or_create(
            journal_entry=instance,
            defaults={
                'ohada_compliant': validation_result['is_valid'],
                'validation_errors': validation_result['errors']
            }
        )
        
        if not created:
            audit.ohada_compliant = validation_result['is_valid']
            audit.validation_errors = validation_result['errors']
            audit.save()
        
        # Si l'écriture nécessite une validation expert, la marquer comme non validée
        if validation_result['requires_expert_review']:
            instance.is_validated = False
        else:
            instance.is_validated = True


@receiver(post_save, sender=JournalEntry)
def journal_entry_post_save(sender, instance, created, **kwargs):
    """
    Hook post_save pour les écritures comptables
    """
    if created:
        # Notifier les experts si nécessaire
        validation_result = ExpertValidationHook.validate_entry_for_expert(instance)
        
        if validation_result['requires_expert_review']:
            # Envoyer une notification aux experts-comptables
            try:
                NotificationService.notify_expert_review_required(
                    organization=instance.organization,
                    journal_entry=instance,
                    validation_result=validation_result
                )
            except Exception:
                pass  # Ne pas bloquer la création en cas d'erreur de notification


class AutomaticValidationService:
    """
    Service pour la validation automatique basée sur les règles d'expert
    """
    
    @classmethod
    def auto_validate_entry(cls, journal_entry, expert_user):
        """
        Validation automatique par un expert-comptable
        """
        # Vérifier que l'utilisateur est un expert
        if not PermissionService.has_role_type(expert_user, 'expert_accountant'):
            raise ValidationError("L'utilisateur n'est pas un expert-comptable")
        
        # Effectuer la validation expert
        validation_result = ExpertValidationHook.validate_entry_for_expert(journal_entry, expert_user)
        
        # Mettre à jour l'audit
        audit = JournalEntryAudit.objects.get(journal_entry=journal_entry)
        audit.is_reviewed_by_expert = True
        audit.expert_reviewer = expert_user
        audit.expert_review_date = timezone.now()
        audit.expert_notes = f"Validation automatique - Score: {validation_result['compliance_score']}/100"
        audit.save()
        
        # Valider l'écriture si tout est bon
        if validation_result['is_valid']:
            journal_entry.validate_entry(expert_user)
        
        return validation_result
    
    @classmethod
    def batch_validate_entries(cls, organization, expert_user, entry_ids=None):
        """
        Validation en lot d'écritures
        """
        queryset = JournalEntry.objects.filter(
            organization=organization,
            is_posted=False,
            is_validated=False
        )
        
        if entry_ids:
            queryset = queryset.filter(id__in=entry_ids)
        
        results = []
        for entry in queryset:
            try:
                result = cls.auto_validate_entry(entry, expert_user)
                results.append({
                    'entry_id': entry.id,
                    'success': True,
                    'result': result
                })
            except Exception as e:
                results.append({
                    'entry_id': entry.id,
                    'success': False,
                    'error': str(e)
                })
        
        return results


class ComplianceReportService:
    """
    Service pour générer des rapports de conformité
    """
    
    @classmethod
    def generate_compliance_report(cls, organization, period_start, period_end):
        """
        Générer un rapport de conformité OHADA
        """
        entries = JournalEntry.objects.filter(
            organization=organization,
            date__gte=period_start,
            date__lte=period_end
        )
        
        total_entries = entries.count()
        compliant_entries = 0
        expert_reviewed_entries = 0
        total_errors = []
        total_warnings = []
        
        for entry in entries:
            validation_result = ExpertValidationHook.validate_entry_for_expert(entry)
            
            if validation_result['is_valid']:
                compliant_entries += 1
            
            audit = entry.audit_record if hasattr(entry, 'audit_record') else None
            if audit and audit.is_reviewed_by_expert:
                expert_reviewed_entries += 1
            
            total_errors.extend(validation_result['errors'])
            total_warnings.extend(validation_result['warnings'])
        
        compliance_rate = (compliant_entries / total_entries * 100) if total_entries > 0 else 0
        expert_review_rate = (expert_reviewed_entries / total_entries * 100) if total_entries > 0 else 0
        
        return {
            'period': {
                'start': period_start,
                'end': period_end
            },
            'summary': {
                'total_entries': total_entries,
                'compliant_entries': compliant_entries,
                'compliance_rate': compliance_rate,
                'expert_reviewed_entries': expert_reviewed_entries,
                'expert_review_rate': expert_review_rate
            },
            'issues': {
                'total_errors': len(total_errors),
                'total_warnings': len(total_warnings),
                'most_common_errors': cls._get_most_common_issues(total_errors),
                'most_common_warnings': cls._get_most_common_issues(total_warnings)
            }
        }
    
    @classmethod
    def _get_most_common_issues(cls, issues, limit=10):
        """
        Obtenir les problèmes les plus fréquents
        """
        from collections import Counter
        
        issue_counts = Counter(issues)
        return issue_counts.most_common(limit)
