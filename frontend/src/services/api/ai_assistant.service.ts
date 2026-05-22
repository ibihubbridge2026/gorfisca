import axios from 'axios'
import { useQuery, useMutation } from '@tanstack/react-query'

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

// Types pour les insights IA
export interface AIInsight {
  id: string
  type: 'predictive' | 'anomaly' | 'fiscal' | 'recommendation'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  created_at: string
  metadata?: {
    amount?: number
    date?: string
    account_code?: string
    related_transactions?: string[]
  }
}

export interface FinancialPrediction {
  cash_flow_risk: {
    risk_level: 'low' | 'medium' | 'high'
    probability: number
    timeframe: string
    amount_at_risk: number
    factors: string[]
  }
  revenue_forecast: {
    next_month: number
    next_quarter: number
    confidence: number
  }
  expense_prediction: {
    next_month: number
    next_quarter: number
    main_categories: Array<{
      category: string
      amount: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }>
  }
}

export interface AnomalyDetection {
  anomalies: Array<{
    id: string
    type: 'unusual_amount' | 'missing_reconciliation' | 'duplicate_entry' | 'account_mismatch'
    description: string
    amount?: number
    date?: string
    account_code?: string
    confidence: number
    severity: 'low' | 'medium' | 'high'
    recommended_action: string
  }>
  summary: {
    total_anomalies: number
    high_priority_anomalies: number
    potential_savings: number
  }
}

export interface FiscalEstimation {
  next_vat_declaration: {
    amount: number
    due_date: string
    confidence: number
    based_on_period: string
  }
  corporate_tax_estimate: {
    estimated_amount: number
    due_date: string
    confidence: number
    fiscal_year: string
  }
  payroll_tax_projection: {
    next_month: number
    next_quarter: number
    confidence: number
  }
}

export interface AIRecommendation {
  id: string
  category: 'cash_management' | 'cost_optimization' | 'revenue_growth' | 'compliance'
  title: string
  description: string
  expected_impact: 'low' | 'medium' | 'high'
  implementation_difficulty: 'easy' | 'medium' | 'complex'
  potential_savings?: number
  potential_revenue_increase?: number
  action_steps: string[]
}

// Service IA Assistant
export const aiAssistantService = {
  // Obtenir les insights IA récents
  async getInsights(limit: number = 10): Promise<AIInsight[]> {
    try {
      const response = await apiClient.get('/ai/insights/', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching AI insights:', error)
      throw error
    }
  },

  // Obtenir les prédictions financières
  async getFinancialPrediction(): Promise<FinancialPrediction> {
    try {
      const response = await apiClient.get('/ai/financial-prediction/')
      return response.data
    } catch (error) {
      console.error('Error fetching financial prediction:', error)
      throw error
    }
  },

  // Détecter les anomalies
  async detectAnomalies(period: string = '30d'): Promise<AnomalyDetection> {
    try {
      const response = await apiClient.get('/ai/anomaly-detection/', {
        params: { period }
      })
      return response.data
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      throw error
    }
  },

  // Estimer les obligations fiscales
  async getFiscalEstimation(): Promise<FiscalEstimation> {
    try {
      const response = await apiClient.get('/ai/fiscal-estimation/')
      return response.data
    } catch (error) {
      console.error('Error fetching fiscal estimation:', error)
      throw error
    }
  },

  // Obtenir des recommandations
  async getRecommendations(category?: string): Promise<AIRecommendation[]> {
    try {
      const params: any = {}
      if (category) params.category = category
      
      const response = await apiClient.get('/ai/recommendations/', { params })
      return response.data
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      throw error
    }
  },

  // Analyser une transaction spécifique
  async analyzeTransaction(transactionId: number): Promise<{
    risk_score: number
    recommendations: string[]
    similar_transactions: Array<{
      id: number
      description: string
      amount: number
      date: string
    }>
  }> {
    try {
      const response = await apiClient.post('/ai/analyze-transaction/', {
        transaction_id: transactionId
      })
      return response.data
    } catch (error) {
      console.error('Error analyzing transaction:', error)
      throw error
    }
  },

  // Obtenir le résumé IA du dashboard
  async getDashboardSummary(): Promise<{
    insights: AIInsight[]
    predictions: FinancialPrediction
    anomalies: AnomalyDetection
    fiscal: FiscalEstimation
    recommendations: AIRecommendation[]
  }> {
    try {
      const response = await apiClient.get('/ai/dashboard-summary/')
      return response.data
    } catch (error) {
      console.error('Error fetching dashboard summary:', error)
      throw error
    }
  },

  // Marquer un insight comme lu
  async markInsightAsRead(insightId: string): Promise<void> {
    try {
      await apiClient.post(`/ai/insights/${insightId}/mark-read/`)
    } catch (error) {
      console.error('Error marking insight as read:', error)
      throw error
    }
  },

  // Ignorer une recommandation
  async dismissRecommendation(recommendationId: string): Promise<void> {
    try {
      await apiClient.post(`/ai/recommendations/${recommendationId}/dismiss/`)
    } catch (error) {
      console.error('Error dismissing recommendation:', error)
      throw error
    }
  }
}

// Hooks React Query pour les services IA
export const useAIInsights = (limit: number = 10) => {
  return useQuery({
    queryKey: ['ai-insights', limit],
    queryFn: () => aiAssistantService.getInsights(limit),
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  })
}

export const useFinancialPrediction = () => {
  return useQuery({
    queryKey: ['ai-financial-prediction'],
    queryFn: () => aiAssistantService.getFinancialPrediction(),
    refetchInterval: 10 * 60 * 1000, // Rafraîchir toutes les 10 minutes
  })
}

export const useAnomalyDetection = (period: string = '30d') => {
  return useQuery({
    queryKey: ['ai-anomaly-detection', period],
    queryFn: () => aiAssistantService.detectAnomalies(period),
    refetchInterval: 15 * 60 * 1000, // Rafraîchir toutes les 15 minutes
  })
}

export const useFiscalEstimation = () => {
  return useQuery({
    queryKey: ['ai-fiscal-estimation'],
    queryFn: () => aiAssistantService.getFiscalEstimation(),
    refetchInterval: 60 * 60 * 1000, // Rafraîchir toutes les heures
  })
}

export const useAIRecommendations = (category?: string) => {
  return useQuery({
    queryKey: ['ai-recommendations', category],
    queryFn: () => aiAssistantService.getRecommendations(category),
    refetchInterval: 30 * 60 * 1000, // Rafraîchir toutes les 30 minutes
  })
}

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['ai-dashboard-summary'],
    queryFn: () => aiAssistantService.getDashboardSummary(),
    refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
  })
}

export const useAnalyzeTransaction = () => {
  return useMutation({
    mutationFn: (transactionId: number) => aiAssistantService.analyzeTransaction(transactionId),
  })
}

export const useMarkInsightAsRead = () => {
  return useMutation({
    mutationFn: (insightId: string) => aiAssistantService.markInsightAsRead(insightId),
  })
}

export const useDismissRecommendation = () => {
  return useMutation({
    mutationFn: (recommendationId: string) => aiAssistantService.dismissRecommendation(recommendationId),
  })
}
