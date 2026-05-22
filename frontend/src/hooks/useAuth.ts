import { useState, useEffect } from 'react'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'accountant' | 'viewer'
  organization: {
    id: string
    name: string
    currency: string
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer les infos utilisateur depuis le localStorage ou une API
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('userData')

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error('Erreur parsing user data:', error)
        localStorage.removeItem('userData')
      }
    }
    setLoading(false)
  }, [])

  const hasPermission = (requiredRole: 'admin' | 'accountant' | 'viewer') => {
    if (!user) return false
    
    const roleHierarchy = {
      admin: 3,
      accountant: 2,
      viewer: 1
    }
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  const canAccessSettings = () => hasPermission('admin')
  const canImportData = () => hasPermission('accountant')
  const canApproveTransactions = () => hasPermission('accountant')
  const canCreateEntries = () => hasPermission('accountant')
  const canViewReports = () => hasPermission('viewer')

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userData')
    setUser(null)
    window.location.href = '/login'
  }

  return {
    user,
    loading,
    hasPermission,
    canAccessSettings,
    canImportData,
    canApproveTransactions,
    canCreateEntries,
    canViewReports,
    logout
  }
}
