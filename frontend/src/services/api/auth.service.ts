import axios from 'axios'
import { User } from '@/types/accounting'
import { apiClient } from './index'

// Importer la baseURL propre
import { CLEAN_BASE_URL } from './index'

// Create axios instance for auth (keep separate for CSRF handling)
const authClient = axios.create({
  baseURL: CLEAN_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Add CSRF token handling
authClient.interceptors.request.use(async (config) => {
  // Get CSRF token from cookies
  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }
  
  const csrfToken = getCookie('csrftoken')
  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRFToken'] = csrfToken
  }
  
  return config
})

// Types for auth responses
interface LoginResponse {
  token: string
  user: User
  organization?: {
    id: string
    name: string
    legal_identifier: string
  }
}

interface RegisterResponse extends LoginResponse {
  needs_onboarding?: boolean
}

// Helper: persist user data in the shape expected by useAuth hook
function persistUserData(payload: LoginResponse) {
  if (typeof window === 'undefined') return
  const u: any = payload.user || {}
  const org: any = payload.organization || u.organization || {}
  const userData = {
    id: String(u.id ?? ''),
    email: u.email ?? '',
    name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || '',
    role: u.role || 'admin',
    organization: {
      id: String(org.id ?? ''),
      name: org.name ?? '',
      currency: org.currency?.code || org.currency || 'XOF',
    },
  }
  try {
    localStorage.setItem('userData', JSON.stringify(userData))
  } catch (e) {
    console.error('Unable to persist user data', e)
  }
}

// Auth Service
export const authService = {
  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>(
        '/auth/users/login/',
        { email, password }
      )
      
      // Store token & user profile
      localStorage.setItem('authToken', response.data.token)
      persistUserData(response.data)

      return response.data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Register new user (only for first setup)
  async register(userData: {
    email: string
    username: string
    password: string
    first_name: string
    last_name?: string
    phone?: string
    company_name?: string
  }): Promise<RegisterResponse> {
    try {
      const response = await authClient.post<RegisterResponse>(
        '/auth/users/register/',
        userData
      )
      
      // Store token & user profile
      localStorage.setItem('authToken', response.data.token)
      persistUserData(response.data)

      return response.data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await authClient.post('/api/v1/auth/users/logout/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always remove token & user data
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<User & { organization?: any }> {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await authClient.get('/auth/users/me/', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      return response.data
    } catch (error) {
      console.error('Get current user error:', error)
      throw error
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  },

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('authToken')
  },

  // Set token
  setToken(token: string): void {
    localStorage.setItem('authToken', token)
  },

  // Clear token
  clearToken(): void {
    localStorage.removeItem('authToken')
  },

  // Update organization
  async updateOrganization(organizationId: string, data: {
    name?: string
    legal_identifier?: string
  }): Promise<any> {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await authClient.patch(
        `/api/v1/organizations/organizations/${organizationId}/`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Update organization error:', error)
      throw error
    }
  },

  // Complete onboarding
  async completeOnboarding(data: {
    country_code: string
    nif: string
    rccm: string
    official_name: string
    address: string
    phone: string
  }): Promise<any> {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await authClient.post(
        '/api/v1/onboarding/complete/',
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Complete onboarding error:', error)
      throw error
    }
  },

  // Check onboarding status
  async checkOnboardingStatus(): Promise<any> {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await authClient.get(
        '/api/v1/onboarding/status/',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      
      return response.data
    } catch (error) {
      console.error('Check onboarding status error:', error)
      throw error
    }
  },
}

export default authService
