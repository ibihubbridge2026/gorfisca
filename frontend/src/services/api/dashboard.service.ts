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

// Types for Dashboard KPIs
export interface CashAccount {
  account_code: string
  account_label: string
  balance: number
}

export interface CashReal {
  total: number
  breakdown: CashAccount[]
  currency: string
}

export interface MonthlyPerformance {
  revenue: number
  expenses: number
  result: number
  period: {
    start: string
    end: string
  }
}

export interface Receivables {
  total: number
  count: number
  week_total: number
}

export interface PendingInvoices {
  count: number
  amount: number
}

export interface UnreconciledTransactions {
  count: number
  amount: number
}

export interface AIAlert {
  success: boolean
  data?: {
    alert_level: 'high' | 'medium' | 'low'
    title: string
    message: string
    recommendation: string
    priority_actions: string[]
  }
  fallback?: string
  error?: string
}

export interface DashboardKPIs {
  cash_real: CashReal
  monthly_performance: MonthlyPerformance
  receivables: Receivables
  pending_invoices: PendingInvoices
  unreconciled_transactions: UnreconciledTransactions
  ai_alert: AIAlert
  performance: {
    query_time_ms: number
    cache_hit: boolean
  }
  last_updated: string
}

export interface FlashReport {
  organization: {
    name: string
    report_date: string
    period: string
  }
  kpis: DashboardKPIs
  balance_sheet: {
    total_assets: number
    total_liabilities_equity: number
    is_balanced: boolean
    as_of_date: string
  }
  income_statement: {
    total_revenue: number
    total_expenses: number
    net_result: number
    period: {
      start: string
      end: string
    }
  }
  generated_at: string
}

// Dashboard Service
export const dashboardService = {
  // Get dashboard KPIs
  async getKPIs(): Promise<DashboardKPIs> {
    try {
      const response = await apiClient.get('/api/v1/reporting/kpis/')
      return response.data
    } catch (error) {
      console.error('Error fetching KPIs:', error)
      throw error
    }
  },

  // Generate flash report for bankers
  async generateFlashReport(): Promise<FlashReport> {
    try {
      const response = await apiClient.get('/api/v1/reporting/flash_report/')
      return response.data
    } catch (error) {
      console.error('Error generating flash report:', error)
      throw error
    }
  },

  // Export flash report as PDF
  async exportFlashReportPDF(): Promise<Blob> {
    try {
      const response = await apiClient.get('/api/v1/reporting/flash_report_pdf/', {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting flash report PDF:', error)
      throw error
    }
  }
}

export default dashboardService
