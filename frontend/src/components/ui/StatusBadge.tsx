import React from 'react'
import { cn } from '@/lib/utils'
import { TransactionStatus } from '@/types/accounting'

interface StatusBadgeProps {
  status: TransactionStatus | 'active' | 'inactive' | 'matched' | 'pending' | 'error'
  size?: 'sm' | 'md'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-full font-bold uppercase tracking-wider'
  
  const sizes = {
    sm: 'px-2 py-1 text-[10px]',
    md: 'px-3 py-1 text-xs'
  }
  
  const statusStyles = {
    matched: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-tertiary',
    error: 'bg-red-50 text-error',
    active: 'bg-emerald-50 text-emerald-700',
    inactive: 'bg-slate-50 text-on-surface-variant'
  }
  
  return (
    <span className={cn(baseStyles, sizes[size], statusStyles[status], className)}>
      {status}
    </span>
  )
}

// Reconcile Ribbon Component (vertical band for table rows)
interface ReconcileRibbonProps {
  status: 'matched' | 'pending'
  className?: string
}

export const ReconcileRibbon: React.FC<ReconcileRibbonProps> = ({ status, className }) => {
  const ribbonStyles = {
    matched: 'border-l-4 border-primary',
    pending: 'border-l-4 border-tertiary'
  }
  
  return (
    <div className={cn(ribbonStyles[status], className)} />
  )
}
