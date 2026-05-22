'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import '@/styles/theme-ibihub.css'
import { useAuth } from '@/hooks/useAuth'
import { 
  Brain,
  RefreshCw,
  Download,
  Activity
} from 'lucide-react'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer
} from 'recharts'
import { AppLayout } from '@/components/layout/AppLayout'
import { getTreasuryData, getRevenueData, getOrganizationData } from '@/services/api/reporting.service'
import { InfoBadge } from '@/components/ui/Tooltip'
import ProductTour from '@/components/ui/ProductTour'
import AICopilot from '@/components/ui/AICopilot'

export default function IBihubDashboardReal() {
  const { user, canImportData } = useAuth()

  // Product Tour configuration
  const tourSteps = [
    {
      target: '#dashboard-treasury',
      title: 'Votre Argent Disponible',
      content: 'Votre trésorerie nette en temps réel, calculée selon vos comptes bancaires et caisses. C\'est votre indicateur de liquidité immédiate.'
    },
    {
      target: '#import-button',
      title: 'Commencez Ici !',
      content: 'Glissez votre fichier d\'export Mobile Money (Wave, MTN, Moov) pour importer automatiquement vos transactions.'
    },
    {
      target: '#reconciliation-ai',
      title: 'L\'IA fait la Magie',
      content: 'L\'IA analyse vos libellés et associe automatiquement vos flux avec un score de confiance. Plus besoin de saisie manuelle !'
    }
  ]
  const [data, setData] = useState<any>({
    treasury: 0,
    revenue: 0,
    currency: { code: 'XOF', symbol: 'FCFA' },
    currencySymbol: 'FCFA',
    revenueData: [],
    pieData: [],
    aiInsights: [
      { type: 'info', message: 'Chargement des données en cours...' }
    ],
    recentActivities: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real OHADA data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Get organization data for currency
        const orgData = await getOrganizationData()
        
        // Get treasury data (Classe 5: comptes 52 et 57)
        const treasuryData = await getTreasuryData()
        const treasuryAmount = treasuryData.total_treasury || 0
        
        // Get revenue data (Classe 7: comptes 701100, 706100)
        const revenueData = await getRevenueData()
        const revenueAmount = revenueData.total_revenue || 0
        
        // Format amounts with dynamic currency
        const formatAmount = (amount: number) => {
          const currencySymbol = orgData.currency?.symbol || 'FCFA'
          if (amount >= 1000000) {
            return `${(amount / 1000000).toFixed(1)}M ${currencySymbol}`
          } else if (amount >= 1000) {
            return `${(amount / 1000).toFixed(0)}K ${currencySymbol}`
          } else {
            return `${amount.toFixed(0)} ${currencySymbol}`
          }
        }
        
        // Use real series from API when provided; otherwise leave empty (Cas Zéro)
        const monthlySeries = Array.isArray((revenueData as any)?.monthly_series)
          ? (revenueData as any).monthly_series
          : []
        const breakdown = Array.isArray((revenueData as any)?.breakdown)
          ? (revenueData as any).breakdown
          : []

        const isEmpty = treasuryAmount === 0 && revenueAmount === 0

        setData({
          treasury: treasuryAmount,
          revenue: revenueAmount,
          currency: orgData.currency,
          currencySymbol: orgData.currency?.symbol || 'FCFA',
          revenueData: monthlySeries,
          pieData: breakdown,
          aiInsights: isEmpty
            ? [
                { type: 'info', message: 'Aucune donnée disponible. Importez votre premier relevé pour commencer.' }
              ]
            : [
                { type: 'info', message: `Trésorerie disponible : ${formatAmount(treasuryAmount)}` },
                { type: 'info', message: `Devise : ${orgData.currency?.code || 'XOF'} (${orgData.currency?.symbol || 'FCFA'})` }
              ],
          recentActivities: Array.isArray((revenueData as any)?.recent_activities)
            ? (revenueData as any).recent_activities
            : []
        })
      } catch (err: any) {
        console.error("DÉTAIL ERREUR API GORFISCA:", err?.response || err)
        // Masquer les erreurs techniques à l'utilisateur
        setError('')
        // Cas Zéro strict en cas d'erreur API : on n'invente rien et on reste neutre
        setData((prev: any) => ({
          ...prev,
          treasury: 0,
          revenue: 0,
          revenueData: [],
          pieData: [],
          aiInsights: [
            { type: 'info', message: 'Aucune donnée disponible. Importez votre premier relevé pour commencer.' }
          ],
          recentActivities: []
        }))
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        </div>
      </AppLayout>
    )
  }

  // Plus de blocage - afficher toujours le dashboard avec les données par défaut en cas d'erreur

  const formatAmount = (amount: number) => {
    const currencySymbol = data?.currencySymbol || 'FCFA'
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currencySymbol}`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K ${currencySymbol}`
    } else {
      return `${amount.toFixed(0)} ${currencySymbol}`
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
        {/* Toast discret pour les erreurs - auto-disparition */}
        {error && (
          <div className="fixed top-4 right-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg shadow-sm z-50 animate-pulse">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <div className="p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-4xl font-bold text-slate-900 mb-2">
                    Tableau de Bord
                  </h1>
                  <p className="text-slate-600 text-lg">
                    Vue d'ensemble de votre performance financière
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {canImportData() && (
                  <button 
                    onClick={() => window.location.href = '/imports'}
                    className="bg-emerald-500 px-4 py-2 rounded-lg text-white hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Importer un flux
                  </button>
                )}
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-white px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualiser
                </button>
              </div>
            </div>
          </motion.div>

          {/* Statistics Bar - Style Minimaliste Épuré */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {loading ? (
                    <div className="animate-pulse bg-slate-200 h-8 w-32 rounded mx-auto"></div>
                  ) : (
                    formatAmount(data?.treasury || 0)
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-slate-600 mt-1" id="dashboard-treasury">
                  <span>Trésorerie Nette</span>
                  <InfoBadge content="Solde des comptes 52 (Banque) et 57 (Caisse) selon les normes OHADA" />
                </div>
              </div>

              <div className="w-px h-12 bg-slate-200 mx-8"></div>

              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {loading ? (
                    <div className="animate-pulse bg-slate-200 h-8 w-32 rounded mx-auto"></div>
                  ) : (
                    formatAmount(data?.revenue || 0)
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 text-sm text-slate-600 mt-1">
                  <span>Revenus Mensuels</span>
                  <InfoBadge content="Somme des écritures des comptes Classe 7 (701100, 706100)" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-sm p-6 border-0"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Évolution des Revenus</h3>
              {(!data?.revenueData || data.revenueData.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center px-6">
                  <Activity className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">Aucune donnée disponible</p>
                  <p className="text-sm text-slate-400 mt-1">Importez votre premier relevé pour visualiser vos revenus</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 6 }}
                    name="Revenus"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 6 }}
                    name="Dépenses"
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl shadow-sm p-6 border-0"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-4">Répartition des Revenus</h3>
              {(!data?.pieData || data.pieData.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center px-6">
                  <Brain className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">Aucune donnée disponible</p>
                  <p className="text-sm text-slate-400 mt-1">La répartition apparaîtra dès vos premières ventes</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data?.pieData?.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      color: '#1e293b'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              )}
            </motion.div>
          </div>

          {/* AI Insights and Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm p-6 border-0"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Insights IA
              </h3>
              <div className="space-y-3">
                {data?.aiInsights?.map((insight: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                      insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                  >
                    <p className="text-sm">{insight.message}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm p-6 border-0"
            >
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activités Récentes
              </h3>
              <div className="space-y-3">
                {(!data?.recentActivities || data.recentActivities.length === 0) && (
                  <div className="text-center py-8">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Aucune activité récente</p>
                    <p className="text-xs text-slate-400 mt-1">Vos transactions apparaîtront ici</p>
                  </div>
                )}
                {data?.recentActivities?.map((activity: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{activity.action}</p>
                        <p className="text-sm text-slate-600">{activity.client}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{activity.amount}</p>
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Product Tour - Only for admin users */}
      {user?.role === 'admin' && (
        <ProductTour 
          steps={tourSteps}
          onComplete={() => console.log('Tour completed')}
        />
      )}

      {/* Moky AI Assistant */}
      <AICopilot 
        currentPage="dashboard"
        dashboardData={{
          treasury: data.treasury,
          revenue: data.revenue,
          currency: data.currency?.symbol || 'FCFA'
        }}
        userRole={user?.role}
        userName={user?.email}
      />
    </AppLayout>
  )
}
