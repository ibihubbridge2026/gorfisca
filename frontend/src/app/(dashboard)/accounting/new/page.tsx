'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Calculator
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import accountingService from '@/services/api/accounting.service'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { JournalLine, Account } from '@/types/accounting'

interface NewJournalEntry {
  reference: string
  date: string
  description: string
  lines: JournalLine[]
}

export default function NewJournalEntryPage() {
  const t = useTranslations('accounting')
  const queryClient = useQueryClient()

  // Form state
  const [entry, setEntry] = useState<NewJournalEntry>({
    reference: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    lines: [
      {
        id: '1',
        entry: '',
        account: '',
        account_code: '',
        account_label: '',
        line_type: 'debit',
        amount: 0,
        description: ''
      },
      {
        id: '2',
        entry: '',
        account: '',
        account_code: '',
        account_label: '',
        line_type: 'credit',
        amount: 0,
        description: ''
      }
    ]
  })

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountingService.fetchAccounts(),
    staleTime: 5 * 60 * 1000
  })

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: (entryData: NewJournalEntry) => accountingService.createJournalEntry(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      // Redirect to journal page
      window.location.href = '/(dashboard)/accounting/journal'
    },
    onError: (error: any) => {
      console.error('Error creating entry:', error)
      setErrors({
        submit: error.response?.data?.detail || t('error_creating_entry')
      })
      setIsSubmitting(false)
    }
  })

  // Calculate totals
  const totals = entry.lines.reduce(
    (acc, line) => {
      if (line.line_type === 'debit') {
        acc.totalDebit += line.amount || 0
      } else {
        acc.totalCredit += line.amount || 0
      }
      return acc
    },
    { totalDebit: 0, totalCredit: 0 }
  )

  const balance = totals.totalDebit - totals.totalCredit
  const isBalanced = Math.abs(balance) < 0.01

  // Add new line
  const addLine = () => {
    const newLine: JournalLine = {
      id: Date.now().toString(),
      entry: '',
      account: '',
      account_code: '',
      account_label: '',
      line_type: entry.lines.length % 2 === 0 ? 'debit' : 'credit',
      amount: 0,
      description: ''
    }
    setEntry(prev => ({
      ...prev,
      lines: [...prev.lines, newLine]
    }))
  }

  // Remove line
  const removeLine = (id: string) => {
    if (entry.lines.length <= 2) return
    
    setEntry(prev => ({
      ...prev,
      lines: prev.lines.filter(line => line.id !== id)
    }))
  }

  // Update line
  const updateLine = (id: string, field: keyof JournalLine, value: any) => {
    setEntry(prev => ({
      ...prev,
      lines: prev.lines.map(line =>
        line.id === id ? { ...line, [field]: value } : line
      )
    }))

    // Auto-balance: update opposite line amount
    if (field === 'amount' && value > 0) {
      const currentLine = entry.lines.find(l => l.id === id)
      if (currentLine) {
        const oppositeType = currentLine.line_type === 'debit' ? 'credit' : 'debit'
        const oppositeLine = entry.lines.find(l => l.line_type === oppositeType && l.id !== id)
        if (oppositeLine && oppositeLine.amount === 0) {
          updateLine(oppositeLine.id, 'amount', value)
        }
      }
    }
  }

  // Handle account selection
  const handleAccountChange = (lineId: string, accountCode: string) => {
    const account = accounts?.find(acc => acc.code === accountCode)
    updateLine(lineId, 'account_code', accountCode)
    updateLine(lineId, 'account_label', account?.label || '')
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!entry.reference.trim()) {
      newErrors.reference = t('reference_required')
    }

    if (!entry.date) {
      newErrors.date = t('date_required')
    }

    if (!entry.description.trim()) {
      newErrors.description = t('description_required')
    }

    // Validate lines
    entry.lines.forEach((line, index) => {
      if (!line.account_code) {
        newErrors[`line_${index}_account`] = t('account_required')
      }
      if (!line.amount || line.amount <= 0) {
        newErrors[`line_${index}_amount`] = t('amount_required')
      }
    })

    if (!isBalanced) {
      newErrors.balance = t('entry_must_be_balanced')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    if (!isBalanced) return

    setIsSubmitting(true)
    setErrors({})

    try {
      await createEntryMutation.mutateAsync(entry)
    } catch (error) {
      setIsSubmitting(false)
    }
  }

  // Filter accounts by search
  const [accountSearches, setAccountSearches] = useState<Record<string, string>>({})
  
  const getFilteredAccounts = (lineId: string) => {
    const searchTerm = accountSearches[lineId] || ''
    return accounts?.filter(account =>
      account.is_active &&
      (
        account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    ) || []
  }

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-10" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
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
              {t('new_journal_entry')}
            </h1>
            <p className="text-on-surface-variant">
              {t('new_entry_description')}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            {t('basic_information')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference">{t('reference')}</Label>
              <Input
                id="reference"
                value={entry.reference}
                onChange={(e) => setEntry(prev => ({ ...prev, reference: e.target.value }))}
                placeholder={t('reference_placeholder')}
                className={errors.reference ? 'border-error' : ''}
              />
              {errors.reference && (
                <p className="text-sm text-error mt-1">{errors.reference}</p>
              )}
            </div>

            <div>
              <Label htmlFor="date">{t('date')}</Label>
              <Input
                id="date"
                type="date"
                value={entry.date}
                onChange={(e) => setEntry(prev => ({ ...prev, date: e.target.value }))}
                className={errors.date ? 'border-error' : ''}
              />
              {errors.date && (
                <p className="text-sm text-error mt-1">{errors.date}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              value={entry.description}
              onChange={(e) => setEntry(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('description_placeholder')}
              rows={3}
              className={errors.description ? 'border-error' : ''}
            />
            {errors.description && (
              <p className="text-sm text-error mt-1">{errors.description}</p>
            )}
          </div>
        </Card>

        {/* Journal Lines */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-on-surface">
              {t('journal_lines')}
            </h2>
            <Button type="button" onClick={addLine} variant="ghost">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_line')}
            </Button>
          </div>

          <div className="space-y-3">
            {entry.lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-12 gap-3 items-start p-4 border border-surface-container-low rounded-lg">
                {/* Account */}
                <div className="col-span-4">
                  <Label>{t('account')}</Label>
                  <Select
                    value={line.account_code}
                    onValueChange={(value) => handleAccountChange(line.id, value)}
                  >
                    <SelectTrigger className={errors[`line_${index}_account`] ? 'border-error' : ''}>
                      <SelectValue placeholder={t('select_account')} />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder={t('search_accounts')}
                          value={accountSearches[line.id] || ''}
                          onChange={(e) => setAccountSearches(prev => ({ ...prev, [line.id]: e.target.value }))}
                          className="mb-2"
                        />
                      </div>
                      {getFilteredAccounts(line.id).map((account) => (
                        <SelectItem key={account.id} value={account.code}>
                          <div>
                            <div className="font-medium">{account.code}</div>
                            <div className="text-sm text-on-surface-variant">{account.label}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[`line_${index}_account`] && (
                    <p className="text-sm text-error mt-1">{errors[`line_${index}_account`]}</p>
                  )}
                </div>

                {/* Type */}
                <div className="col-span-2">
                  <Label>{t('type')}</Label>
                  <Select
                    value={line.line_type}
                    onValueChange={(value: 'debit' | 'credit') => updateLine(line.id, 'line_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">{t('debit')}</SelectItem>
                      <SelectItem value="credit">{t('credit')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <Label>{t('amount')}</Label>
                  <Input
                    type="number"
                    value={line.amount || ''}
                    onChange={(e) => updateLine(line.id, 'amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className={errors[`line_${index}_amount`] ? 'border-error' : ''}
                  />
                  {errors[`line_${index}_amount`] && (
                    <p className="text-sm text-error mt-1">{errors[`line_${index}_amount`]}</p>
                  )}
                </div>

                {/* Description */}
                <div className="col-span-3">
                  <Label>{t('line_description')}</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder={t('line_description_placeholder')}
                  />
                </div>

                {/* Actions */}
                <div className="col-span-1 flex items-end justify-end">
                  {entry.lines.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.id)}
                      className="text-error hover:text-error hover:bg-error-container/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Balance Summary */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-on-surface-variant">{t('total_debit')}</p>
                <p className="text-xl font-semibold text-error">
                  {totals.totalDebit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </p>
              </div>
              
              <div className="text-2xl font-bold text-on-surface">-</div>
              
              <div>
                <p className="text-sm text-on-surface-variant">{t('total_credit')}</p>
                <p className="text-xl font-semibold text-emerald-600">
                  {totals.totalCredit.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </p>
              </div>
              
              <div className="border-l border-surface-container-low pl-6">
                <p className="text-sm text-on-surface-variant">{t('balance')}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-semibold ${isBalanced ? 'text-emerald-600' : 'text-error'}`}>
                    {Math.abs(balance).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                  </p>
                  {isBalanced ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-error" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-on-surface-variant" />
              <span className={`text-sm font-medium ${isBalanced ? 'text-emerald-600' : 'text-error'}`}>
                {isBalanced ? t('balanced') : t('not_balanced')}
              </span>
            </div>
          </div>
        </Card>

        {/* Balance Alert */}
        {!isBalanced && (
          <Alert variant="error">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {t('balance_error_message')}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <Alert variant="error">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {errors.submit}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <a href="/(dashboard)/accounting/journal">
              {t('cancel')}
            </a>
          </Button>
          
          <Button
            type="submit"
            disabled={!isBalanced || isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('saving')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {t('save_entry')}
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
