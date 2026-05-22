'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import '@/styles/theme-ibihub.css'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Eye, 
  Activity,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  Target,
  Brain,
  CheckCircle
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
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
import { useQuery } from '@tanstack/react-query'
import { reportingService } from '@/services/api/reporting.service'
import { aiAssistantService, useDashboardSummary } from '@/services/api/ai_assistant.service'
import { integrationService } from '@/services/api/integration.service'

// Types pour les données
interface KPICard {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease'
  icon: React.ElementType
  color: string
  bgColor: string
}

interface ChartData {
  month: string
  revenue: number
  expenses: number
}

interface ExpenseCategory {
  name: string
  value: number
  color: string
}

interface AIInsight {
  id: string
  type: 'predictive' | 'anomaly' | 'fiscal' | 'recommendation'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  confidence: number
  amount?: number
  created_at?: string
  metadata?: {
    amount?: number
    date?: string
    account_code?: string
    related_transactions?: string[]
  }
}

interface RecentActivity {
  id: string
  type: 'import' | 'validation' | 'journal_entry'
  description: string
  amount?: number
  date: string
  status: 'success' | 'pending' | 'error'
}

// Thème Premium Finance
const theme = {
  night: '#0F172A',
  slate: '#1E293B',
  emerald: '#10B981',
  emeraldLight: '#34D399',
  gray: '#64748B',
  white: '#F8FAFC',
  border: '#334155'
}

// Couleurs pour les graphiques
const CHART_COLORS = {
  revenue: '#10B981',
  expenses: '#EF4444',
  pie: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6']
}

export default function DashboardPage() {
  const t = useTranslations()
  const [selectedPeriod, setSelectedPeriod] = useState('6months')
  
  // Récupérer les données financières
  const { data: financialSummary, isLoading: financialLoading } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => reportingService.getFinancialSummary(),
    refetchInterval: 5 * 60 * 1000 // Rafraîchir toutes les 5 minutes
  })

  // Récupérer les insights IA
  const { data: aiSummary, isLoading: aiLoading } = useDashboardSummary()

  // Récupérer les activités récentes
  const { data: recentActivities, isLoading: activitiesLoading } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => integrationService.getRawIngestions(),
    refetchInterval: 2 * 60 * 1000 // Rafraîchir toutes les 2 minutes
  })

  // Calculer les KPIs
  const kpis: KPICard[] = React.useMemo(() => {
    if (!financialSummary) return []

    const cashBalance = financialSummary.key_metrics.cash_balance || 0
    const totalRevenue = financialSummary.key_metrics.total_revenue || 0
    const receivables = financialSummary.balance_sheet.assets.class_4?.total || 0
    const payables = financialSummary.balance_sheet.liabilities_equity.class_2?.total || 0

    return [
      {
        title: 'Trésorerie Nette',
        value: `${(cashBalance / 1000000).toFixed(1)}M FCFA`,
        change: 12.5,
        changeType: 'increase',
        icon: DollarSign,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/20'
      },
      {
        title: 'Chiffre d\'Affaires HT',
        value: `${(totalRevenue / 1000000).toFixed(1)}M FCFA`,
        change: 8.2,
        changeType: 'increase',
        icon: TrendingUp,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/20'
      },
      {
        title: 'Créances Clients',
        value: `${(receivables / 1000000).toFixed(1)}M FCFA`,
        change: -3.1,
        changeType: 'decrease',
        icon: Users,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10 border-purple-500/20'
      },
      {
        title: 'Dettes Fournisseurs',
        value: `${(payables / 1000000).toFixed(1)}M FCFA`,
        change: 5.7,
        changeType: 'increase',
        icon: CreditCard,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/20'
      }
    ]
  }, [financialSummary])

  // Données pour le graphique combiné
  const chartData: ChartData[] = React.useMemo(() => {
    if (!financialSummary) return []

    // Simuler les données des 6 derniers mois
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin']
    return months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 50000000) + 30000000,
      expenses: Math.floor(Math.random() * 40000000) + 20000000
    }))
  }, [financialSummary])

  // Données pour le pie chart des charges
  const expenseCategories: ExpenseCategory[] = React.useMemo(() => {
    if (!financialSummary) return []

    return [
      { name: 'Achats', value: 35, color: '#10B981' },
      { name: 'Services', value: 25, color: '#3B82F6' },
      { name: 'Salaires', value: 20, color: '#F59E0B' },
      { name: 'Loyer', value: 10, color: '#8B5CF6' },
      { name: 'Autres', value: 10, color: '#EC4899' }
    ]
  }, [financialSummary])

  // Insights IA
  const aiInsights: AIInsight[] = React.useMemo(() => {
    if (!aiSummary) return []

    const insights = aiSummary.insights?.slice(0, 3) || []
    
    return insights.map((insight: any): AIInsight => ({
      id: insight.id,
      type: insight.type as 'predictive' | 'anomaly' | 'fiscal' | 'recommendation',
      title: insight.title,
      description: insight.description,
      severity: insight.confidence > 80 ? 'high' : insight.confidence > 50 ? 'medium' : 'low',
      confidence: insight.confidence,
      amount: insight.amount,
      created_at: insight.created_at,
      metadata: insight.metadata
    }))
  }, [aiSummary])

  // Activités récentes
  const activities: RecentActivity[] = React.useMemo(() => {
    if (!recentActivities) return []

    return recentActivities.slice(0, 5).map(activity => ({
      id: activity.id.toString(),
      type: 'import',
      description: `Import ${activity.source_name}`,
      amount: activity.total_records,
      date: activity.created_at,
      status: activity.processing_status === 'completed' ? 'success' : 'pending'
    }))
  }, [recentActivities])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  } as const

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100
      }
    }
  } as const

  return (
    <div className="dashboard-premium">
      <div className="dashboard-container p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Tableau de Bord GORFISCA
              </h1>
              <p className="text-slate-400 text-lg">
                Vue d'ensemble de votre performance financière
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {selectedPeriod === '6months' ? '6 derniers mois' : 'Cette année'}
              </button>
              
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </button>
              
              <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {kpis.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              variants={itemVariants}
              className={`kpi-card animate-fadeInUp`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                
                <div className={`flex items-center gap-1 text-sm ${
                  kpi.changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {kpi.changeType === 'increase' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(kpi.change)}%</span>
                </div>
              </div>
              
              <h3 className="text-slate-400 text-sm mb-2">{kpi.title}</h3>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Combined Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="chart-container animate-fadeInLeft"
            >
              <div className="chart-header">
                <h3 className="chart-title flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  Revenus vs Dépenses
                </h3>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748B" />
                  <YAxis stroke="#64748B" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: '1px solid #334155',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill={CHART_COLORS.revenue} name="Revenus" />
                  <Bar dataKey="expenses" fill={CHART_COLORS.expenses} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Pie Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="chart-container animate-fadeInRight"
            >
              <div className="chart-header">
                <h3 className="chart-title flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Répartition des Charges
                </h3>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* AI Insights Panel - 1 column */}
          <div className="space-y-6">
            {/* AI Insights */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="ai-insights-panel animate-fadeInRight"
            >
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-semibold text-white">Gorfisca Eye</h3>
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                </div>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {aiInsights.map((insight, index) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${
                        insight.severity === 'high' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : insight.severity === 'medium'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-blue-500/10 border-blue-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          insight.severity === 'high' 
                            ? 'bg-red-500/20' 
                            : insight.severity === 'medium'
                            ? 'bg-amber-500/20'
                            : 'bg-blue-500/20'
                        }`}>
                          {insight.type === 'predictive' && (
                            <Eye className={`w-4 h-4 ${
                              insight.severity === 'high' ? 'text-red-400' :
                              insight.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                            }`} />
                          )}
                          {insight.type === 'anomaly' && (
                            <AlertTriangle className={`w-4 h-4 ${
                              insight.severity === 'high' ? 'text-red-400' :
                              insight.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                            }`} />
                          )}
                          {insight.type === 'fiscal' && (
                            <Target className={`w-4 h-4 ${
                              insight.severity === 'high' ? 'text-red-400' :
                              insight.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'
                            }`} />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                          <p className="text-slate-400 text-sm">{insight.description}</p>
                          
                          {insight.amount && (
                            <p className="text-emerald-400 text-sm mt-2">
                              {insight.amount.toLocaleString()} FCFA
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Recent Activities */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="recent-activities animate-fadeInUp"
            >
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Activités Récentes
              </h3>
              
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-emerald-400' :
                        activity.status === 'pending' ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-white text-sm">{activity.description}</p>
                        <p className="text-slate-400 text-xs">
                          {activity.amount} transactions
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                      <button className="text-emerald-400 text-xs hover:text-emerald-300 transition-colors">
                        Voir →
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
