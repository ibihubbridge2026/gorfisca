'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  CheckSquare,
  Square,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { integrationService, useUploadFile, useValidateTransaction, useBatchValidate, useCreateJournalEntries, useAccounts } from '@/services/api/integration.service'

// Types
interface NormalizedTransaction {
  id: number
  original_label: string
  original_amount: number
  original_date: string
  normalized_label: string
  normalized_amount: number
  normalized_date: string
  suggested_debit_account?: {
    id: number
    code: string
    label: string
    account_type: string
    account_class: number
  }
  suggested_credit_account?: {
    id: number
    code: string
    label: string
    account_type: string
    account_class: number
  }
  validated_debit_account?: {
    id: number
    code: string
    label: string
    account_type: string
    account_class: number
  }
  validated_credit_account?: {
    id: number
    code: string
    label: string
    account_type: string
    account_class: number
  }
  debit_confidence_score?: number
  credit_confidence_score?: number
  confidence_average?: number
  validation_status: 'pending' | 'validated' | 'rejected' | 'processed'
  is_ready_for_journal_entry: boolean
}

interface UploadResult {
  success: boolean
  raw_ingestion_id: number
  source_type: string
  stats: {
    total_parsed: number
    total_normalized: number
    total_errors: number
    total_warnings: number
    success_rate: number
    ai_suggestions: {
      total_with_suggestions: number
      suggestion_rate: number
      avg_debit_confidence: number
      avg_credit_confidence: number
      high_confidence_count: number
      high_confidence_rate: number
    }
  }
  transactions?: NormalizedTransaction[]
  errors?: string[]
  warnings?: string[]
  processing_time?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Composants utilitaires
const ConfidenceBadge = ({ score }: { score?: number }) => {
  if (!score) return null

  const getBadgeConfig = (score: number) => {
    if (score >= 80) {
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        label: 'Haute confiance'
      }
    } else if (score >= 50) {
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle,
        label: 'Moyenne confiance'
      }
    } else {
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertCircle,
        label: 'Faible confiance'
      }
    }
  }

  const config = getBadgeConfig(score)
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {score}%
    </div>
  )
}

const AccountSelector = ({ 
  value, 
  onChange, 
  accounts,
  placeholder = "Sélectionner un compte"
}: {
  value?: number
  onChange: (accountId: number) => void
  accounts: any[]
  placeholder?: string
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredAccounts = accounts.filter(account =>
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedAccount = accounts.find(acc => acc.id === value)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedAccount ? (
              <>
                <span className="font-medium text-gray-900">{selectedAccount.code}</span>
                <span className="text-gray-500">{selectedAccount.label}</span>
              </>
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <Search className="w-4 h-4 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Rechercher un compte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  onChange(account.id)
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{account.code}</span>
                  <span className="text-gray-500 text-sm">{account.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Étape 1: Upload
const UploadStep = ({ 
  onNext, 
  isUploading, 
  uploadProgress, 
  uploadError 
}: {
  onNext: (result: UploadResult) => void
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null
}) => {
  const t = useTranslations()
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sourceName, setSourceName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const uploadMutation = useUploadFile()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFile = files.find(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.json')
    )
    
    if (validFile) {
      setSelectedFile(validFile)
      setSourceName(validFile.name.replace(/\.[^/.]+$/, ''))
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setSourceName(file.name.replace(/\.[^/.]+$/, ''))
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !sourceName.trim()) return

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        sourceName: sourceName.trim(),
        sourceType: selectedFile.name.endsWith('.json') ? 'json' : 'excel'
      })
      
      if (result.success) {
        toast.success(t('integrations.wizard.toasts.upload_success'))
        onNext(result)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(t('integrations.wizard.toasts.upload_error'))
    }
  }, [selectedFile, sourceName, uploadMutation, onNext, t])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('integrations.wizard.upload.title')}</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          {t('integrations.wizard.upload.description')}
        </p>
      </div>

      {/* Zone de Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
            <div>
              <p className="text-gray-900 font-medium">{t('integrations.wizard.upload.processing')}</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">{uploadProgress}%</p>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4">
            <FileText className="w-12 h-12 text-green-600 mx-auto" />
            <div>
              <p className="text-gray-900 font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-900 font-medium">
                {t('integrations.wizard.upload.drag_drop_text')}
              </p>
              <p className="text-sm text-gray-500">
                {t('integrations.wizard.upload.browse_text')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded">Excel</span>
              <span className="px-2 py-1 bg-gray-100 rounded">CSV</span>
              <span className="px-2 py-1 bg-gray-100 rounded">JSON</span>
            </div>
          </div>
        )}
      </div>

      {/* Nom de la source */}
      {selectedFile && !isUploading && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('integrations.wizard.upload.source_name_label')}
          </label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder={t('integrations.wizard.upload.source_name_placeholder')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Erreur */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedFile && !isUploading && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setSelectedFile(null)
              setSourceName('')
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {t('integrations.wizard.upload.cancel_button')}
          </button>
          <button
            onClick={handleUpload}
            disabled={!sourceName.trim() || uploadMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('integrations.wizard.upload.uploading_button')}
              </div>
            ) : (
              t('integrations.wizard.upload.upload_button')
            )}
          </button>
        </div>
      )}
    </motion.div>
  )
}

// Étape 2: Revue & Correction IA
const ReviewStep = ({ 
  uploadResult, 
  onNext, 
  onPrevious 
}: {
  uploadResult: UploadResult
  onNext: () => void
  onPrevious: () => void
}) => {
  const t = useTranslations()
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>(uploadResult.transactions || [])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: accounts } = useAccounts()
  const validateMutation = useValidateTransaction()
  const batchValidateMutation = useBatchValidate()

  const filteredTransactions = transactions.filter(tx =>
    tx.original_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.normalized_label.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAccountChange = (transactionId: number, field: 'debit' | 'credit', accountId: number) => {
    setTransactions(prev => prev.map(tx => {
      if (tx.id === transactionId) {
        const account = accounts?.find(acc => acc.id === accountId)
        if (account) {
          return {
            ...tx,
            [`validated_${field}_account`]: account
          }
        }
      }
      return tx
    }))
  }

  const handleValidateAllHighConfidence = () => {
    const highConfidenceTransactions = transactions.filter(
      tx => tx.confidence_average && tx.confidence_average >= 90 && !tx.validated_debit_account && !tx.validated_credit_account
    )

    if (highConfidenceTransactions.length === 0) return

    const validations = highConfidenceTransactions.map(tx => ({
      transaction_id: tx.id,
      debit_account_id: tx.suggested_debit_account?.id!,
      credit_account_id: tx.suggested_credit_account?.id!,
      validation_notes: 'Validé automatiquement (haute confiance IA)'
    }))

    batchValidateMutation.mutate(validations, {
      onSuccess: (result) => {
        // Mettre à jour les transactions validées
        result.results.forEach((validation: any) => {
          if (validation.success) {
            const tx = transactions.find(t => t.id === validation.transaction_id)
            if (tx && tx.suggested_debit_account && tx.suggested_credit_account) {
              handleAccountChange(tx.id, 'debit', tx.suggested_debit_account.id)
              handleAccountChange(tx.id, 'credit', tx.suggested_credit_account.id)
            }
          }
        })
      }
    })
  }

  const handleValidateSelected = () => {
    const selectedTxList = transactions.filter(tx => selectedTransactions.has(tx.id))
    
    if (selectedTxList.length === 0) return

    const validations = selectedTxList.map(tx => ({
      transaction_id: tx.id,
      debit_account_id: tx.validated_debit_account?.id || tx.suggested_debit_account?.id!,
      credit_account_id: tx.validated_credit_account?.id || tx.suggested_credit_account?.id!,
      validation_notes: 'Validé manuellement'
    }))

    batchValidateMutation.mutate(validations, {
      onSuccess: (result) => {
        setSelectedTransactions(new Set())
        // Mettre à jour les transactions validées
        result.results.forEach((validation: any) => {
          if (validation.success) {
            const tx = transactions.find(t => t.id === validation.transaction_id)
            if (tx) {
              if (tx.suggested_debit_account && !tx.validated_debit_account) {
                handleAccountChange(tx.id, 'debit', tx.suggested_debit_account.id)
              }
              if (tx.suggested_credit_account && !tx.validated_credit_account) {
                handleAccountChange(tx.id, 'credit', tx.suggested_credit_account.id)
              }
            }
          }
        })
      }
    })
  }

  const readyTransactions = transactions.filter(tx => 
    tx.validated_debit_account && tx.validated_credit_account
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Revue et correction IA</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          L'IA a suggéré les comptes OHADA. Vérifiez et corrigez si nécessaire.
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{uploadResult.stats.total_normalized}</div>
          <div className="text-sm text-gray-500">Transactions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{uploadResult.stats.ai_suggestions.high_confidence_count}</div>
          <div className="text-sm text-gray-500">Haute confiance</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{uploadResult.stats.ai_suggestions.avg_debit_confidence.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">Confiance moyenne</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{readyTransactions.length}</div>
          <div className="text-sm text-gray-500">Prêtes</div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button
            onClick={handleValidateAllHighConfidence}
            disabled={batchValidateMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {batchValidateMutation.isPending ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validation...
              </div>
            ) : (
              'Tout valider (>90%)'
            )}
          </button>
          
          {selectedTransactions.size > 0 && (
            <button
              onClick={handleValidateSelected}
              disabled={batchValidateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider la sélection ({selectedTransactions.size})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions(new Set(filteredTransactions.map(tx => tx.id)))
                      } else {
                        setSelectedTransactions(new Set())
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Débit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Crédit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confiance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.has(transaction.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedTransactions)
                        if (e.target.checked) {
                          newSelected.add(transaction.id)
                        } else {
                          newSelected.delete(transaction.id)
                        }
                        setSelectedTransactions(newSelected)
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.original_label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transaction.normalized_date}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.normalized_amount.toLocaleString()} FCFA
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <AccountSelector
                      value={transaction.validated_debit_account?.id || transaction.suggested_debit_account?.id}
                      onChange={(accountId) => handleAccountChange(transaction.id, 'debit', accountId)}
                      accounts={accounts || []}
                    />
                    <ConfidenceBadge score={transaction.debit_confidence_score} />
                  </td>
                  <td className="px-4 py-3">
                    <AccountSelector
                      value={transaction.validated_credit_account?.id || transaction.suggested_credit_account?.id}
                      onChange={(accountId) => handleAccountChange(transaction.id, 'credit', accountId)}
                      accounts={accounts || []}
                    />
                    <ConfidenceBadge score={transaction.credit_confidence_score} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge score={transaction.confidence_average} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </div>
        </button>
        
        <button
          onClick={onNext}
          disabled={readyTransactions.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            Continuer
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </motion.div>
  )
}

// Étape 3: Finalisation
const FinalizationStep = ({ 
  uploadResult, 
  onPrevious,
  onClose,
  onSuccess 
}: {
  uploadResult: UploadResult
  onPrevious: () => void
  onClose: () => void
  onSuccess?: () => void
}) => {
  const [isCompleted, setIsCompleted] = useState(false)
  const createJournalEntriesMutation = useCreateJournalEntries()

  const transactions = uploadResult.transactions || []
  const readyTransactions = transactions.filter(tx => 
    tx.validated_debit_account && tx.validated_credit_account
  )

  const handleCreateJournalEntries = async () => {
    try {
      const transactionIds = readyTransactions.map(tx => tx.id)
      const result = await createJournalEntriesMutation.mutateAsync({
        transactionIds,
        referencePrefix: 'AUTO'
      })
      
      if (result.success) {
        setIsCompleted(true)
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error creating journal entries:', error)
    }
  }

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <CheckCircle className="w-10 h-10 text-green-600" />
          </motion.div>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Importation réussie !
          </h3>
          <p className="text-gray-600">
            {readyTransactions.length} écritures comptables ont été générées avec succès
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">
              Les écritures sont maintenant disponibles dans votre grand livre
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Finalisation</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Vérifiez le résumé et générez les écritures comptables
        </p>
      </div>

      {/* Résumé */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Résumé de l'importation</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Source</div>
            <div className="font-medium">{uploadResult.source_type}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Transactions traitées</div>
            <div className="font-medium">{uploadResult.stats.total_normalized}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Taux de succès</div>
            <div className="font-medium">{uploadResult.stats.success_rate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Prêtes pour injection</div>
            <div className="font-medium text-green-600">{readyTransactions.length}</div>
          </div>
        </div>

        {uploadResult.errors && uploadResult.errors.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">Erreurs ({uploadResult.errors.length})</div>
            <div className="bg-red-50 border border-red-200 rounded p-2 max-h-20 overflow-y-auto">
              {uploadResult.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-800">{error}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={createJournalEntriesMutation.isPending}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </div>
        </button>
        
        <button
          onClick={handleCreateJournalEntries}
          disabled={readyTransactions.length === 0 || createJournalEntriesMutation.isPending}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createJournalEntriesMutation.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Génération...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              Générer les écritures
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// Composant principal
export const ImportWizardModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const t = useTranslations()
  const [currentStep, setCurrentStep] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const resetWizard = () => {
    setCurrentStep(0)
    setUploadResult(null)
    setUploadProgress(0)
    setUploadError(null)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const handleNext = (result: UploadResult) => {
    setUploadResult(result)
    setCurrentStep(1)
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const steps = [
    { title: 'Importation', description: 'Upload de vos données' },
    { title: 'Validation IA', description: 'Revoyez les suggestions' },
    { title: 'Finalisation', description: 'Générez les écritures' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Assistant d'Importation
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                      ${index <= currentStep 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-500'
                      }
                    `}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="ml-2">
                    <div className={`text-sm font-medium ${
                      index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs ${
                      index <= currentStep ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`ml-8 w-8 h-0.5 ${
                      index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <UploadStep
                key="upload"
                onNext={handleNext}
                isUploading={uploadProgress > 0 && uploadProgress < 100}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
              />
            )}
            {currentStep === 1 && uploadResult && (
              <ReviewStep
                key="review"
                uploadResult={uploadResult}
                onNext={() => setCurrentStep(2)}
                onPrevious={handlePrevious}
              />
            )}
            {currentStep === 2 && uploadResult && (
              <FinalizationStep
                key="finalization"
                uploadResult={uploadResult}
                onPrevious={handlePrevious}
                onClose={handleClose}
                onSuccess={onSuccess}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
