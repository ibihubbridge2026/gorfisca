'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import { Building } from 'lucide-react'
import authService from '@/services/api/auth.service'

export default function LoginPage() {
  const t = useTranslations()
  const authT = useTranslations('auth')
  const commonT = useTranslations('common')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await authService.login(email, password)
      router.push('/fr/dashboard')
    } catch (err: any) {
      let errorMessage = authT('loginError')
      
      if (err.response?.data) {
        const errorData = err.response.data
        
        if (errorData.detail) {
          if (errorData.detail.includes('Invalid credentials') || errorData.detail.includes('invalid')) {
            errorMessage = 'Email ou mot de passe incorrect'
          } else if (errorData.detail.includes('inactive') || errorData.detail.includes('disabled')) {
            errorMessage = 'Ce compte est désactivé. Veuillez contacter un administrateur'
          } else {
            errorMessage = errorData.detail
          }
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors
        } else if (errorData.email) {
          errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email
        } else if (errorData.password) {
          errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password
        }
      } else if (err.message) {
        if (err.message.includes('404')) {
          errorMessage = 'Service de connexion indisponible. Veuillez réessayer plus tard.'
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.'
        } else {
          errorMessage = `Erreur de connexion: ${err.message}`
        }
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

        {/* Login Form */}
        <Card variant="glass" className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <h2 className="section-header text-on-surface mb-2">{authT('login')}</h2>
              <p className="text-on-surface-variant text-sm">
                Accédez à votre plateforme comptable
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {authT('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-error-container text-error p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="default"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Connexion...' : authT('login')}
              </Button>
            </form>

            {/* Register Link (only shown if no users exist) */}
            <div className="mt-6 text-center">
              <p className="text-on-surface-variant text-sm">
                Première utilisation ?{' '}
                <Link 
                  href="/fr/register" 
                  className="text-primary hover:underline font-medium"
                >
                  {authT('register')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-on-surface-variant text-xs">
            Plateforme SaaS de comptabilité OHADA pour PME africaines
          </p>
        </div>
      </div>
    </div>
  )
}
