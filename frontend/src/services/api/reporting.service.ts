import axios from 'axios'
import { formatCurrency } from '@/lib/utils'

// Importer la baseURL propre
import { CLEAN_BASE_URL } from './index'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: CLEAN_BASE_URL,
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

// Types for reporting
export interface BalanceSheet {
  as_of_date: string
  assets: {
    total: number
    class_1: {
      name: string
      total: number
      accounts: Array<{
        code: string
        label: string
        balance: number
        type: string
        balance_type: 'debit' | 'credit'
      }>
    }
    class_2: {
      name: string
      total: number
      accounts: Array<any>
    }
    class_3: {
      name: string
      total: number
      accounts: Array<any>
    }
    class_4: {
      name: string
      total: number
      accounts: Array<any>
    }
    class_5: {
      name: string
      total: number
      accounts: Array<any>
    }
  }
  liabilities_equity: {
    total: number
    class_1: {
      name: string
      total: number
      accounts: Array<any>
    }
    class_2: {
      name: string
      total: number
      accounts: Array<any>
    }
    class_3: {
      name: string
      total: number
      accounts: Array<any>
    }
  }
  is_balanced: boolean
}

export interface IncomeStatement {
  period: {
    start_date: string
    end_date: string
  }
  revenues: {
    total: number
    class_7: {
      name: string
      total: number
      accounts: Array<{
        code: string
        label: string
        balance: number
        type: string
        period_balance: number
      }>
    }
  }
  expenses: {
    total: number
    class_6: {
      name: string
      total: number
      accounts: Array<any>
    }
  }
  net_income: number
}

export interface CashFlowStatement {
  period: {
    start_date: string
    end_date: string
  }
  opening_balance: number
  closing_balance: number
  net_change: number
  operating_activities: {
    total: number
    movements: Array<{
      date: string
      description: string
      account_code: string
      account_label: string
      amount: number
      type: 'inflow' | 'outflow'
    }>
  }
  investing_activities: {
    total: number
    movements: Array<any>
  }
  financing_activities: {
    total: number
    movements: Array<any>
  }
}

export interface TrialBalance {
  as_of_date: string
  accounts: Array<{
    code: string
    label: string
    account_type: string
    account_class: number
    debit: number
    credit: number
  }>
  total_debit: number
  total_credit: number
  is_balanced: boolean
}

export interface AgedReceivables {
  as_of_date: string
  total_outstanding: number
  buckets: {
    current: {
      total: number
      invoices: Array<{
        invoice_number: string
        client_name: string
        due_date: string
        amount: number
        days_overdue: number
      }>
    }
    '0_30': {
      total: number
      invoices: Array<any>
    }
    '31_60': {
      total: number
      invoices: Array<any>
    }
    '61_90': {
      total: number
      invoices: Array<any>
    }
    over_90: {
      total: number
      invoices: Array<any>
    }
  }
}

// Reporting Service
export const reportingService = {
  // Get Balance Sheet
  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheet> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/balance_sheet/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching balance sheet:', error)
      throw error
    }
  },

  // Get Income Statement
  async getIncomeStatement(startDate?: string, endDate?: string): Promise<IncomeStatement> {
    try {
      const params: any = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      
      const response = await apiClient.get('/api/v1/reporting/income_statement/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching income statement:', error)
      throw error
    }
  },

  // Get Cash Flow Statement
  async getCashFlowStatement(startDate?: string, endDate?: string): Promise<CashFlowStatement> {
    try {
      const params: any = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      
      const response = await apiClient.get('/api/v1/reporting/cash_flow_statement/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching cash flow statement:', error)
      throw error
    }
  },

  // Get Trial Balance
  async getTrialBalance(asOfDate?: string): Promise<TrialBalance> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/trial_balance/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching trial balance:', error)
      throw error
    }
  },

  // Get Aged Receivables
  async getAgedReceivables(asOfDate?: string): Promise<AgedReceivables> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/aged_receivables/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching aged receivables:', error)
      throw error
    }
  },

  // Export Balance Sheet as PDF
  async exportBalanceSheetPDF(asOfDate?: string): Promise<Blob> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/balance_sheet/export_pdf/', {
        params,
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting balance sheet PDF:', error)
      throw error
    }
  },

  // Export Income Statement as PDF
  async exportIncomeStatementPDF(startDate?: string, endDate?: string): Promise<Blob> {
    try {
      const params: any = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      
      const response = await apiClient.get('/api/v1/reporting/income_statement/export_pdf/', {
        params,
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting income statement PDF:', error)
      throw error
    }
  },

  // Export Trial Balance as PDF
  async exportTrialBalancePDF(asOfDate?: string): Promise<Blob> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/trial_balance/export_pdf/', {
        params,
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting trial balance PDF:', error)
      throw error
    }
  },

  // Get financial summary (combination of key reports)
  async getFinancialSummary(asOfDate?: string): Promise<{
    balance_sheet: BalanceSheet
    income_statement: IncomeStatement
    cash_flow: CashFlowStatement
    key_metrics: {
      total_revenue: number
      total_expenses: number
      net_income: number
      total_assets: number
      total_liabilities: number
      equity: number
      cash_balance: number
      working_capital: number
    }
  }> {
    try {
      const params = asOfDate ? { as_of_date: asOfDate } : {}
      const response = await apiClient.get('/api/v1/reporting/financial_summary/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching financial summary:', error)
      throw error
    }
  }
}

// Get treasury data (Classe 5: comptes 52 et 57)
export const getTreasuryData = async (): Promise<{
  total_treasury: number
  accounts: Array<{
    code: string
    label: string
    balance: number
  }>
}> => {
  try {
    const response = await apiClient.get('/api/v1/reporting/treasury/')
    return response.data
  } catch (error) {
    console.error('Error fetching treasury data:', error)
    throw error
  }
}

// Get revenue data (Classe 7: comptes 701100, 706100)
export const getRevenueData = async (): Promise<{
  total_revenue: number
  accounts: Array<{
    code: string
    label: string
    balance: number
  }>
}> => {
  try {
    const response = await apiClient.get('/api/v1/reporting/revenue/')
    return response.data
  } catch (error) {
    console.error('Error fetching revenue data:', error)
    throw error
  }
}

// Get organization data for currency
export const getOrganizationData = async (): Promise<{
  id: string
  name: string
  currency: {
    code: string
    symbol: string
    name?: string
  } | null
}> => {
  try {
    const response = await apiClient.get('/organizations/current/')
    return response.data
  } catch (error) {
    console.error('Error fetching organization data:', error)
    throw error
  }
}

export default reportingService
