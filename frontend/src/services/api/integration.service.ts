import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'

// Configuration du client API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Ajouter le token JWT aux requêtes
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Gérer les erreurs d'authentification
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types pour les intégrations
export interface IntegrationSource {
  id: number
  name: string
  source_type: string
  description?: string
  status: string
  last_sync_at?: string
  created_at: string
}

export interface RawIngestion {
  id: number
  source_name: string
  source_type: string
  payload_type: string
  file_name?: string
  file_size?: number
  processing_status: string
  total_records: number
  processed_records: number
  failed_records: number
  processing_started_at?: string
  processing_completed_at?: string
  processing_duration?: string
  created_at: string
}

export interface NormalizedTransaction {
  id: number
  raw_ingestion: number
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
  validated_by?: number
  validated_at?: string
  validation_notes?: string
  ai_suggestions?: any
  is_ready_for_journal_entry: boolean
  created_at: string
}

export interface UploadResult {
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

export interface ValidationResult {
  success: boolean
  message: string
  transaction_id?: number
  validation_status?: string
}

export interface BatchValidationResult {
  success: boolean
  message: string
  results: {
    transaction_id: number
    success: boolean
    status?: string
    error?: string
  }[]
}

export interface JournalEntryCreationResult {
  success: boolean
  message: string
  journal_entries: {
    transaction_id: number
    journal_entry_id: number
    reference: string
  }[]
}

export interface Account {
  id: number
  code: string
  label: string
  account_type: string
  account_class: number
  is_active: boolean
}

// Service d'intégration
export const integrationService = {
  // Upload et traitement
  async uploadFile(file: File, sourceName: string, sourceType: string = 'excel', description?: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('source_name', sourceName)
    formData.append('source_type', sourceType)
    if (description) {
      formData.append('description', description)
    }

    const response = await apiClient.post('/integrations/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },

  // Récupérer les transactions en attente
  async getPendingTransactions(sourceId?: number): Promise<NormalizedTransaction[]> {
    const params = sourceId ? { source_id: sourceId } : {}
    const response = await apiClient.get('/integrations/transactions/', { params })
    return response.data
  },

  // Valider une transaction
  async validateTransaction(transactionId: number, debitAccountId: number, creditAccountId: number, notes?: string): Promise<ValidationResult> {
    const response = await apiClient.post('/integrations/validate_transactions/', {
      transaction_id: transactionId,
      debit_account_id: debitAccountId,
      credit_account_id: creditAccountId,
      validation_notes: notes,
    })
    return response.data
  },

  // Validation en lot
  async batchValidate(validations: Array<{
    transaction_id: number
    debit_account_id: number
    credit_account_id: number
    validation_notes?: string
  }>): Promise<BatchValidationResult> {
    const response = await apiClient.post('/integrations/batch_validate/', {
      validations,
    })
    return response.data
  },

  // Rejeter des transactions
  async rejectTransactions(transactionIds: number[], reason: string = 'Rejeté par l\'utilisateur'): Promise<{ success: boolean; message: string; rejected_count: number }> {
    const response = await apiClient.post('/integrations/reject_transactions/', {
      transaction_ids: transactionIds,
      reason,
    })
    return response.data
  },

  // Créer les écritures comptables
  async createJournalEntries(transactionIds: number[], referencePrefix: string = 'AUTO'): Promise<JournalEntryCreationResult> {
    const response = await apiClient.post('/integrations/create_journal_entries/', {
      transaction_ids: transactionIds,
      reference_prefix: referencePrefix,
    })
    return response.data
  },

  // Récupérer les sources d'intégration
  async getIntegrationSources(): Promise<IntegrationSource[]> {
    const response = await apiClient.get('/integrations/sources/')
    return response.data
  },

  // Récupérer les ingestions
  async getRawIngestions(): Promise<RawIngestion[]> {
    const response = await apiClient.get('/integrations/ingestions/')
    return response.data
  },

  // Récupérer les comptes OHADA
  async getAccounts(): Promise<Account[]> {
    const response = await apiClient.get('/accounting/accounts/')
    return response.data
  },

  // Obtenir les statistiques
  async getStats(period: string = 'month', sourceType?: string): Promise<any> {
    const params: any = { period }
    if (sourceType) {
      params.source_type = sourceType
    }
    const response = await apiClient.get('/integrations/stats/', { params })
    return response.data
  },
}

// Hooks React Query pour les intégrations
export const useIntegrationSources = () => {
  return useQuery({
    queryKey: ['integration-sources'],
    queryFn: integrationService.getIntegrationSources,
  })
}

export const usePendingTransactions = (sourceId?: number) => {
  return useQuery({
    queryKey: ['pending-transactions', sourceId],
    queryFn: () => integrationService.getPendingTransactions(sourceId),
    enabled: true,
  })
}

export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: integrationService.getAccounts,
  })
}

export const useUploadFile = () => {
  return useMutation({
    mutationFn: ({ file, sourceName, sourceType, description }: {
      file: File
      sourceName: string
      sourceType?: string
      description?: string
    }) => integrationService.uploadFile(file, sourceName, sourceType, description),
  })
}

export const useValidateTransaction = () => {
  return useMutation({
    mutationFn: ({ transactionId, debitAccountId, creditAccountId, notes }: {
      transactionId: number
      debitAccountId: number
      creditAccountId: number
      notes?: string
    }) => integrationService.validateTransaction(transactionId, debitAccountId, creditAccountId, notes),
  })
}

export const useBatchValidate = () => {
  return useMutation({
    mutationFn: (validations: Array<{
      transaction_id: number
      debit_account_id: number
      credit_account_id: number
      validation_notes?: string
    }>) => integrationService.batchValidate(validations),
  })
}

export const useRejectTransactions = () => {
  return useMutation({
    mutationFn: ({ transactionIds, reason }: {
      transactionIds: number[]
      reason?: string
    }) => integrationService.rejectTransactions(transactionIds, reason),
  })
}

export const useCreateJournalEntries = () => {
  return useMutation({
    mutationFn: ({ transactionIds, referencePrefix }: {
      transactionIds: number[]
      referencePrefix?: string
    }) => integrationService.createJournalEntries(transactionIds, referencePrefix),
  })
}

export const useIntegrationStats = (period: string = 'month', sourceType?: string) => {
  return useQuery({
    queryKey: ['integration-stats', period, sourceType],
    queryFn: () => integrationService.getStats(period, sourceType),
  })
}
