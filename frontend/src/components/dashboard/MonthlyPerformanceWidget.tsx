'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'

interface MonthlyPerformanceWidgetProps {
  revenue: number
  expenses: number
  result: number
  period: {
    start: string
    end: string
  }
  loading?: boolean
}

export function MonthlyPerformanceWidget({ revenue, expenses, result, period, loading }: MonthlyPerformanceWidgetProps) {
  const t = useTranslations('dashboard')

  const getPerformanceStatus = () => {
    if (result > 0) return { variant: 'success' as const, label: 'Bénéfice' }
    if (result < 0) return { variant: 'error' as const, label: 'Perte' }
    return { variant: 'warning' as const, label: 'Équilibre' }
  }

  const getPerformanceColor = () => {
    if (result > 0) return 'text-emerald-600'
    if (result < 0) return 'text-red-600'
    return 'text-amber-600'
  }

  const getPerformanceIcon = () => {
    if (result > 0) return <TrendingUp className="w-5 h-5" />
    if (result < 0) return <TrendingDown className="w-5 h-5" />
    return <DollarSign className="w-5 h-5" />
  }

  const revenuePercentage = revenue > 0 ? (revenue / (revenue + expenses)) * 100 : 0
  const expensesPercentage = expenses > 0 ? (expenses / (revenue + expenses)) * 100 : 0

  if (loading) {
    return (
      <Card variant="elevated" className="col-span-3">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-container-low rounded mb-4"></div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="h-16 bg-surface-container-low rounded"></div>
              <div className="h-16 bg-surface-container-low rounded"></div>
              <div className="h-16 bg-surface-container-low rounded"></div>
            </div>
            <div className="h-32 bg-surface-container-low rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const status = getPerformanceStatus()

  return (
    <Card variant="elevated" className="col-span-3 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 border-blue-200/50">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-lg">Performance Mensuelle</h3>
              <p className="text-sm text-on-surface-variant">
                {formatDate(period.start)} - {formatDate(period.end)}
              </p>
            </div>
          </div>
          <StatusBadge {...status}>
            {status.label}
          </StatusBadge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/30"
          >
            <div className="flex items-center justify-center mb-2">
              <ArrowUp className="w-4 h-4 text-emerald-600 mr-1" />
              <p className="text-xs text-emerald-600 font-medium">Produits</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {formatCurrency(revenue)}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {revenuePercentage.toFixed(1)}%
            </p>
          </motion.div>

          {/* Expenses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-4 bg-red-50/50 rounded-xl border border-red-200/30"
          >
            <div className="flex items-center justify-center mb-2">
              <ArrowDown className="w-4 h-4 text-red-600 mr-1" />
              <p className="text-xs text-red-600 font-medium">Charges</p>
            </div>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(expenses)}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {expensesPercentage.toFixed(1)}%
            </p>
          </motion.div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center p-4 bg-surface-container-low/50 rounded-xl border border-surface-container-low"
          >
            <div className="flex items-center justify-center mb-2">
              {getPerformanceIcon()}
              <p className={`text-xs font-medium ml-1 ${getPerformanceColor()}`}>
                Résultat
              </p>
            </div>
            <p className={`text-xl font-bold ${getPerformanceColor()}`}>
              {formatCurrency(result)}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Net
            </p>
          </motion.div>
        </div>

        {/* Visual Chart */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-on-surface">Répartition Produits vs Charges</h4>
            <p className="text-xs text-on-surface-variant">
              Total: {formatCurrency(revenue + expenses)}
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-8 bg-surface-container-low rounded-lg overflow-hidden flex">
            <motion.div
              className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${revenuePercentage}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              {revenuePercentage > 10 && `${revenuePercentage.toFixed(0)}%`}
            </motion.div>
            <motion.div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
              initial={{ width: 0 }}
              animate={{ width: `${expensesPercentage}%` }}
              transition={{ duration: 1, delay: 0.7 }}
            >
              {expensesPercentage > 10 && `${expensesPercentage.toFixed(0)}%`}
            </motion.div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-surface-container-low/50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">Marge brute</p>
              <p className="text-sm font-bold text-emerald-600">
                {revenue > 0 ? ((result / revenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
          <div className="p-3 bg-surface-container-low/50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-xs text-on-surface-variant">Ratio charges/produits</p>
              <p className="text-sm font-bold text-on-surface">
                {revenue > 0 ? ((expenses / revenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="mt-4 p-3 bg-surface-container-low/30 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-on-surface-variant mb-1">Tendance mensuelle</p>
              <div className="flex items-center justify-center gap-2">
                {getPerformanceIcon()}
                <p className={`text-sm font-medium ${getPerformanceColor()}`}>
                  {result > 0 ? 'Croissance positive' : result < 0 ? 'Déficit à surveiller' : 'Situation stable'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
