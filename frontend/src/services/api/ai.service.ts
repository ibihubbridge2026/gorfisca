import axios from 'axios'

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
      window.location.href = '/fr/login'
    }
    return Promise.reject(error)
  }
)

// Types for AI services
export interface DocumentAnalysisData {
  date?: string
  amount_ttc?: number
  amount_ht?: number
  vat_rate?: number
  vat_amount?: number
  supplier?: string
  description?: string
  document_type?: 'expense' | 'revenue'
  suggested_accounts?: Array<{
    account_code: string
    account_label: string
    account_type: string
    account_class?: number
    confidence: number
    reasoning: string
  }>
  extracted_text_snippets?: string[]
  confidence?: number
}

export interface DocumentAnalysisResponse {
  success: boolean
  data?: DocumentAnalysisData
  error?: string
  message?: string
  raw_response?: string
  confidence?: number
  file_info?: {
    filename: string
    size: number
    content_type: string
  }
}

export interface SuggestedJournalEntry {
  date: string
  description: string
  reference?: string
  lines: Array<{
    account_code: string
    account_label: string
    line_type: 'debit' | 'credit'
    amount: number
    confidence: number
    reasoning: string
  }>
  is_balanced: boolean
  total_debit: number
  total_credit: number
  confidence?: number
}

export interface SuggestedJournalEntryResponse {
  success: boolean
  suggested_entry?: SuggestedJournalEntry
  analysis_data?: DocumentAnalysisData
  error?: string
  message?: string
}

// AI Service
export const aiService = {
  // Analyze text document
  async analyzeText(text: string, fileName?: string, documentType?: string): Promise<DocumentAnalysisResponse> {
    try {
      const response = await apiClient.post('/api/v1/ai/assistant/analyze_text/', {
        text,
        file_name: fileName,
        document_type: documentType || 'other'
      })
      return response.data
    } catch (error) {
      console.error('Error analyzing text:', error)
      throw error
    }
  },

  // Analyze uploaded file (OCR)
  async analyzeFile(file: File): Promise<DocumentAnalysisResponse> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await apiClient.post('/api/v1/ai/assistant/analyze_file/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      })
      return response.data
    } catch (error) {
      console.error('Error analyzing file:', error)
      throw error
    }
  },

  // Suggest journal entry based on analysis
  async suggestJournalEntry(analysisData: DocumentAnalysisData): Promise<SuggestedJournalEntryResponse> {
    try {
      const response = await apiClient.post('/api/v1/ai/assistant/suggest_journal_entry/', {
        analysis_data: analysisData
      })
      return response.data
    } catch (error) {
      console.error('Error suggesting journal entry:', error)
      throw error
    }
  },

  // Validate suggested entry
  async validateSuggestedEntry(suggestedEntry: SuggestedJournalEntry): Promise<any> {
    try {
      const response = await apiClient.post('/api/v1/ai/assistant/validate_suggested_entry/', {
        suggested_entry: suggestedEntry
      })
      return response.data
    } catch (error) {
      console.error('Error validating entry:', error)
      throw error
    }
  },

  // Get supported formats
  async getSupportedFormats(): Promise<any> {
    try {
      const response = await apiClient.get('/api/v1/ai/assistant/supported_formats/')
      return response.data
    } catch (error) {
      console.error('Error getting supported formats:', error)
      throw error
    }
  }
}

export default aiService
