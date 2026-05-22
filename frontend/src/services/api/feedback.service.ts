import axios from 'axios'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance for feedback
const feedbackClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Add auth token to requests
feedbackClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Types for feedback API
export interface FeedbackData {
  feedback_type: 'account_suggestion' | 'magic_match' | 'document_analysis' | 'journal_entry'
  rating: number
  suggested_account_code?: string
  suggested_account_label?: string
  actual_account_code?: string
  actual_account_label?: string
  transaction_amount?: number
  transaction_description?: string
  transaction_date?: string
  comment?: string
  improvement_suggestion?: string
  ai_confidence?: number
  ai_enabled?: boolean
}

export interface FeedbackAnalytics {
  total_feedbacks: number
  average_rating: number
  accuracy_rate: number
  feedback_types: Array<{
    feedback_type: string
    count: number
    avg_rating: number
  }>
  account_performance: Array<{
    suggested_account_code: string
    suggested_account_label: string
    count: number
    avg_rating: number
    correct_count: number
  }>
  correct_suggestions: number
  incorrect_suggestions: number
}

export interface FeedbackAggregation {
  id: number
  feedback_type: string
  account_code: string
  total_feedbacks: number
  average_rating: number
  correct_suggestions: number
  incorrect_suggestions: number
  accuracy_rate: number
  period_start: string
  period_end: string
  updated_at: string
}

// Feedback Service
export const feedbackService = {
  // Create new feedback
  async createFeedback(feedbackData: FeedbackData): Promise<any> {
    try {
      const response = await feedbackClient.post('/api/v1/feedback/feedbacks/', feedbackData)
      return response.data
    } catch (error) {
      console.error('Create feedback error:', error)
      throw error
    }
  },

  // Get feedback analytics
  async getAnalytics(): Promise<FeedbackAnalytics> {
    try {
      const response = await feedbackClient.get('/api/v1/feedback/feedbacks/analytics/')
      return response.data
    } catch (error) {
      console.error('Get analytics error:', error)
      throw error
    }
  },

  // Get improvement suggestions
  async getImprovementSuggestions(): Promise<any> {
    try {
      const response = await feedbackClient.get('/api/v1/feedback/feedbacks/improvement_suggestions/')
      return response.data
    } catch (error) {
      console.error('Get improvement suggestions error:', error)
      throw error
    }
  },

  // Get feedback list
  async getFeedbacks(params?: {
    feedback_type?: string
    rating?: number
    suggested_account_code?: string
  }): Promise<any[]> {
    try {
      const response = await feedbackClient.get('/api/v1/feedback/feedbacks/', { params })
      return response.data.results || response.data
    } catch (error) {
      console.error('Get feedbacks error:', error)
      throw error
    }
  },

  // Get feedback aggregations
  async getAggregations(params?: {
    feedback_type?: string
    account_code?: string
  }): Promise<FeedbackAggregation[]> {
    try {
      const response = await feedbackClient.get('/api/v1/feedback/aggregations/', { params })
      return response.data.results || response.data
    } catch (error) {
      console.error('Get aggregations error:', error)
      throw error
    }
  },

  // Update feedback
  async updateFeedback(id: number, feedbackData: Partial<FeedbackData>): Promise<any> {
    try {
      const response = await feedbackClient.patch(`/api/v1/feedback/feedbacks/${id}/`, feedbackData)
      return response.data
    } catch (error) {
      console.error('Update feedback error:', error)
      throw error
    }
  },

  // Delete feedback
  async deleteFeedback(id: number): Promise<void> {
    try {
      await feedbackClient.delete(`/api/v1/feedback/feedbacks/${id}/`)
    } catch (error) {
      console.error('Delete feedback error:', error)
      throw error
    }
  },
}

export default feedbackService
