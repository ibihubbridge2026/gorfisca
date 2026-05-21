import axios from 'axios'
import { Account, JournalEntry } from '@/types/accounting'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies if using session auth
})

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// Handle token refresh/errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Types for API responses
interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface AccountResponse extends Account {
  balance: number
}

// Accounting Service
export const accountingService = {
  // Fetch all accounts for the current user's organization
  async fetchAccounts(params?: {
    account_type?: string
    account_class?: number
    is_active?: boolean
    search?: string
    ordering?: string
  }): Promise<AccountResponse[]> {
    try {
      const response = await apiClient.get<ApiResponse<AccountResponse>>(
        '/api/v1/accounting/accounts/',
        { params }
      )
      return response.data.results
    } catch (error) {
      console.error('Error fetching accounts:', error)
      throw error
    }
  },

  // Fetch single account by ID
  async fetchAccount(id: string): Promise<AccountResponse> {
    try {
      const response = await apiClient.get<AccountResponse>(
        `/api/v1/accounting/accounts/${id}/`
      )
      return response.data
    } catch (error) {
      console.error('Error fetching account:', error)
      throw error
    }
  },

  // Create new account
  async createAccount(accountData: Partial<Account>): Promise<AccountResponse> {
    try {
      const response = await apiClient.post<AccountResponse>(
        '/api/v1/accounting/accounts/',
        accountData
      )
      return response.data
    } catch (error) {
      console.error('Error creating account:', error)
      throw error
    }
  },

  // Update account
  async updateAccount(id: string, accountData: Partial<Account>): Promise<AccountResponse> {
    try {
      const response = await apiClient.put<AccountResponse>(
        `/api/v1/accounting/accounts/${id}/`,
        accountData
      )
      return response.data
    } catch (error) {
      console.error('Error updating account:', error)
      throw error
    }
  },

  // Delete account
  async deleteAccount(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/accounting/accounts/${id}/`)
    } catch (error) {
      console.error('Error deleting account:', error)
      throw error
    }
  },

  // Get trial balance
  async getTrialBalance(params?: {
    start_date?: string
    end_date?: string
  }): Promise<any> {
    try {
      const response = await apiClient.get(
        '/api/v1/accounting/accounts/trial_balance/',
        { params }
      )
      return response.data
    } catch (error) {
      console.error('Error fetching trial balance:', error)
      throw error
    }
  },

  // Get account balance
  async getAccountBalance(id: string, params?: {
    start_date?: string
    end_date?: string
  }): Promise<{ balance: number }> {
    try {
      const response = await apiClient.get(
        `/api/v1/accounting/accounts/${id}/balance/`,
        { params }
      )
      return response.data
    } catch (error) {
      console.error('Error fetching account balance:', error)
      throw error
    }
  },

  // Fetch journal entries
  async fetchJournalEntries(params?: {
    is_posted?: boolean
    search?: string
    ordering?: string
    page?: number
    page_size?: number
  }): Promise<JournalEntry[]> {
    try {
      const response = await apiClient.get<ApiResponse<JournalEntry>>(
        '/api/v1/accounting/journal-entries/',
        { params }
      )
      return response.data.results
    } catch (error) {
      console.error('Error fetching journal entries:', error)
      throw error
    }
  },

  // Create journal entry
  async createJournalEntry(entryData: Partial<JournalEntry>): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        '/api/v1/accounting/journal-entries/',
        entryData
      )
      return response.data
    } catch (error) {
      console.error('Error creating journal entry:', error)
      throw error
    }
  },

  // Post (validate) journal entry
  async postJournalEntry(id: string): Promise<JournalEntry> {
    try {
      const response = await apiClient.post<JournalEntry>(
        `/api/v1/accounting/journal-entries/${id}/post/`
      )
      return response.data
    } catch (error) {
      console.error('Error posting journal entry:', error)
      throw error
    }
  },

  // Get unposted entries
  async getUnpostedEntries(): Promise<JournalEntry[]> {
    try {
      const response = await apiClient.get<ApiResponse<JournalEntry>>(
        '/api/v1/accounting/journal-entries/unposted/'
      )
      return response.data.results
    } catch (error) {
      console.error('Error fetching unposted entries:', error)
      throw error
    }
  },

  // Validate an AI-suggested entry
  async validateAIEntry(entryId: number): Promise<any> {
    try {
      const response = await apiClient.post(`/api/v1/accounting/journal-entries/${entryId}/validate_ai_entry/`)
      return response.data
    } catch (error) {
      console.error('Error validating AI entry:', error)
      throw error
    }
  },

  // Get entries pending validation
  async getPendingValidationEntries(): Promise<JournalEntry[]> {
    try {
      const response = await apiClient.get('/api/v1/accounting/journal-entries/pending_validation/')
      return response.data.results || response.data
    } catch (error) {
      console.error('Error fetching pending validation entries:', error)
      throw error
    }
  },

  // Get single entry details
  async getEntry(entryId: number): Promise<JournalEntry> {
    try {
      const response = await apiClient.get(`/api/v1/accounting/journal-entries/${entryId}/`)
      return response.data
    } catch (error) {
      console.error('Error fetching entry:', error)
      throw error
    }
  },

  // Verify blockchain integrity
  async verifyChain(entryId: number): Promise<any> {
    try {
      const response = await apiClient.post(`/api/v1/accounting/journal-entries/${entryId}/verify_chain/`)
      return response.data
    } catch (error) {
      console.error('Error verifying chain:', error)
      throw error
    }
  },

  // Delete journal entry
  async deleteJournalEntry(entryId: number): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/accounting/journal-entries/${entryId}/`)
    } catch (error) {
      console.error('Error deleting entry:', error)
      throw error
    }
  },
}

export default accountingService
