import logging
import json
from datetime import datetime, timezone
from decimal import Decimal
from django.core.cache import cache
from django.db import transaction, models
from django.conf import settings
from apps.accounting.models import JournalEntry, JournalLine
from apps.organizations.models import Organization

logger = logging.getLogger(__name__)


class IntegrityService:
    """
    Service for monitoring and maintaining financial data integrity
    Detects corruption, balance violations, and triggers emergency responses
    """
    
    # Cache keys for integrity status
    INTEGRITY_STATUS_KEY = "integrity_status_{organization_id}"
    MAINTENANCE_MODE_KEY = "maintenance_mode_{organization_id}"
    
    def __init__(self):
        self.logger = logger
        
    def verify_global_balance(self, organization_id):
        """
        Verify that the sum of ALL lines for an organization equals zero
        This is the fundamental accounting equation: ΣDébits = ΣCrédits
        """
        try:
            organization = Organization.objects.get(id=organization_id)
            
            # Calculate global totals
            global_totals = self._calculate_global_totals(organization)
            
            # Check if balanced
            is_balanced = abs(global_totals['total_debit'] - global_totals['total_credit']) < Decimal('0.01')
            
            # Prepare result
            result = {
                'organization_id': organization_id,
                'organization_name': organization.name,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'total_debit': float(global_totals['total_debit']),
                'total_credit': float(global_totals['total_credit']),
                'difference': float(global_totals['total_debit'] - global_totals['total_credit']),
                'is_balanced': is_balanced,
                'total_entries': global_totals['total_entries'],
                'total_lines': global_totals['total_lines'],
                'verification_method': 'global_balance_check'
            }
            
            # Handle imbalance
            if not is_balanced:
                self._handle_global_balance_violation(organization, result)
            else:
                # Clear any previous violations
                self._clear_violation_status(organization_id)
                self.logger.info(
                    f"Global balance verified for {organization.name}: "
                    f"Debit: {global_totals['total_debit']}, Credit: {global_totals['total_credit']}"
                )
            
            return result
            
        except Organization.DoesNotExist:
            error_result = {
                'success': False,
                'error': f'Organization {organization_id} not found',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.logger.error(f"Organization not found in integrity check: {organization_id}")
            return error_result
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.logger.error(f"Error in global balance verification: {str(e)}")
            return error_result
    
    def _calculate_global_totals(self, organization):
        """Calculate total debits and credits for all posted entries"""
        # Aggregate all lines for posted entries
        totals = JournalLine.objects.filter(
            entry__organization=organization,
            entry__is_posted=True
        ).aggregate(
            total_debit=models.Sum('amount', filter=models.Q(line_type='debit')),
            total_credit=models.Sum('amount', filter=models.Q(line_type='credit')),
            total_lines=models.Count('id')
        )
        
        # Count posted entries
        total_entries = JournalEntry.objects.filter(
            organization=organization,
            is_posted=True
        ).count()
        
        return {
            'total_debit': totals['total_debit'] or Decimal('0'),
            'total_credit': totals['total_credit'] or Decimal('0'),
            'total_lines': totals['total_lines'] or 0,
            'total_entries': total_entries
        }
    
    def _handle_global_balance_violation(self, organization, violation_data):
        """Handle critical global balance violation"""
        # CRITICAL: This is a major integrity issue
        error_msg = (
            f"CRITICAL GLOBAL BALANCE VIOLATION for {organization.name} "
            f"(ID: {organization.id}): "
            f"Debit: {violation_data['total_debit']}, "
            f"Credit: {violation_data['total_credit']}, "
            f"Difference: {violation_data['difference']}"
        )
        
        # Log critical error
        self.logger.critical(error_msg)
        
        # Store violation in cache for immediate response
        cache.set(
            self.INTEGRITY_STATUS_KEY.format(organization_id=organization.id),
            {
                'status': 'critical',
                'violation_type': 'global_balance',
                'data': violation_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            timeout=3600  # 1 hour
        )
        
        # Enable maintenance mode
        self._enable_maintenance_mode(organization, error_msg)
        
        # Send to Sentry if configured
        if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
            self._send_to_sentry(error_msg, violation_data)
        
        # Email notification to admins
        self._notify_admins(organization, error_msg, violation_data)
    
    def handle_balance_violation(self, entry, error_msg):
        """Handle individual entry balance violation"""
        self.logger.critical(error_msg)
        
        # Store violation in cache
        cache.set(
            self.INTEGRITY_STATUS_KEY.format(organization_id=entry.organization.id),
            {
                'status': 'critical',
                'violation_type': 'entry_balance',
                'entry_id': entry.id,
                'entry_reference': entry.reference,
                'error': error_msg,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            timeout=3600
        )
        
        # Enable maintenance mode for the organization
        self._enable_maintenance_mode(entry.organization, error_msg)
        
        # Send to Sentry
        if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
            self._send_to_sentry(error_msg, {
                'entry_id': entry.id,
                'entry_reference': entry.reference,
                'organization_id': entry.organization.id
            })
    
    def handle_hash_violation(self, entry, error_msg):
        """Handle hash integrity violation"""
        self.logger.critical(error_msg)
        
        # Store violation in cache
        cache.set(
            self.INTEGRITY_STATUS_KEY.format(organization_id=entry.organization.id),
            {
                'status': 'critical',
                'violation_type': 'hash_integrity',
                'entry_id': entry.id,
                'entry_reference': entry.reference,
                'error': error_msg,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            timeout=3600
        )
        
        # Enable maintenance mode
        self._enable_maintenance_mode(entry.organization, error_msg)
        
        # Send to Sentry
        if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
            self._send_to_sentry(error_msg, {
                'entry_id': entry.id,
                'entry_reference': entry.reference,
                'organization_id': entry.organization.id
            })
    
    def _enable_maintenance_mode(self, organization, reason):
        """Enable maintenance mode for an organization"""
        maintenance_data = {
            'enabled': True,
            'reason': reason,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'organization_id': organization.id,
            'organization_name': organization.name
        }
        
        cache.set(
            self.MAINTENANCE_MODE_KEY.format(organization_id=organization.id),
            maintenance_data,
            timeout=3600  # 1 hour
        )
        
        self.logger.critical(
            f"MAINTENANCE MODE ENABLED for {organization.name}: {reason}"
        )
    
    def _clear_violation_status(self, organization_id):
        """Clear violation status and maintenance mode"""
        cache.delete(self.INTEGRITY_STATUS_KEY.format(organization_id=organization_id))
        cache.delete(self.MAINTENANCE_MODE_KEY.format(organization_id=organization_id))
    
    def get_integrity_status(self, organization_id):
        """Get current integrity status for an organization"""
        integrity_status = cache.get(self.INTEGRITY_STATUS_KEY.format(organization_id=organization_id))
        maintenance_status = cache.get(self.MAINTENANCE_MODE_KEY.format(organization_id=organization_id))
        
        return {
            'integrity_status': integrity_status,
            'maintenance_mode': maintenance_status,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def is_maintenance_active(self, organization_id):
        """Check if maintenance mode is active for an organization"""
        maintenance_status = cache.get(self.MAINTENANCE_MODE_KEY.format(organization_id=organization_id))
        return maintenance_status and maintenance_status.get('enabled', False)
    
    def disable_maintenance_mode(self, organization_id, user=None):
        """Manually disable maintenance mode"""
        cache.delete(self.MAINTENANCE_MODE_KEY.format(organization_id=organization_id))
        
        self.logger.info(
            f"Maintenance mode manually disabled for organization {organization_id}"
            f"{' by user ' + str(user.id) if user else ''}"
        )
    
    def _send_to_sentry(self, error_msg, context):
        """Send critical error to Sentry"""
        try:
            import sentry_sdk
            sentry_sdk.capture_message(
                error_msg,
                level='critical',
                extra=context
            )
        except ImportError:
            # Sentry not installed
            pass
        except Exception as e:
            self.logger.error(f"Failed to send to Sentry: {str(e)}")
    
    def _notify_admins(self, organization, error_msg, context):
        """Send email notification to system administrators"""
        try:
            from django.core.mail import mail_admins
            
            subject = f"🚨 CRITICAL: Financial Integrity Violation - {organization.name}"
            
            message = f"""
CRITICAL FINANCIAL INTEGRITY VIOLATION DETECTED

Organization: {organization.name} (ID: {organization.id})
Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

Error: {error_msg}

Context:
{json.dumps(context, indent=2, default=str)}

IMMEDIATE ACTION REQUIRED:
1. DO NOT modify any accounting data
2. Contact technical support immediately
3. Verify data backups
4. Investigate potential corruption cause

Maintenance mode has been automatically enabled to prevent further damage.
"""
            
            mail_admins(subject, message)
            self.logger.info(f"Admin notification sent for {organization.name}")
            
        except Exception as e:
            self.logger.error(f"Failed to send admin notification: {str(e)}")
    
    def verify_organization_chains(self, organization_id):
        """Verify blockchain integrity for all posted entries in an organization"""
        try:
            organization = Organization.objects.get(id=organization_id)
            
            # Get all posted entries ordered by date
            entries = JournalEntry.objects.filter(
                organization=organization,
                is_posted=True
            ).order_by('date', 'id')
            
            verification_results = []
            is_valid = True
            
            for entry in entries:
                # Verify hash
                calculated_hash = entry.calculate_hash()
                hash_valid = entry.hash == calculated_hash
                
                # Verify balance
                balance_valid = entry.is_balanced
                
                # Verify chain link
                chain_valid = True
                if entry.previous_hash:
                    try:
                        previous_entry = JournalEntry.objects.get(
                            hash=entry.previous_hash,
                            organization=organization
                        )
                    except JournalEntry.DoesNotExist:
                        chain_valid = False
                
                entry_result = {
                    'entry_id': entry.id,
                    'reference': entry.reference,
                    'date': str(entry.date),
                    'hash_valid': hash_valid,
                    'balance_valid': balance_valid,
                    'chain_valid': chain_valid,
                    'is_valid': hash_valid and balance_valid and chain_valid
                }
                
                if not entry_result['is_valid']:
                    is_valid = False
                
                verification_results.append(entry_result)
            
            result = {
                'organization_id': organization_id,
                'organization_name': organization.name,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'total_entries': len(entries),
                'is_valid': is_valid,
                'verification_results': verification_results
            }
            
            if not is_valid:
                self._handle_chain_violation(organization, result)
            
            return result
            
        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            self.logger.error(f"Error in chain verification: {str(e)}")
            return error_result
    
    def _handle_chain_violation(self, organization, violation_data):
        """Handle blockchain chain integrity violation"""
        error_msg = (
            f"CRITICAL BLOCKCHAIN VIOLATION for {organization.name}: "
            f"Chain integrity compromised"
        )
        
        self.logger.critical(error_msg)
        
        # Store violation
        cache.set(
            self.INTEGRITY_STATUS_KEY.format(organization_id=organization.id),
            {
                'status': 'critical',
                'violation_type': 'blockchain_chain',
                'data': violation_data,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            timeout=3600
        )
        
        # Enable maintenance mode
        self._enable_maintenance_mode(organization, error_msg)
        
        # Send to Sentry
        if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
            self._send_to_sentry(error_msg, violation_data)
        
        # Email admins
        self._notify_admins(organization, error_msg, violation_data)
