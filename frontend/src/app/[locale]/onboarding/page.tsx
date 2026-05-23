'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import { Building, Sparkles, ArrowRight, FileText, MapPin, Phone } from 'lucide-react'
import authService from '@/services/api/auth.service'

interface OnboardingData {
  country_code: string
  nif: string
  rccm: string
  official_name: string
  address: string
  phone: string
}

export default function OnboardingPage() {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userData, setUserData] = useState<any>(null)
  
  const [formData, setFormData] = useState<OnboardingData>({
    country_code: 'CD',
    nif: '',
    rccm: '',
    official_name: '',
    address: '',
    phone: ''
  })

  useEffect(() => {
    // Check if user is authenticated and get their data
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser()
        setUserData(user)
        
        // Pre-fill organization name if user has first name
        if (user?.first_name && !formData.official_name) {
          setFormData(prev => ({
            ...prev,
            official_name: `Entreprise de ${user.first_name}`
          }))
        }
      } catch (err) {
        // If not authenticated, redirect to login
        router.push('/fr/login')
      }
    }
    
    checkAuth()
  }, [router])

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation selon l'étape
    if (step === 1) {
      if (!formData.official_name.trim()) {
        setError('Le nom officiel de l\'entreprise est requis.')
        setLoading(false)
        return
      }
      setStep(2)
      setLoading(false)
      return
    }

    if (step === 2) {
      if (!formData.address.trim()) {
        setError('L\'adresse est requise.')
        setLoading(false)
        return
      }
      setStep(3)
      setLoading(false)
      return
    }

    // Étape 3 : Soumission finale
    try {
      const payload = {
        ...formData,
        nif: formData.nif.trim(),
        rccm: formData.rccm.trim()
      }

      const response = await authService.completeOnboarding(payload)
      
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

  const totalSteps = 3

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

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-on-surface-variant">Étape {step} sur {totalSteps}</span>
            <span className="text-xs text-on-surface-variant">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Onboarding Form */}
        <Card variant="glass" className="p-8">
          <CardContent className="p-0">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {step === 1 && <Building className="w-8 h-8 text-primary" />}
                {step === 2 && <MapPin className="w-8 h-8 text-primary" />}
                {step === 3 && <FileText className="w-8 h-8 text-primary" />}
              </div>
              <h2 className="section-header text-on-surface mb-2">
                {step === 1 && `Bienvenue, ${userData.first_name} ! 🎉`}
                {step === 2 && 'Où se trouve votre entreprise ?'}
                {step === 3 && 'Informations fiscales'}
              </h2>
              <p className="text-on-surface-variant text-sm">
                {step === 1 && 'Commençons par les informations de base'}
                {step === 2 && 'Votre adresse professionnelle'}
                {step === 3 && 'Optionnel - Vous pourrez les ajouter plus tard'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Nom de l'entreprise */}
              {step === 1 && (
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Quel est le nom officiel de votre entreprise ?
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input
                      type="text"
                      value={formData.official_name}
                      onChange={(e) => handleInputChange('official_name', e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                      placeholder="Ma Super Entreprise SARL"
                      required
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Ex: Technologies Avancées SARL, Cabinet Conseil SPRL...
                  </p>
                </div>
              )}

              {/* Step 2: Adresse et Téléphone */}
              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Adresse complète
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 transform w-4 h-4 text-on-surface-variant" />
                      <textarea
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all resize-none"
                        placeholder="Avenue de la Paix 123, Commune de Kinshasa..."
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Téléphone professionnel
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full bg-surface-container-low border-none rounded-full pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                        placeholder="+243 99 123 4567"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Step 3: Informations fiscales */}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Pays
                    </label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => handleInputChange('country_code', e.target.value)}
                      className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all"
                    >
                      <option value="CD">République Démocratique du Congo</option>
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="SN">Sénégal</option>
                      <option value="CM">Cameroun</option>
                      <option value="ML">Mali</option>
                      <option value="BF">Burkina Faso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      NIF (Numéro d'Identification Fiscale)
                    </label>
                    <input
                      type="text"
                      value={formData.nif}
                      onChange={(e) => handleInputChange('nif', e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all uppercase"
                      placeholder="Ex: 123456789A (RDC)"
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                      Format RDC: 9 chiffres + 1 lettre
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      RCCM (Registre du Commerce)
                    </label>
                    <input
                      type="text"
                      value={formData.rccm}
                      onChange={(e) => handleInputChange('rccm', e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all uppercase"
                      placeholder="Ex: CD/KIN/123456 B12345"
                    />
                    <p className="text-xs text-on-surface-variant mt-2">
                      Optionnel mais recommandé
                    </p>
                  </div>
                </>
              )}

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
                    'Traitement en cours...'
                  ) : step === 3 ? (
                    <>
                      Terminer l'onboarding
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Suivant
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={handleSkip}
                    className="w-full"
                  >
                    Remplir plus tard
                  </Button>
                ) : null}
              </div>

              {/* Info */}
              <div className="text-center">
                <p className="text-xs text-on-surface-variant">
                  ⏱️ Presque terminé !
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
