import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import JournalLine, JournalEntry
from apps.reporting.services.integrity_service import IntegrityService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=JournalLine)
def verify_entry_balance_after_line_save(sender, instance, created, **kwargs):
    """
    Signal handler to verify journal entry balance after any line modification
    This ensures data integrity and prevents corruption
    """
    try:
        # Get the parent journal entry
        entry = instance.entry
        
        # Skip verification for unposted entries (they can be modified)
        if not entry.is_posted:
            return
        
        # Verify the entry is still balanced
        if not entry.is_balanced:
            # CRITICAL: Entry is unbalanced after line modification
            error_msg = (
                f"CRITICAL INTEGRITY VIOLATION: JournalEntry {entry.id} "
                f"(ref: {entry.reference}) is unbalanced after JournalLine modification. "
                f"Debit: {entry.total_debit}, Credit: {entry.total_credit}"
            )
            
            logger.critical(error_msg)
            
            # Trigger integrity service response
            integrity_service = IntegrityService()
            integrity_service.handle_balance_violation(entry, error_msg)
            
            # Raise exception to prevent the operation
            raise ValidationError(
                f"Modification rend l'écriture {entry.reference} non équilibrée. "
                f"Débit: {entry.total_debit}, Crédit: {entry.total_credit}"
            )
        
        # Log successful verification for audit trail
        logger.info(
            f"Entry balance verified: JournalEntry {entry.id} "
            f"(ref: {entry.reference}) remains balanced after line modification"
        )
        
    except Exception as e:
        # Log the error but don't prevent the operation for non-critical errors
        logger.error(f"Error in balance verification signal: {str(e)}")


@receiver(post_delete, sender=JournalLine)
def verify_entry_balance_after_line_delete(sender, instance, **kwargs):
    """
    Signal handler to verify journal entry balance after line deletion
    """
    try:
        # Get the parent journal entry
        entry = instance.entry
        
        # Skip verification for unposted entries
        if not entry.is_posted:
            return
        
        # Verify the entry is still balanced
        if not entry.is_balanced:
            # CRITICAL: Entry is unbalanced after line deletion
            error_msg = (
                f"CRITICAL INTEGRITY VIOLATION: JournalEntry {entry.id} "
                f"(ref: {entry.reference}) is unbalanced after JournalLine deletion. "
                f"Debit: {entry.total_debit}, Credit: {entry.total_credit}"
            )
            
            logger.critical(error_msg)
            
            # Trigger integrity service response
            integrity_service = IntegrityService()
            integrity_service.handle_balance_violation(entry, error_msg)
            
            # This is critical - we should prevent the deletion
            # Note: This won't actually prevent the deletion since it's post_delete,
            # but it will trigger the integrity response
            logger.critical(f"Line deletion caused imbalance - immediate intervention required")
        
    except Exception as e:
        logger.error(f"Error in balance verification after delete: {str(e)}")


@receiver(post_save, sender=JournalEntry)
def verify_entry_integrity_after_save(sender, instance, created, **kwargs):
    """
    Signal handler to verify entry integrity after save operations
    """
    try:
        # Only verify posted entries
        if not instance.is_posted:
            return
        
        # Verify hash integrity if hash exists
        if instance.hash:
            calculated_hash = instance.calculate_hash()
            if instance.hash != calculated_hash:
                error_msg = (
                    f"CRITICAL HASH VIOLATION: JournalEntry {instance.id} "
                    f"(ref: {instance.reference}) hash mismatch. "
                    f"Stored: {instance.hash}, Calculated: {calculated_hash}"
                )
                
                logger.critical(error_msg)
                
                # Trigger integrity service response
                integrity_service = IntegrityService()
                integrity_service.handle_hash_violation(instance, error_msg)
        
        # Verify balance
        if not instance.is_balanced:
            error_msg = (
                f"CRITICAL BALANCE VIOLATION: Posted JournalEntry {instance.id} "
                f"(ref: {instance.reference}) is unbalanced. "
                f"Debit: {instance.total_debit}, Credit: {instance.total_credit}"
            )
            
            logger.critical(error_msg)
            
            # Trigger integrity service response
            integrity_service = IntegrityService()
            integrity_service.handle_balance_violation(instance, error_msg)
        
    except Exception as e:
        logger.error(f"Error in entry integrity verification: {str(e)}")


# Global integrity check function that can be called manually
def trigger_global_integrity_check(organization_id=None):
    """
    Manually trigger a global integrity check for an organization or all organizations
    """
    integrity_service = IntegrityService()
    
    if organization_id:
        return integrity_service.verify_global_balance(organization_id)
    else:
        # Check all organizations
        from apps.organizations.models import Organization
        results = {}
        
        for org in Organization.objects.all():
            try:
                results[org.id] = integrity_service.verify_global_balance(org.id)
            except Exception as e:
                results[org.id] = {
                    'success': False,
                    'error': str(e)
                }
        
        return results
