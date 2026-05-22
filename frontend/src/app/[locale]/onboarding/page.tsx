'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import { Building, Sparkles, ArrowRight } from 'lucide-react'
import authService from '@/services/api/auth.service'

export default function OnboardingPage() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    // Check if user is authenticated and get their data
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser()
        setUserData(user)
        
        // Pre-fill organization name if user has first name
        if (user?.first_name) {
          setOrganizationName(`Entreprise de ${user.first_name}`)
        }
      } catch (err) {
        // If not authenticated, redirect to login
        router.push('/fr/login')
      }
    }
    
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!organizationName.trim()) {
      setError('Le nom de votre entreprise est requis.')
      setLoading(false)
      return
    }

    try {
      // Update organization name
      if (userData?.organization?.id) {
        await authService.updateOrganization(userData.organization.id, {
          name: organizationName.trim()
        })
      }

      // Redirect to dashboard
      router.push('/fr/dashboard')
    } catch (err: any) {
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.'
      
      if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Skip onboarding and go to dashboard
    router.push('/fr/dashboard')
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
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

        {/* Onboarding Form */}
        <Card variant="glass" className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="section-header text-on-surface mb-2">
                Bienvenue, {userData.first_name} ! 🎉
              </h2>
              <p className="text-on-surface-variant text-sm">
                Personnalisez votre entreprise en quelques secondes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Quel est le nom de votre entreprise ?
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    placeholder="Ma Super Entreprise"
                    required
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-2">
                  Vous pourrez modifier ce nom plus tard dans les paramètres
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-error-container text-on-error p-3 rounded-full text-sm text-center">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    'Création en cours...'
                  ) : (
                    <>
                      C'est parti !
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleSkip}
                  className="w-full"
                >
                  Plus tard
                </Button>
              </div>

              {/* Info */}
              <div className="text-center">
                <p className="text-xs text-on-surface-variant">
                  ⏱️ Cette étape prend 10 secondes et vous fera gagner des heures !
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
