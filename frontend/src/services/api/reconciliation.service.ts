import axios from 'axios'
import { formatCurrency } from '@/lib/utils'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle token refresh/errors
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

// Types for reconciliation
export interface BankTransaction {
  id: string
  date: string
  description: string
  amount: number
  transaction_type: 'credit' | 'debit'
  reference: string
  status: 'pending' | 'matched' | 'flagged' | 'ignored'
  journal_line?: string
  account_name?: string
  account_code?: string
  entry_reference?: string
  confidence_score: number
  notes?: string
  import_batch_id?: string
  created_at: string
  updated_at: string
  matched_at?: string
  matched_by?: string
}

export interface ReconciliationRule {
  id: string
  name: string
  rule_type: 'amount_exact' | 'amount_range' | 'description_contains' | 'reference_contains' | 'date_range'
  parameters: Record<string, any>
  target_account: string
  target_account_name: string
  target_account_code: string
  is_active: boolean
  priority: number
  confidence_boost: number
  created_at: string
  updated_at: string
}

export interface ImportBatch {
  id: string
  batch_id: string
  filename: string
  status: 'pending' | 'completed' | 'failed'
  total_rows: number
  imported_rows: number
  failed_rows: number
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface PotentialMatch {
  journal_line_id: string
  entry_reference: string
  account_code: string
  account_label: string
  amount: number
  line_type: 'debit' | 'credit'
  confidence_score: number
  entry_date: string
  entry_description: string
}

export interface ReconciliationStats {
  total_transactions: number
  matched_transactions: number
  pending_transactions: number
  flagged_transactions: number
  reconciliation_rate: number
  total_journal_lines: number
  reconciled_lines: number
  journal_reconciliation_rate: number
}

// Reconciliation Service
export const reconciliationService = {
  // Fetch bank transactions
  async fetchTransactions(params?: {
    status?: string
    transaction_type?: string
    search?: string
    ordering?: string
  }): Promise<BankTransaction[]> {
    try {
      const response = await apiClient.get('/api/v1/reconciliation/transactions/', { params })
      return response.data.results
    } catch (error) {
      console.error('Error fetching transactions:', error)
      throw error
    }
  },

  // Fetch single transaction
  async fetchTransaction(id: string): Promise<BankTransaction> {
    try {
      const response = await apiClient.get(`/api/v1/reconciliation/transactions/${id}/`)
      return response.data
    } catch (error) {
      console.error('Error fetching transaction:', error)
      throw error
    }
  },

  // Import transactions from CSV
  async importCSV(file: File): Promise<ImportBatch> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post('/api/v1/reconciliation/transactions/bulk_import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      console.error('Error importing CSV:', error)
      throw error
    }
  },

  // Get potential matches for a transaction
  async getPotentialMatches(transactionId: string): Promise<PotentialMatch[]> {
    try {
      const response = await apiClient.get(`/api/v1/reconciliation/transactions/${transactionId}/potential_matches/`)
      return response.data.matches
    } catch (error) {
      console.error('Error fetching potential matches:', error)
      throw error
    }
  },

  // Match transaction with journal line
  async matchTransaction(transactionId: string, journalLineId: number): Promise<BankTransaction> {
    try {
      const response = await apiClient.post(`/api/v1/reconciliation/transactions/${transactionId}/match/`, {
        journal_line_id: journalLineId,
      })
      return response.data
    } catch (error) {
      console.error('Error matching transaction:', error)
      throw error
    }
  },

  // Unmatch transaction
  async unmatchTransaction(transactionId: string): Promise<BankTransaction> {
    try {
      const response = await apiClient.post(`/api/v1/reconciliation/transactions/${transactionId}/unmatch/`)
      return response.data
    } catch (error) {
      console.error('Error unmatching transaction:', error)
      throw error
    }
  },

  // Flag transaction
  async flagTransaction(transactionId: string, reason: string): Promise<BankTransaction> {
    try {
      const response = await apiClient.post(`/api/v1/reconciliation/transactions/${transactionId}/flag/`, {
        reason,
      })
      return response.data
    } catch (error) {
      console.error('Error flagging transaction:', error)
      throw error
    }
  },

  // Ignore transaction
  async ignoreTransaction(transactionId: string): Promise<BankTransaction> {
    try {
      const response = await apiClient.post(`/api/v1/reconciliation/transactions/${transactionId}/ignore/`)
      return response.data
    } catch (error) {
      console.error('Error ignoring transaction:', error)
      throw error
    }
  },

  // Auto-match transactions
  async autoMatchTransactions(confidenceThreshold: number = 80, limit: number = 100): Promise<{
    matches_made: number
    confidence_threshold: number
    transactions_processed: number
  }> {
    try {
      const response = await apiClient.post('/api/v1/reconciliation/transactions/auto_match/', {
        confidence_threshold: confidenceThreshold,
        limit,
      })
      return response.data
    } catch (error) {
      console.error('Error auto-matching transactions:', error)
      throw error
    }
  },

  // Get reconciliation statistics
  async getReconciliationStats(): Promise<ReconciliationStats> {
    try {
      const response = await apiClient.get('/api/v1/reconciliation/transactions/stats/')
      return response.data
    } catch (error) {
      console.error('Error fetching reconciliation stats:', error)
      throw error
    }
  },

  // Fetch import batches
  async fetchImportBatches(params?: {
    status?: string
    search?: string
    ordering?: string
  }): Promise<ImportBatch[]> {
    try {
      const response = await apiClient.get('/api/v1/reconciliation/imports/', { params })
      return response.data.results
    } catch (error) {
      console.error('Error fetching import batches:', error)
      throw error
    }
  },

  // Fetch reconciliation rules
  async fetchReconciliationRules(params?: {
    rule_type?: string
    is_active?: boolean
    search?: string
    ordering?: string
  }): Promise<ReconciliationRule[]> {
    try {
      const response = await apiClient.get('/api/v1/reconciliation/rules/', { params })
      return response.data.results
    } catch (error) {
      console.error('Error fetching reconciliation rules:', error)
      throw error
    }
  },

  // Create reconciliation rule
  async createReconciliationRule(ruleData: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
    try {
      const response = await apiClient.post('/api/v1/reconciliation/rules/', ruleData)
      return response.data
    } catch (error) {
      console.error('Error creating reconciliation rule:', error)
      throw error
    }
  },

  // Update reconciliation rule
  async updateReconciliationRule(id: string, ruleData: Partial<ReconciliationRule>): Promise<ReconciliationRule> {
    try {
      const response = await apiClient.put(`/api/v1/reconciliation/rules/${id}/`, ruleData)
      return response.data
    } catch (error) {
      console.error('Error updating reconciliation rule:', error)
      throw error
    }
  },

  // Delete reconciliation rule
  async deleteReconciliationRule(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/reconciliation/rules/${id}/`)
    } catch (error) {
      console.error('Error deleting reconciliation rule:', error)
      throw error
    }
  },
}

export default reconciliationService
