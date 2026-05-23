import axios from 'axios'

// API Configuration - Logique défensive pour éviter les doublons /api/v1/api/v1/
const envBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Si la variable d'environnement contient déjà '/api/v1', on l'utilise brute.
// Sinon, on ajoute '/api/v1'. Cela empêche mathématiquement le doublement.
const CLEAN_BASE_URL = envBaseUrl.endsWith('/api/v1') 
  ? envBaseUrl 
  : `${envBaseUrl}/api/v1`;

// Exporter la baseURL propre pour les autres services
export { CLEAN_BASE_URL }

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: CLEAN_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      // Token expired or invalid, redirect to login
      localStorage.removeItem('authToken')
      window.location.href = '/fr/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
