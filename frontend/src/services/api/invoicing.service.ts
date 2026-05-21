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
    config.headers.Authorization = `Token ${token}`
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

// Types for invoicing
export interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_phone: string
  client_address: string
  issue_date: string
  due_date: string
  payment_terms: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'net_90'
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  journal_entry?: string
  notes?: string
  created_at: string
  updated_at: string
  sent_at?: string
  paid_at?: string
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice: string
  description: string
  quantity: number
  unit_price: number
  revenue_account: string
  revenue_account_code?: string
  revenue_account_label?: string
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
}

export interface InvoiceCreateData {
  client_name: string
  client_email?: string
  client_phone?: string
  client_address?: string
  issue_date: string
  due_date: string
  payment_terms: 'immediate' | 'net_15' | 'net_30' | 'net_60' | 'net_90'
  notes?: string
  items: Omit<InvoiceItem, 'id' | 'invoice' | 'subtotal' | 'tax_amount' | 'total'>[]
}

export interface InvoiceStats {
  total_invoices: number
  draft_invoices: number
  sent_invoices: number
  paid_invoices: number
  overdue_invoices: number
  cancelled_invoices: number
  total_amount: number
  paid_amount: number
  outstanding_amount: number
}

// Invoicing Service
export const invoicingService = {
  // Fetch invoices
  async fetchInvoices(params?: {
    status?: string
    search?: string
    ordering?: string
  }): Promise<Invoice[]> {
    try {
      const response = await apiClient.get('/api/v1/invoicing/invoices/', { params })
      return response.data.results
    } catch (error) {
      console.error('Error fetching invoices:', error)
      throw error
    }
  },

  // Fetch single invoice
  async fetchInvoice(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.get(`/api/v1/invoicing/invoices/${id}/`)
      return response.data
    } catch (error) {
      console.error('Error fetching invoice:', error)
      throw error
    }
  },

  // Create invoice
  async createInvoice(invoiceData: InvoiceCreateData): Promise<Invoice> {
    try {
      const response = await apiClient.post('/api/v1/invoicing/invoices/', invoiceData)
      return response.data
    } catch (error) {
      console.error('Error creating invoice:', error)
      throw error
    }
  },

  // Update invoice
  async updateInvoice(id: string, invoiceData: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await apiClient.put(`/api/v1/invoicing/invoices/${id}/`, invoiceData)
      return response.data
    } catch (error) {
      console.error('Error updating invoice:', error)
      throw error
    }
  },

  // Delete invoice
  async deleteInvoice(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/invoicing/invoices/${id}/`)
    } catch (error) {
      console.error('Error deleting invoice:', error)
      throw error
    }
  },

  // Post invoice to ledger
  async postToLedger(id: string): Promise<any> {
    try {
      const response = await apiClient.post(`/api/v1/invoicing/invoices/${id}/post_to_ledger/`)
      return response.data
    } catch (error) {
      console.error('Error posting invoice to ledger:', error)
      throw error
    }
  },

  // Cancel invoice
  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    try {
      const response = await apiClient.post(`/api/v1/invoicing/invoices/${id}/cancel/`, {
        reason
      })
      return response.data
    } catch (error) {
      console.error('Error cancelling invoice:', error)
      throw error
    }
  },

  // Mark as sent
  async markAsSent(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.post(`/api/v1/invoicing/invoices/${id}/mark_as_sent/`)
      return response.data
    } catch (error) {
      console.error('Error marking invoice as sent:', error)
      throw error
    }
  },

  // Mark as paid
  async markAsPaid(id: string): Promise<Invoice> {
    try {
      const response = await apiClient.post(`/api/v1/invoicing/invoices/${id}/mark_as_paid/`)
      return response.data
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      throw error
    }
  },

  // Get invoice statistics
  async getInvoiceStats(params?: {
    start_date?: string
    end_date?: string
  }): Promise<InvoiceStats> {
    try {
      const response = await apiClient.get('/api/v1/invoicing/invoices/stats/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching invoice stats:', error)
      throw error
    }
  },

  // Export invoice as PDF
  async exportPDF(id: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/api/v1/invoicing/invoices/${id}/export_pdf/`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting PDF:', error)
      throw error
    }
  },

  // Get revenue accounts for dropdown
  async fetchRevenueAccounts(): Promise<Array<{id: string, code: string, label: string}>> {
    try {
      const response = await apiClient.get('/api/v1/accounting/accounts/', {
        params: { account_type: 'revenue', is_active: true }
      })
      return response.data.results.map((account: any) => ({
        id: account.id,
        code: account.code,
        label: account.label
      }))
    } catch (error) {
      console.error('Error fetching revenue accounts:', error)
      throw error
    }
  },

  // Get tax configuration
  async getTaxConfiguration(): Promise<{
    default_tax_rate: number
    tax_enabled: boolean
    tax_name: string
    reduced_tax_rate: number
    exempt_tax_rate: number
  }> {
    try {
      const response = await apiClient.get('/api/v1/invoicing/tax_configuration/')
      return response.data
    } catch (error) {
      console.error('Error fetching tax configuration:', error)
      throw error
    }
  },

  // Update tax configuration
  async updateTaxConfiguration(config: {
    default_tax_rate: number
    tax_enabled: boolean
    tax_name: string
    reduced_tax_rate: number
    exempt_tax_rate: number
  }): Promise<any> {
    try {
      const response = await apiClient.put('/api/v1/invoicing/tax_configuration/', config)
      return response.data
    } catch (error) {
      console.error('Error updating tax configuration:', error)
      throw error
    }
  }
}

export default invoicingService
