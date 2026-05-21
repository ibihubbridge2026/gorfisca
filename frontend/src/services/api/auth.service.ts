import axios from 'axios'
import { User } from '@/types/accounting'

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create axios instance for auth
const authClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
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

interface RegisterResponse extends LoginResponse {}

// Auth Service
export const authService = {
  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await authClient.post<LoginResponse>(
        '/api/v1/auth/users/login/',
        { email, password }
      )
      
      // Store token
      localStorage.setItem('authToken', response.data.token)
      
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
    password_confirm: string
    first_name: string
    last_name: string
    phone?: string
  }): Promise<RegisterResponse> {
    try {
      const response = await authClient.post<RegisterResponse>(
        '/api/v1/auth/users/register/',
        userData
      )
      
      // Store token
      localStorage.setItem('authToken', response.data.token)
      
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
      // Always remove token
      localStorage.removeItem('authToken')
    }
  },

  // Get current user profile
  async getCurrentUser(): Promise<User & { organization?: any }> {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await authClient.get('/api/v1/auth/users/me/', {
        headers: {
          Authorization: `Token ${token}`
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
}

export default authService
