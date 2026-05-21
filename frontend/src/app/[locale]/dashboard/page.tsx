'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { CashRealWidget } from '@/components/dashboard/CashRealWidget'
import { MonthlyPerformanceWidget } from '@/components/dashboard/MonthlyPerformanceWidget'
import { AIAlertWidget } from '@/components/dashboard/AIAlertWidget'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  Download, 
  FileText, 
  RefreshCw,
  TrendingUp,
  Users,
  Receipt,
  CreditCard
} from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import dashboardService, { DashboardKPIs } from '@/services/api/dashboard.service'
import { AIChatAssistant } from '@/components/ai/AIChatAssistant'

export default function DashboardPage() {
  const t = useTranslations()
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchKPIs = async () => {
    try {
      setError(null)
      const data = await dashboardService.getKPIs()
      setKpis(data)
    } catch (err: any) {
      console.error('Error fetching KPIs:', err)
      setError(err.response?.data?.message || 'Erreur lors du chargement des KPIs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchKPIs()
  }

  const handleExportFlashReport = async () => {
    try {
      const blob = await dashboardService.exportFlashReportPDF()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport-flash-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Error exporting flash report:', err)
      setError('Erreur lors de l\'export du rapport flash')
    }
  }

  const handleProposalAccepted = (entryData: any) => {
    // Handle AI proposal acceptance
    console.log('AI proposal accepted:', entryData)
    // Refresh KPIs after creating entry
    handleRefresh()
  }

  useEffect(() => {
    fetchKPIs()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card variant="elevated" className="bg-error-container">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-bold text-error mb-2">Erreur de chargement</h3>
                <p className="text-error mb-4">{error}</p>
                <Button onClick={fetchKPIs}>Réessayer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (!kpis) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-on-surface mb-2">
              Le Cockpit du Fondateur
            </h1>
            <p className="text-on-surface-variant">
              Vue d'ensemble de votre performance financière en temps réel
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            
            <Button
              variant="primary"
              onClick={handleExportFlashReport}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" />
              Rapport Flash
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="elevated" className="bg-emerald-50/30 border-emerald-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-on-surface-variant">Performance</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">
                    {kpis.monthly_performance.result > 0 ? '+' : ''}{kpis.monthly_performance.result.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xl font-bold text-emerald-600 mt-2">
                  {kpis.monthly_performance.result > 0 ? '+' : ''}{kpis.monthly_performance.result.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-on-surface-variant">Résultat mensuel</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card variant="elevated" className="bg-blue-50/30 border-blue-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-on-surface-variant">Créances</span>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">
                    {kpis.receivables.count} clients
                  </span>
                </div>
                <p className="text-xl font-bold text-blue-600 mt-2">
                  {kpis.receivables.total.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-on-surface-variant">À recouvrer</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card variant="elevated" className="bg-amber-50/30 border-amber-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-on-surface-variant">Factures</span>
                  </div>
                  <span className="text-xs text-amber-600 font-medium">
                    {kpis.pending_invoices.count} en attente
                  </span>
                </div>
                <p className="text-xl font-bold text-amber-600 mt-2">
                  {kpis.pending_invoices.amount.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-on-surface-variant">En attente de paiement</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="elevated" className="bg-purple-50/30 border-purple-200/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-on-surface-variant">Réconciliation</span>
                  </div>
                  <span className="text-xs text-purple-600 font-medium">
                    {kpis.unreconciled_transactions.count} transactions
                  </span>
                </div>
                <p className="text-xl font-bold text-purple-600 mt-2">
                  {kpis.unreconciled_transactions.amount.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-on-surface-variant">Non rapprochées</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-6 gap-6">
          {/* Cash Real Widget - 2x2 */}
          <CashRealWidget
            total={kpis.cash_real.total}
            breakdown={kpis.cash_real.breakdown}
            currency={kpis.cash_real.currency}
          />

          {/* Monthly Performance Widget - 3x1 */}
          <MonthlyPerformanceWidget
            revenue={kpis.monthly_performance.revenue}
            expenses={kpis.monthly_performance.expenses}
            result={kpis.monthly_performance.result}
            period={kpis.monthly_performance.period}
          />

          {/* AI Alert Widget - 3x1 */}
          <AIAlertWidget
            alert={kpis.ai_alert}
          />
        </div>

        {/* Performance Info */}
        <div className="mt-8 p-4 bg-surface-container-low/30 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-on-surface-variant">
                Dernière mise à jour: {new Date(kpis.last_updated).toLocaleString()}
              </span>
              <span className="text-emerald-600">
                Temps de chargement: {kpis.performance.query_time_ms}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${kpis.performance.cache_hit ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <span className="text-on-surface-variant">
                {kpis.performance.cache_hit ? 'Cache' : 'Live'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant */}
      <AIChatAssistant onProposalAccepted={handleProposalAccepted} />
    </DashboardLayout>
  )
}
