'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import { Building, User, Mail, Lock } from 'lucide-react'
import authService from '@/services/api/auth.service'

export default function RegisterPage() {
  const t = useTranslations()
  const authT = useTranslations('auth')
  const commonT = useTranslations('common')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    companyName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isInvitation, setIsInvitation] = useState(false)
  const [inviteToken, setInviteToken] = useState('')

  // Détecter le token d'invitation
  useEffect(() => {
    const token = searchParams.get('invite_token')
    if (token) {
      setIsInvitation(true)
      setInviteToken(token)
      // Pré-remplir l'email si disponible dans l'URL
      const email = searchParams.get('email')
      if (email) {
        setFormData(prev => ({ ...prev, email }))
      }
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError(authT('passwordMismatch'))
      setLoading(false)
      return
    }

    try {
      let response
      
      if (isInvitation && inviteToken) {
        // Flux d'invitation : utiliser l'endpoint accept-invite
        const acceptData = {
          token: inviteToken,
          user: {
            email: formData.email,
            password: formData.password,
            first_name: formData.firstName,
            last_name: ''
          }
        }
        
        // Appeler l'endpoint d'acceptation d'invitation
        const apiClient = (await import('@/services/api/index')).apiClient
        const apiResponse = await apiClient.post('/organizations/accept-invite/', acceptData)
        response = apiResponse.data
      } else {
        // Flux normal : créer organisation + utilisateur
        response = await authService.register({
          email: formData.email,
          username: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: '',
          phone: '',
          company_name: formData.companyName
        })
      }
      
      // Stocker le token si présent
      if (response.token) {
        localStorage.setItem('authToken', response.token)
      }
      
      // Redirection selon le cas
      if (isInvitation) {
        // Pour les invitations, rediriger directement vers le dashboard
        router.push('/fr/dashboard')
      } else if (response.needs_onboarding) {
        router.push('/fr/onboarding')
      } else {
        router.push('/fr/dashboard')
      }
    } catch (err: any) {
      let errorMessage = authT('registerError')
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        if (errorData.email) {
          const emailError = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
          if (emailError.includes('already exists') || emailError.includes('already taken')) {
            errorMessage = 'Un compte avec cet email existe déjà. Utilisez la page de connexion.'
          } else {
            errorMessage = emailError
          }
        } else if (errorData.username) {
          const usernameError = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username
          if (usernameError.includes('already exists') || usernameError.includes('already taken')) {
            errorMessage = 'Ce nom d\'utilisateur est déjà pris. Essayez avec un autre.'
          } else {
            errorMessage = usernameError
          }
        } else if (errorData.password) {
          const passwordError = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password
          if (passwordError.includes('too short') || passwordError.includes('minimum')) {
            errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.'
          } else if (passwordError.includes('too common') || passwordError.includes('common')) {
            errorMessage = 'Ce mot de passe est trop commun. Choisissez un mot de passe plus sécurisé.'
          } else if (passwordError.includes('numeric') || passwordError.includes('entirely numeric')) {
            errorMessage = 'Le mot de passe ne peut pas être entièrement numérique.'
          } else {
            errorMessage = passwordError
          }
        } else if (errorData.detail) {
          if (errorData.detail.includes('already exists') || errorData.detail.includes('duplicate')) {
            errorMessage = 'Un compte avec ces informations existe déjà.'
          } else {
            errorMessage = errorData.detail
          }
        } else if (errorData.non_field_errors) {
          const nonFieldError = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors
          if (nonFieldError.includes('password') && nonFieldError.includes('match')) {
            errorMessage = 'Les mots de passe ne correspondent pas.'
          } else {
            errorMessage = nonFieldError
          }
        }
      } else if (err.message) {
        errorMessage = `Erreur de connexion: ${err.message}`
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center">
              <Building className="w-8 h-8 text-on-primary" />
            </div>
            <div>
              <h1 className="font-extrabold text-primary text-2xl leading-tight">Gorfisca</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Financial Sanctuary</p>
            </div>
          </div>
        </div>

        {/* Register Form */}
        <Card variant="glass" className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <h2 className="section-header text-on-surface mb-2">{authT('register')}</h2>
              <p className="text-on-surface-variant text-sm">
                Créez votre compte comptable
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field - Simplified */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Prénom
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="Votre prénom"
                    required
                  />
                </div>
              </div>

              {/* Company Name Field - masqué pour les invitations */}
              {!isInvitation && (
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Nom de l'entreprise
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                      placeholder="Nom de votre entreprise"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Message d'invitation */}
              {isInvitation && (
                <div className="bg-primary-container text-on-primary p-3 rounded-full text-sm text-center">
                  🎉 Vous avez été invité à rejoindre une organisation !
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('email')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="email@exemple.com"
                    required
                  />
                </div>
              </div>

              
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('confirmPassword')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-error-container text-on-error p-3 rounded-full text-sm text-center">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? authT('creating') : authT('createAccount')}
              </Button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-on-surface-variant text-sm">
                  {authT('alreadyHaveAccount')}{' '}
                  <Link href="/fr/login" className="text-primary hover:underline font-medium">
                    {authT('login')}
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
