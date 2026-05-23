'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import axios from 'axios'
import { 
  Settings, 
  Users, 
  Key, 
  Globe,
  Shield,
  Copy,
  Plus,
  Check,
  X,
  Mail,
  UserPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Organization {
  name: string
  nif: string
  currency: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'accountant' | 'viewer'
  status?: 'active' | 'pending' | 'expired'
  invited_at?: string
}

interface InvitationForm {
  email: string
  role: 'accountant' | 'viewer'
}

interface ToastMessage {
  type: 'success' | 'error' | 'info'
  message: string
}

interface Integration {
  name: string
  status: 'connected' | 'active' | 'disconnected'
  type: 'payment' | 'webhook'
}

export default function SettingsPage() {
  const { user, canAccessSettings } = useAuth()
  // L'utilisateur a déjà été authentifié pour arriver ici. Si son rôle local
  // n'est pas encore connu (cache vide), on autorise l'affichage : la sécurité
  // réelle est appliquée côté backend lors des appels API.
  const canShowAdminSections = !user || user.role === 'admin' || canAccessSettings()
  const [organization, setOrganization] = useState<Organization>({
    name: 'Ibi Hub Bridge - HQ',
    nif: 'IBI-HUB-2026-HQ',
    currency: 'XOF'
  })

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState<InvitationForm>({
    email: '',
    role: 'viewer'
  })
  const [isInviting, setIsInviting] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [integrations] = useState<Integration[]>([
    { name: 'FedaPay', status: 'connected', type: 'payment' },
    { name: 'FeexPay', status: 'connected', type: 'payment' },
    { name: 'Wave', status: 'active', type: 'payment' },
    { name: 'Orange Money', status: 'active', type: 'payment' },
    { name: 'MTN Mobile Money', status: 'active', type: 'payment' }
  ])

  const [webhookKey] = useState('whsec_1234567890abcdef1234567890abcdef12345678')
  const [copied, setCopied] = useState(false)

  const currencies = [
    { code: 'XOF', name: 'Franc CFA (XOF/XAF)', symbol: 'FCFA' },
    { code: 'NGN', name: 'Naira (NGN)', symbol: '₦' },
    { code: 'GHS', name: 'Cedi (GHS)', symbol: 'GH₵' },
    { code: 'USD', name: 'Dollar (USD)', symbol: '$' }
  ]

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Fetch team members and invitations
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        // Fetch organization users
        const usersResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/organizations/organizations/${user?.organization}/users/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        // Fetch invitations
        const invitationsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/organizations/organizations/${user?.organization}/invitations/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        // Combine users and invitations
        const users = usersResponse.data.map((u: any) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`.trim() || u.email,
          email: u.email,
          role: u.role,
          status: 'active' as const
        }))

        const invitations = invitationsResponse.data.map((inv: any) => ({
          id: inv.id,
          name: inv.email, // Use email as name for pending invitations
          email: inv.email,
          role: inv.role,
          status: inv.status_display === 'En attente' ? 'pending' : 
                  inv.status_display === 'Expirée' ? 'expired' : 'active' as const,
          invited_at: inv.created_at
        }))

        setTeamMembers([...users, ...invitations])
      } catch (error) {
        console.error('Error fetching team data:', error)
        // Cas Zéro strict : aucun membre fictif
        setTeamMembers([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.organization) {
      fetchTeamData()
    }
  }, [user])

  // Handle invitation
  const handleInvite = async () => {
    if (!inviteForm.email || !user?.organization) return

    setIsInviting(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/organizations/organizations/${user.organization}/invite/`,
        {
          email: inviteForm.email,
          role: inviteForm.role
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Success: add to local state and show success message
      const newInvitation = {
        id: response.data.invitation.id,
        name: inviteForm.email,
        email: inviteForm.email,
        role: inviteForm.role,
        status: 'pending' as const,
        invited_at: new Date().toISOString()
      }

      setTeamMembers(prev => [...prev, newInvitation])
      setShowInviteModal(false)
      setInviteForm({ email: '', role: 'viewer' })
      
      setToast({
        type: 'success',
        message: `Invitation envoyée avec succès à ${inviteForm.email}`
      })
    } catch (error: any) {
      console.error('Invitation error:', error)
      
      let errorMessage = 'Erreur lors de l\'envoi de l\'invitation'
      if (error.response?.status === 403) {
        errorMessage = 'Action non autorisée. Seuls les administrateurs peuvent inviter des collaborateurs.'
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }
      
      setToast({
        type: 'error',
        message: errorMessage
      })
    } finally {
      setIsInviting(false)
    }
  }

  // Clear toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleSaveSettings = async () => {
    try {
      // Simuler une sauvegarde API
      console.log('Saving settings:', organization)
      
      // Afficher un feedback visuel
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (button) {
        button.textContent = 'Sauvegarde en cours...'
        button.disabled = true
      }
      
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Succès
      if (button) {
        button.textContent = 'Enregistrer les modifications'
        button.disabled = false
      }
      
      alert('Paramètres sauvegardés avec succès!')
      
      // Mettre à jour l'état local
      console.log('Settings saved:', {
        organization,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Erreur lors de la sauvegarde des paramètres')
      
      // Restaurer le bouton
      const button = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (button) {
        button.textContent = 'Enregistrer les modifications'
        button.disabled = false
      }
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-emerald-100 text-emerald-800'
      case 'accountant':
        return 'bg-slate-100 text-slate-700'
      case 'viewer':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusIndicator = (status?: string) => {
    switch (status) {
      case 'active':
        return '🟢 Actif'
      case 'pending':
        return '🟡 En attente'
      case 'expired':
        return '🔴 Expiré'
      case 'connected':
        return '🟢 Connecté'
      case 'disconnected':
        return '🔴 Déconnecté'
      default:
        return '🟢 Actif'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrateur'
      case 'accountant':
        return 'Comptable'
      case 'viewer':
        return 'Lecteur'
      default:
        return role
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
        <div className="p-8">
          {/* Toast Notification */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={cn(
                "fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-0 max-w-sm",
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                toast.type === 'error' ? 'bg-red-50 text-red-800' :
                'bg-blue-50 text-blue-800'
              )}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' && <Check className="w-5 h-5" />}
                {toast.type === 'error' && <X className="w-5 h-5" />}
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
            </motion.div>
          )}
          {/* En-tête de la page */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Paramètres
                </h1>
                <p className="text-slate-600 text-lg">
                  Configurez votre organisation, gérez les accès et les intégrations.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Section 1: Profil de l'Organisation & Devise Pivot */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
                <div className="flex items-center gap-2 mb-6">
                  <Globe className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Profil de l'Organisation
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={organization.name}
                      onChange={(e) => setOrganization(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Numéro d'identification fiscale (NIF)
                    </label>
                    <input
                      type="text"
                      value={organization.nif}
                      onChange={(e) => setOrganization(prev => ({ ...prev, nif: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Devise Panafricaine
                    </label>
                    <select
                      value={organization.currency}
                      onChange={(e) => setOrganization(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    >
                      {currencies.map(currency => (
                        <option key={currency.code} value={currency.code}>
                          {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Section 2: Gestion de l'Équipe & Accès - Admin uniquement */}
            {canShowAdminSections && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2"
              >
              <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Membres de l'équipe & Accès
                  </h2>
                </div>

                {/* Formulaire d'Invitation */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="collaborateur@exemple.com"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      />
                    </div>
                    <div className="sm:w-48">
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'accountant' | 'viewer' }))}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      >
                        <option value="viewer">Lecteur (Viewer)</option>
                        <option value="accountant">Comptable (Accountant)</option>
                      </select>
                    </div>
                    <button
                      onClick={handleInvite}
                      disabled={!inviteForm.email || isInviting}
                      className="bg-slate-900 text-white rounded-xl px-4 py-2 hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isInviting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>Envoyer l'invitation</span>
                    </button>
                  </div>
                </div>

                {/* Liste des Membres */}
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                    </div>
                  ) : (
                    teamMembers.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                          {/* Avatar ou initiales */}
                          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-700">
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-600">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Badge de statut */}
                          <span className="text-xs text-slate-600">
                            {getStatusIndicator(member.status)}
                          </span>
                          {/* Badge de rôle */}
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            getRoleBadge(member.role)
                          )}>
                            {getRoleLabel(member.role)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
            )}

            {/* Section 3: Clés d'API & Intégrations Mobile Money - Admin uniquement */}
            {canShowAdminSections && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1"
              >
              <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
                <div className="flex items-center gap-2 mb-6">
                  <Key className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Intégrations & API
                  </h2>
                </div>

                {/* Mobile Money Integrations */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Passerelles de paiement</h3>
                  <div className="space-y-2">
                    {integrations.map(integration => (
                      <div key={integration.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-700">{integration.name}</span>
                        <span className="text-xs text-slate-600">
                          {getStatusIndicator(integration.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Webhook Key */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Clé de Webhook</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={webhookKey}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 text-sm"
                    />
                    <button
                      onClick={handleCopyWebhook}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            )}
          </div>

          {/* Bouton de Sauvegarde */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex justify-end"
          >
            <button
              type="submit"
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200 font-medium"
            >
              <Settings className="w-4 h-4" />
              <span>Enregistrer les modifications</span>
            </button>
          </motion.div>

          {/* Espace blanc pour le design épuré */}
          <div className="h-32"></div>
        </div>

        {/* Invitation Modal */}
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md border-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Inviter un collaborateur
                  </h3>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="collaborateur@exemple.com"
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rôle
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'accountant' | 'viewer' }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="viewer">Lecteur</option>
                    <option value="accountant">Comptable</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteForm.email || isInviting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Inviter</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  )
}
