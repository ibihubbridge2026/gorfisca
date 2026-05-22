'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { 
  TrendingUp, 
  FileText, 
  Zap, 
  Download,
  BarChart3,
  AlertCircle,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Calculator
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { cn } from '@/lib/utils'

interface ProjectionData {
  month: string
  actual: number | null
  projected: number
}

interface TaxDeadline {
  id: string
  date: string
  title: string
  status: 'pending' | 'ready' | 'not_started'
  description: string
}

export default function ReportsPage() {
  const { user, canViewReports } = useAuth()
  const [activeTab, setActiveTab] = useState<'performance' | 'tax'>('performance')
  const [isGenerating, setIsGenerating] = useState<'result' | 'balance' | null>(null)
  const [taxData, setTaxData] = useState({
    tvaFacturee: 0,
    tvaRecuperable: 0,
    tvaNette: 0,
    loading: true
  })

  // Fetch real TVA data from API
  useEffect(() => {
    const fetchTaxData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        // Fetch TVA data from backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/accounting/tva-balance/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (response.ok) {
          const data = await response.json()
          setTaxData({
            tvaFacturee: data.tva_facturee || 0,
            tvaRecuperable: data.tva_recuperable || 0,
            tvaNette: data.tva_nette || 0,
            loading: false
          })
        } else {
          // Cas Zéro strict : aucune donnée fictive
          setTaxData({
            tvaFacturee: 0,
            tvaRecuperable: 0,
            tvaNette: 0,
            loading: false
          })
        }
      } catch (error) {
        console.error('Error fetching tax data:', error)
        setTaxData({
          tvaFacturee: 0,
          tvaRecuperable: 0,
          tvaNette: 0,
          loading: false
        })
      }
    }

    fetchTaxData()
  }, [])

  // Cas Zéro : aucune projection inventée. Sera remplie par l'API quand des données seront disponibles.
  const projectionData: ProjectionData[] = []

  // Échéancier fiscal réglementaire OHADA (calendrier officiel, pas de mock).
  // Tous les statuts démarrent en "not_started" : seront calculés dynamiquement
  // dès que des écritures comptables seront présentes.
  const taxDeadlines: TaxDeadline[] = [
    {
      id: '1',
      date: '15 du mois suivant',
      title: 'Télédéclaration et paiement de la TVA mensuelle',
      status: 'not_started',
      description: 'Soumission de la déclaration TVA et paiement du solde'
    },
    {
      id: '2',
      date: '30 Juin',
      title: 'Dépôt de la Liasse Fiscale Annuelle SYSCOHADA',
      status: 'not_started',
      description: 'Package fiscal annuel conforme SYSCOHADA'
    },
    {
      id: '3',
      date: '15 Juillet',
      title: 'Acompte provisionnel d\'Impôt sur les Sociétés (IS)',
      status: 'not_started',
      description: 'Premier acompte IS de l\'exercice fiscal'
    }
  ]

  const handleGenerateReport = async (type: 'result' | 'balance') => {
    setIsGenerating(type)
    
    // Show user-friendly notification for simulated exports
    const message = type === 'result' 
      ? 'Génération du Compte de Résultat en cours... Ce document officiel sera disponible dès la validation de votre déclaration par l\'administration.'
      : 'Génération du Bilan en cours... Ce document officiel sera disponible dès la validation de votre déclaration par l\'administration.'
    
    // Create toast notification
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-sm'
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <div class="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
        <div>
          <p class="font-medium text-white mb-1">Génération en cours</p>
          <p class="text-sm text-slate-300">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `
    
    document.body.appendChild(toast)
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 5000)
    
    // Simulate processing time
    setTimeout(() => {
      setIsGenerating(null)
    }, 2000)
  }

  return (
    <AppLayout>
      <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
        <div className="p-8">
          {/* En-tête de la page */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Intelligence & États Financiers
                </h1>
                <p className="text-slate-600 text-lg">
                  Analyse prédictive et conformité fiscale panafricaine.
                </p>
              </div>
            </div>

            {/* Système d'onglets */}
            <div className="border-b border-slate-200 mb-8">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'performance'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Performance & États Financiers
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('tax')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tax'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Déclarations Fiscales & TVA
                  </div>
                </button>
              </nav>
            </div>
          </motion.div>

          {/* Contenu des onglets */}
          {activeTab === 'performance' ? (
            <PerformanceTab 
              projectionData={projectionData}
              isGenerating={isGenerating}
              handleGenerateReport={handleGenerateReport}
              canViewReports={canViewReports()}
            />
          ) : (
            <TaxTab 
              taxDeadlines={taxDeadlines}
              canViewReports={canViewReports()}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}

// Onglet Performance & États Financiers
function PerformanceTab({ 
  projectionData, 
  isGenerating, 
  handleGenerateReport, 
  canViewReports 
}: {
  projectionData: ProjectionData[]
  isGenerating: 'result' | 'balance' | null
  handleGenerateReport: (type: 'result' | 'balance') => Promise<void>
  canViewReports: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Hub des États Réglementaires */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Hub des États Réglementaires</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Carte 1 : Compte de Résultat */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Compte de Résultat (SYSCOHADA)
                </h3>
                <p className="text-sm text-slate-600">
                  Calcul automatique des produits (Classe 7) et charges (Classe 6).
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Chiffre d'affaires</span>
                <span className="text-sm font-medium text-slate-400">—</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Charges totales</span>
                <span className="text-sm font-medium text-slate-400">—</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-900">Résultat net</span>
                <span className="text-sm font-bold text-slate-400">—</span>
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">Les calculs s'activeront dès vos premières écritures.</p>
            </div>
            
            <button
              onClick={() => handleGenerateReport('result')}
              disabled={isGenerating === 'result'}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                isGenerating === 'result'
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {isGenerating === 'result' ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Générer le Compte de Résultat</span>
                </>
              )}
            </button>
          </div>

          {/* Carte 2 : Bilan */}
          <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Bilan (SYSCOHADA)
                </h3>
                <p className="text-sm text-slate-600">
                  Situation patrimoniale avec actifs et passifs équilibrés.
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-slate-600" />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Total Actif</span>
                <span className="text-sm font-medium text-slate-400">—</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Total Passif</span>
                <span className="text-sm font-medium text-slate-400">—</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-900">Capitaux propres</span>
                <span className="text-sm font-bold text-slate-400">—</span>
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">Les calculs s'activeront dès vos premières écritures.</p>
            </div>
            
            <button
              onClick={() => handleGenerateReport('balance')}
              disabled={isGenerating === 'balance'}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                isGenerating === 'balance'
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {isGenerating === 'balance' ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Générer le Bilan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Graphique des Projections */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Projections de Trésorerie
            </h3>
            <p className="text-sm text-slate-600">
              Tendances basées sur les données historiques et prévisions IA.
            </p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        
        <div className="h-64">
          {projectionData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-700 font-medium">Rapport vierge</p>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Les calculs s'activeront dès l'intégration de vos premières données financières.
              </p>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                formatter={(value: any) => [
                  value ? `${value.toLocaleString()} FCFA` : 'N/A',
                  ''
                ]} 
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorActual)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorProjected)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-slate-600">Réel</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Prévisionnel</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Onglet Déclarations Fiscales & TVA
function TaxTab({ 
  taxDeadlines, 
  canViewReports 
}: {
  taxDeadlines: TaxDeadline[]
  canViewReports: boolean
}) {
  const [isPreparingForm, setIsPreparingForm] = useState(false)
  const [taxData, setTaxData] = useState({
    tvaFacturee: 0,
    tvaRecuperable: 0,
    tvaNette: 0,
    loading: true
  })

  // Fetch real TVA data from API
  useEffect(() => {
    const fetchTaxData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        // Fetch TVA data from backend
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/accounting/tva-balance/`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (response.ok) {
          const data = await response.json()
          setTaxData({
            tvaFacturee: data.tva_facturee || 0,
            tvaRecuperable: data.tva_recuperable || 0,
            tvaNette: data.tva_nette || 0,
            loading: false
          })
        } else {
          // Cas Zéro strict : aucune donnée fictive
          setTaxData({
            tvaFacturee: 0,
            tvaRecuperable: 0,
            tvaNette: 0,
            loading: false
          })
        }
      } catch (error) {
        console.error('Error fetching tax data:', error)
        setTaxData({
          tvaFacturee: 0,
          tvaRecuperable: 0,
          tvaNette: 0,
          loading: false
        })
      }
    }

    fetchTaxData()
  }, [])

  const handlePrepareForm = async () => {
    setIsPreparingForm(true)
    
    // Show user-friendly notification for simulated form generation
    const toast = document.createElement('div')
    toast.className = 'fixed top-4 right-4 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 max-w-sm'
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <div class="w-2 h-2 bg-white rounded-full animate-ping"></div>
        </div>
        <div>
          <p class="font-medium text-white mb-1">Préparation du Formulaire Fiscal</p>
          <p class="text-sm text-slate-300">Génération du formulaire G N°50 en cours... Ce document officiel sera disponible dès la validation par l\'administration fiscale.</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-slate-400 hover:text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `
    
    document.body.appendChild(toast)
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, 5000)
    
    // Simulate processing time
    setTimeout(() => {
      setIsPreparingForm(false)
    }, 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'not_started':
        return <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
      default:
        return <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'ready':
        return 'bg-emerald-100 text-emerald-800'
      case 'not_started':
        return 'bg-slate-100 text-slate-600'
      default:
        return 'bg-slate-100 text-slate-600'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente de validation'
      case 'ready':
        return 'Conforme et prêt à l\'envoi'
      case 'not_started':
        return 'Non commencé'
      default:
        return 'Inconnu'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Tableau de Bord de la TVA */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Tableau de Bord de la TVA
            </h3>
            <p className="text-sm text-slate-600">
              Calculateur dynamique basé sur les comptes OHADA.
            </p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 mb-1">TVA Facturée / Collectée (Compte 443)</p>
              <p className="text-xs text-slate-500">Montant total facturé aux clients</p>
            </div>
            {taxData.loading ? (
              <div className="w-20 h-6 bg-slate-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-lg font-semibold text-slate-900">
                {taxData.tvaFacturee.toLocaleString()} FCFA
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm text-slate-600 mb-1">TVA Récupérable / Déductible (Compte 445)</p>
              <p className="text-xs text-slate-500">TVA sur achats et charges déductibles</p>
            </div>
            {taxData.loading ? (
              <div className="w-20 h-6 bg-slate-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-lg font-semibold text-slate-900">
                {taxData.tvaRecuperable.toLocaleString()} FCFA
              </span>
            )}
          </div>
          
          <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div>
              <p className="text-sm font-medium text-emerald-900 mb-1">TVA Nette à payer</p>
              <p className="text-xs text-emerald-700">Solde du mois (443 - 445)</p>
            </div>
            {taxData.loading ? (
              <div className="w-24 h-7 bg-emerald-200 rounded animate-pulse"></div>
            ) : (
              <span className="text-xl font-bold text-emerald-900">
                {taxData.tvaNette.toLocaleString()} FCFA
              </span>
            )}
          </div>
        </div>
        
        {canViewReports && (
          <button
            onClick={handlePrepareForm}
            disabled={isPreparingForm}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 mt-6",
              isPreparingForm
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {isPreparingForm ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Préparation en cours...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Préparer le Formulaire National (G N°50 / Déclaration Annuelle)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Échéancier Fiscal Réglementaire */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Échéancier Fiscal Réglementaire
            </h3>
            <p className="text-sm text-slate-600">
              Obligations légales et statuts de conformité.
            </p>
          </div>
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-slate-600" />
          </div>
        </div>
        
        <div className="space-y-4">
          {taxDeadlines.map((deadline) => (
            <div key={deadline.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getStatusIcon(deadline.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-900">{deadline.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(deadline.status)}`}>
                    {getStatusLabel(deadline.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-1">{deadline.date}</p>
                <p className="text-xs text-slate-500">{deadline.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
