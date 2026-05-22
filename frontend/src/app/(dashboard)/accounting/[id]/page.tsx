'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  FileText,
  Hash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Shield,
  Link2,
  Calendar,
  User,
  Calculator,
  RefreshCw
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import accountingService from '@/services/api/accounting.service'
import { ValidationBadge } from '@/components/accounting/ValidationBadge'
import { ValidateEntryButton } from '@/components/accounting/ValidateEntryButton'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface JournalEntry {
  id: number
  reference: string
  date: string
  description: string
  is_posted: boolean
  posted_at?: string
  posted_by?: string
  created_at: string
  created_by?: string
  source: 'manual' | 'api' | 'ai_suggestion'
  is_validated: boolean
  validated_by?: string
  validated_at?: string
  hash?: string
  previous_hash?: string
  lines: JournalLine[]
}

interface JournalLine {
  id: number
  account_code: string
  account_label: string
  line_type: 'debit' | 'credit'
  amount: number
  description: string
}

interface ChainVerification {
  is_valid: boolean
  verified_entries: number
  verification_steps: Array<{
    entry_id: number
    reference: string
    date: string
    stored_hash: string
    calculated_hash: string
    is_valid: boolean
    previous_hash?: string
    error?: string
  }>
  message: string
}

export default function JournalEntryDetailPage() {
  const t = useTranslations('accounting')
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const entryId = parseInt(params.id as string)

  const [isVerifying, setIsVerifying] = useState(false)
  const [showVerificationDetails, setShowVerificationDetails] = useState(false)

  // Fetch entry details
  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['journal-entry', entryId],
    queryFn: () => accountingService.getEntry(entryId),
    enabled: !isNaN(entryId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Verify chain mutation
  const verifyChainMutation = useMutation({
    mutationFn: () => accountingService.verifyChain(entryId),
    onSuccess: (data: ChainVerification) => {
      console.log('Chain verification result:', data)
      setShowVerificationDetails(true)
      setIsVerifying(false)
    },
    onError: (error: any) => {
      console.error('Chain verification error:', error)
      setIsVerifying(false)
    }
  })

  // Post entry mutation
  const postEntryMutation = useMutation({
    mutationFn: () => accountingService.postJournalEntry(entryId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entry', entryId] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
    }
  })

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: () => accountingService.deleteJournalEntry(entryId),
    onSuccess: () => {
      router.push('/(dashboard)/accounting/journal')
    }
  })

  const handleVerifyChain = () => {
    setIsVerifying(true)
    verifyChainMutation.mutate()
  }

  const handlePostEntry = () => {
    if (confirm(t('confirm_post_entry'))) {
      postEntryMutation.mutate()
    }
  }

  const handleDeleteEntry = () => {
    if (confirm(t('confirm_delete_entry'))) {
      deleteEntryMutation.mutate()
    }
  }

  const handleValidateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['journal-entry', entryId] })
  }

  // Calculate totals
  const totals = entry?.lines?.reduce(
    (acc, line) => {
      if (line.line_type === 'debit') {
        acc.totalDebit += line.amount
      } else {
        acc.totalCredit += line.amount
      }
      return acc
    },
    { totalDebit: 0, totalCredit: 0 }
  ) || { totalDebit: 0, totalCredit: 0 }

  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.01

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>

        {/* Entry Details Skeleton */}
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>

        {/* Lines Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-4 border border-surface-container-low rounded-lg">
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
                <Skeleton className="h-4" />
              </div>
            ))}
          </div>
        </Card>

        {/* Blockchain Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    const errorMessage = error instanceof Error ? error.message : t('error_loading_entry')
    
    if (errorMessage.includes('403') || errorMessage.includes('permission')) {
      return (
        <Card className="p-6 text-center">
          <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-on-surface mb-2">
            {t('access_denied')}
          </h3>
          <p className="text-on-surface-variant mb-4">
            {t('multi_tenant_access_error')}
          </p>
          <Button onClick={() => router.push('/(dashboard)/accounting/journal')}>
            {t('back_to_journal')}
          </Button>
        </Card>
      )
    }

    return (
      <Card className="p-6 text-center">
        <XCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_entry')}
        </h3>
        <p className="text-on-surface-variant mb-4">{errorMessage}</p>
        <Button onClick={() => router.push('/(dashboard)/accounting/journal')}>
          {t('back_to_journal')}
        </Button>
      </Card>
    )
  }

  if (!entry) {
    return (
      <Card className="p-6 text-center">
        <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('entry_not_found')}
        </h3>
        <p className="text-on-surface-variant mb-4">
          {t('entry_not_found_description')}
        </p>
        <Button onClick={() => router.push('/(dashboard)/accounting/journal')}>
          {t('back_to_journal')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost">
            <a href="/(dashboard)/accounting/journal" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('back_to_journal')}
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              {entry.reference}
            </h1>
            <p className="text-on-surface-variant">
              {format(new Date(entry.date), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ValidationBadge
            source={entry.source}
            is_validated={entry.is_validated}
            validated_by={entry.validated_by}
            validated_at={entry.validated_at}
          />
          
          {entry.source === 'ai_suggestion' && !entry.is_validated && (
            <ValidateEntryButton
              entryId={Number(entry.id)}
              entryReference={entry.reference}
              onValidated={handleValidateSuccess}
            />
          )}
        </div>
      </div>

      {/* Entry Details */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('basic_information')}
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant">{t('reference')}:</span>
                <span className="font-medium text-on-surface">{entry.reference}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant">{t('date')}:</span>
                <span className="font-medium text-on-surface">
                  {format(new Date(entry.date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant">{t('created_by')}:</span>
                <span className="font-medium text-on-surface">
                  {entry.created_by || t('system')}
                </span>
              </div>
              
              {entry.is_posted && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-on-surface-variant">{t('posted_by')}:</span>
                  <span className="font-medium text-on-surface">
                    {entry.posted_by} - {format(new Date(entry.posted_at!), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('status_information')}
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={entry.is_posted ? 'success' : 'secondary'}>
                  {entry.is_posted ? t('posted') : t('draft')}
                </Badge>
                <Badge variant={isBalanced ? 'success' : 'error'}>
                  {isBalanced ? t('balanced') : t('not_balanced')}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">{t('source')}:</span>
                <Badge variant="outline">
                  {entry.source === 'manual' ? t('manual') : 
                   entry.source === 'api' ? t('api') : t('ai_suggestion')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('actions')}
            </h3>
            
            <div className="space-y-2">
              {!entry.is_posted && (
                <Button onClick={handlePostEntry} disabled={postEntryMutation.isPending}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('post_entry')}
                </Button>
              )}
              
              {!entry.is_posted && (
                <Button variant="ghost">
                  <a href={`/(dashboard)/accounting/${entry.id}/edit`} className="flex items-center">
                    <Edit className="w-4 h-4 mr-2" />
                    {t('edit')}
                  </a>
                </Button>
              )}
              
              {!entry.is_posted && (
                <Button variant="tertiary" onClick={handleDeleteEntry} disabled={deleteEntryMutation.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('delete')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Description */}
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-2">
            {t('description')}
          </h3>
          <p className="text-on-surface-variant">
            {entry.description || t('no_description')}
          </p>
        </div>
      </Card>

      {/* Journal Lines */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-on-surface">
            {t('journal_lines')}
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-sm text-on-surface-variant">
              {t('total_lines')}: {entry.lines?.length || 0}
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-on-surface-variant" />
              <span className="text-sm">
                <span className="text-error">{totals.totalDebit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</span>
                {' / '}
                <span className="text-emerald-600">{totals.totalCredit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {entry.lines?.map((line, index) => (
            <div key={line.id} className="grid grid-cols-12 gap-4 p-4 border border-surface-container-low rounded-lg hover:bg-surface-container-low/30 transition-colors">
              <div className="col-span-2">
                <div className="font-mono text-sm text-on-surface-variant">
                  {line.account_code}
                </div>
                <div className="text-sm text-on-surface truncate">
                  {line.account_label}
                </div>
              </div>
              
              <div className="col-span-1 text-center">
                <Badge variant={line.line_type === 'debit' ? 'error' : 'success'}>
                  {line.line_type === 'debit' ? t('debit') : t('credit')}
                </Badge>
              </div>
              
              <div className="col-span-2 text-right">
                <div className={`font-semibold ${line.line_type === 'debit' ? 'text-error' : 'text-emerald-600'}`}>
                  {line.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </div>
              </div>
              
              <div className="col-span-7">
                <div className="text-sm text-on-surface-variant">
                  {line.description || '-'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Blockchain Integrity */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-on-surface flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('blockchain_integrity')}
          </h3>
          <Button 
            onClick={handleVerifyChain} 
            disabled={isVerifying || !entry.hash}
            variant="ghost"
          >
            {isVerifying ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('verifying')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                {t('verify_chain')}
              </div>
            )}
          </Button>
        </div>

        {entry.hash ? (
          <div className="space-y-4">
            {/* Hash Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-on-surface-variant mb-2">
                  {t('current_hash')}
                </h4>
                <div className="p-3 bg-surface-container rounded-lg">
                  <code className="text-xs font-mono text-emerald-600 break-all">
                    {entry.hash}
                  </code>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-on-surface-variant mb-2">
                  {t('previous_hash')}
                </h4>
                <div className="p-3 bg-surface-container rounded-lg">
                  {entry.previous_hash ? (
                    <code className="text-xs font-mono text-blue-600 break-all">
                      {entry.previous_hash}
                    </code>
                  ) : (
                    <span className="text-sm text-on-surface-italic">
                      {t('genesis_block')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chain Link */}
            {entry.previous_hash && (
              <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg">
                <Link2 className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface-variant">
                  {t('linked_to_previous_entry')}
                </span>
                <Badge variant="success" className="text-xs">
                  {t('chain_intact')}
                </Badge>
              </div>
            )}

            {/* Verification Results */}
            {showVerificationDetails && verifyChainMutation.data && (
              <div className="space-y-4">
                <Alert variant={verifyChainMutation.data.is_valid ? 'success' : 'error'}>
                  {verifyChainMutation.data.is_valid ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    {verifyChainMutation.data.message}
                  </AlertDescription>
                </Alert>

                <div>
                  <h4 className="text-sm font-medium text-on-surface mb-2">
                    {t('verification_details')}
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {verifyChainMutation.data.verification_steps.map((step, index) => (
                      <div key={index} className="p-3 bg-surface-container rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-on-surface">
                            {step.reference}
                          </span>
                          <Badge variant={step.is_valid ? 'success' : 'error'}>
                            {step.is_valid ? t('valid') : t('invalid')}
                          </Badge>
                        </div>
                        {step.error && (
                          <p className="text-xs text-error mt-1">{step.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Hash className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
            <h4 className="text-lg font-medium text-on-surface mb-2">
              {t('no_blockchain_data')}
            </h4>
            <p className="text-on-surface-variant">
              {t('no_blockchain_data_description')}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
