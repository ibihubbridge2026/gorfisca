'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  AlertTriangle,
  Target,
  Calendar,
  Download,
  Printer,
  Calculator,
  Flame,
  Clock,
  Battery
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CashFlowData {
  period: string
  current_cash: number
  monthly_burn_rate: number
  runway_months: number
  cash_flow_trend: 'increasing' | 'decreasing' | 'stable'
  monthly_data: MonthlyCashFlow[]
  projections: CashFlowProjection[]
  key_metrics: CashFlowMetrics
}

interface MonthlyCashFlow {
  month: string
  date: string
  opening_balance: number
  inflows: number
  outflows: number
  net_cash_flow: number
  closing_balance: number
  burn_rate: number
}

interface CashFlowProjection {
  month: string
  projected_balance: number
  probability: number
  scenario: 'pessimistic' | 'realistic' | 'optimistic'
}

interface CashFlowMetrics {
  avg_monthly_inflow: number
  avg_monthly_outflow: number
  cash_flow_volatility: number
  liquidity_ratio: number
  operating_cash_flow: number
  free_cash_flow: number
}

export default function CashFlowPage() {
  const t = useTranslations('reports')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('12months')
  const [selectedScenario, setSelectedScenario] = useState<'pessimistic' | 'realistic' | 'optimistic'>('realistic')

  // Fetch cash flow data
  const { data: cashFlowData, isLoading, error } = useQuery({
    queryKey: ['cash-flow', selectedPeriod],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        period: '2026',
        current_cash: 8500000,
        monthly_burn_rate: 450000,
        runway_months: 18.9,
        cash_flow_trend: 'decreasing',
        monthly_data: [
          {
            month: 'Juin 2025',
            date: '2025-06-01',
            opening_balance: 12000000,
            inflows: 3200000,
            outflows: 2800000,
            net_cash_flow: 400000,
            closing_balance: 12400000,
            burn_rate: 2800000
          },
          {
            month: 'Juil 2025',
            date: '2025-07-01',
            opening_balance: 12400000,
            inflows: 2800000,
            outflows: 3200000,
            net_cash_flow: -400000,
            closing_balance: 12000000,
            burn_rate: 3200000
          },
          {
            month: 'Août 2025',
            date: '2025-08-01',
            opening_balance: 12000000,
            inflows: 2500000,
            outflows: 3100000,
            net_cash_flow: -600000,
            closing_balance: 11400000,
            burn_rate: 3100000
          },
          {
            month: 'Sep 2025',
            date: '2025-09-01',
            opening_balance: 11400000,
            inflows: 2900000,
            outflows: 3400000,
            net_cash_flow: -500000,
            closing_balance: 10900000,
            burn_rate: 3400000
          },
          {
            month: 'Oct 2025',
            date: '2025-10-01',
            opening_balance: 10900000,
            inflows: 2600000,
            outflows: 3800000,
            net_cash_flow: -1200000,
            closing_balance: 9700000,
            burn_rate: 3800000
          },
          {
            month: 'Nov 2025',
            date: '2025-11-01',
            opening_balance: 9700000,
            inflows: 3100000,
            outflows: 3600000,
            net_cash_flow: -500000,
            closing_balance: 9200000,
            burn_rate: 3600000
          },
          {
            month: 'Déc 2025',
            date: '2025-12-01',
            opening_balance: 9200000,
            inflows: 3800000,
            outflows: 4500000,
            net_cash_flow: -700000,
            closing_balance: 8500000,
            burn_rate: 4500000
          },
          {
            month: 'Jan 2026',
            date: '2026-01-01',
            opening_balance: 8500000,
            inflows: 3200000,
            outflows: 3700000,
            net_cash_flow: -500000,
            closing_balance: 8000000,
            burn_rate: 3700000
          },
          {
            month: 'Fév 2026',
            date: '2026-02-01',
            opening_balance: 8000000,
            inflows: 2900000,
            outflows: 3400000,
            net_cash_flow: -500000,
            closing_balance: 7500000,
            burn_rate: 3400000
          },
          {
            month: 'Mar 2026',
            date: '2026-03-01',
            opening_balance: 7500000,
            inflows: 3500000,
            outflows: 3000000,
            net_cash_flow: 500000,
            closing_balance: 8000000,
            burn_rate: 3000000
          },
          {
            month: 'Avr 2026',
            date: '2026-04-01',
            opening_balance: 8000000,
            inflows: 3100000,
            outflows: 3600000,
            net_cash_flow: -500000,
            closing_balance: 7500000,
            burn_rate: 3600000
          },
          {
            month: 'Mai 2026',
            date: '2026-05-01',
            opening_balance: 7500000,
            inflows: 3300000,
            outflows: 3800000,
            net_cash_flow: -500000,
            closing_balance: 7000000,
            burn_rate: 3800000
          }
        ],
        projections: [
          { month: 'Juin 2026', projected_balance: 6500000, probability: 0.8, scenario: 'realistic' },
          { month: 'Juil 2026', projected_balance: 6000000, probability: 0.7, scenario: 'realistic' },
          { month: 'Août 2026', projected_balance: 5500000, probability: 0.6, scenario: 'realistic' },
          { month: 'Sep 2026', projected_balance: 5000000, probability: 0.5, scenario: 'realistic' },
          { month: 'Oct 2026', projected_balance: 4500000, probability: 0.4, scenario: 'realistic' },
          { month: 'Nov 2026', projected_balance: 4000000, probability: 0.3, scenario: 'realistic' },
          { month: 'Déc 2026', projected_balance: 3500000, probability: 0.2, scenario: 'realistic' }
        ],
        key_metrics: {
          avg_monthly_inflow: 3100000,
          avg_monthly_outflow: 3500000,
          cash_flow_volatility: 0.25,
          liquidity_ratio: 2.4,
          operating_cash_flow: -450000,
          free_cash_flow: -650000
        }
      } as CashFlowData
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000
  })

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!cashFlowData) return null

    const recentMonths = cashFlowData.monthly_data.slice(-6)
    const avgBurnRate = recentMonths.reduce((sum, month) => sum + month.burn_rate, 0) / recentMonths.length
    const cashFlowTrend = recentMonths.slice(-3).reduce((sum, month) => sum + month.net_cash_flow, 0) / 3

    return {
      avgBurnRate,
      cashFlowTrend,
      runwayStatus: cashFlowData.runway_months > 12 ? 'healthy' : cashFlowData.runway_months > 6 ? 'warning' : 'critical',
      burnRateStatus: avgBurnRate > 5000000 ? 'high' : avgBurnRate > 3000000 ? 'moderate' : 'low'
    }
  }, [cashFlowData])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <Calculator className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_cash_flow')}
        </h3>
        <p className="text-on-surface-variant mb-4">
          {error instanceof Error ? error.message : t('unknown_error')}
        </p>
        <Button onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('cash_flow')}
          </h1>
          <p className="text-on-surface-variant">
            {t('cash_flow_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">{t('last_3_months')}</SelectItem>
              <SelectItem value="6months">{t('last_6_months')}</SelectItem>
              <SelectItem value="12months">{t('last_12_months')}</SelectItem>
              <SelectItem value="24months">{t('last_24_months')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
          
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            {t('print')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Cash */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <Badge variant="outline" className="text-xs">
                {t('current')}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('current_cash')}</p>
              <p className="text-2xl font-bold text-emerald-600">
                {cashFlowData?.current_cash.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Burn Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-600" />
              </div>
              <Badge variant={derivedMetrics?.burnRateStatus === 'high' ? 'error' : derivedMetrics?.burnRateStatus === 'moderate' ? 'warning' : 'success'} className="text-xs">
                {derivedMetrics?.burnRateStatus}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('monthly_burn_rate')}</p>
              <p className="text-2xl font-bold text-error">
                {cashFlowData?.monthly_burn_rate.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Runway */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <Badge variant={derivedMetrics?.runwayStatus === 'healthy' ? 'success' : derivedMetrics?.runwayStatus === 'warning' ? 'warning' : 'error'} className="text-xs">
                {derivedMetrics?.runwayStatus}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('runway_months')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {cashFlowData?.runway_months.toFixed(1)} {t('months')}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Cash Flow Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-600" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                cashFlowData?.cash_flow_trend === 'increasing' ? 'text-emerald-600' : 
                cashFlowData?.cash_flow_trend === 'decreasing' ? 'text-error' : 'text-amber-600'
              }`}>
                {cashFlowData?.cash_flow_trend === 'increasing' && <TrendingUp className="w-4 h-4" />}
                {cashFlowData?.cash_flow_trend === 'decreasing' && <TrendingDown className="w-4 h-4" />}
                <span>{cashFlowData?.cash_flow_trend}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant mb-1">{t('cash_flow_trend')}</p>
              <p className="text-2xl font-bold text-amber-600">
                {derivedMetrics?.cashFlowTrend.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Cash Flow Chart */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-6">
            {t('cash_flow_analysis')}
          </h3>
          
          {/* Area Chart Placeholder */}
          <div className="h-80 mb-6">
            <div className="h-full flex items-end justify-between gap-1 px-2">
              {cashFlowData?.monthly_data.map((month, index) => (
                <div key={month.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col-reverse">
                    {/* Outflows */}
                    <div 
                      className="bg-red-500 rounded-t"
                      style={{ height: `${(month.outflows / 5000000) * 100}%` }}
                    />
                    {/* Inflows */}
                    <div 
                      className="bg-emerald-500"
                      style={{ height: `${(month.inflows / 5000000) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2 rotate-45 origin-left">
                    {month.month.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-on-surface-variant">{t('inflows')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-xs text-on-surface-variant">{t('outflows')}</span>
              </div>
            </div>
          </div>

          {/* Cash Flow Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-container-low">
                  <th className="text-left py-2 font-medium text-on-surface">{t('month')}</th>
                  <th className="text-right py-2 font-medium text-on-surface">{t('opening_balance')}</th>
                  <th className="text-right py-2 font-medium text-on-surface">{t('inflows')}</th>
                  <th className="text-right py-2 font-medium text-on-surface">{t('outflows')}</th>
                  <th className="text-right py-2 font-medium text-on-surface">{t('net_cash_flow')}</th>
                  <th className="text-right py-2 font-medium text-on-surface">{t('closing_balance')}</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowData?.monthly_data.slice(-6).map((month) => (
                  <tr key={month.month} className="border-b border-surface-container-low/50">
                    <td className="py-2 text-on-surface">{month.month}</td>
                    <td className="text-right text-on-surface">
                      {month.opening_balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                    <td className="text-right text-emerald-600">
                      {month.inflows.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                    <td className="text-right text-error">
                      {month.outflows.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                    <td className={`text-right font-medium ${
                      month.net_cash_flow > 0 ? 'text-emerald-600' : 'text-error'
                    }`}>
                      {month.net_cash_flow > 0 && '+'}
                      {month.net_cash_flow.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                    <td className="text-right text-on-surface">
                      {month.closing_balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Projections */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('cash_flow_projections')}
            </h3>
            <Select value={selectedScenario} onValueChange={(value: any) => setSelectedScenario(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pessimistic">{t('pessimistic')}</SelectItem>
                <SelectItem value="realistic">{t('realistic')}</SelectItem>
                <SelectItem value="optimistic">{t('optimistic')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Projection Chart */}
          <div className="h-64 mb-6">
            <div className="h-full flex items-end justify-between gap-1 px-2">
              {cashFlowData?.projections.map((projection, index) => (
                <div key={projection.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full">
                    <div 
                      className={`rounded-t ${
                        selectedScenario === 'pessimistic' ? 'bg-red-400' :
                        selectedScenario === 'realistic' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ height: `${(projection.projected_balance / 12000000) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-on-surface-variant mt-2">
                    {projection.month.split(' ')[0]}
                  </span>
                  <div className="text-xs text-on-surface-variant mt-1">
                    {Math.round(projection.probability * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Runway Indicator */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface">{t('runway_indicator')}</span>
              <span className="text-sm text-on-surface-variant">
                {cashFlowData?.runway_months.toFixed(1)} {t('months')}
              </span>
            </div>
            <Progress 
              value={Math.min((cashFlowData?.runway_months || 0) / 24 * 100, 100)} 
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span>0 {t('months')}</span>
              <span>12 {t('months')}</span>
              <span>24 {t('months')}</span>
            </div>
          </div>

          {/* Alert */}
          {derivedMetrics?.runwayStatus === 'critical' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">
                    {t('critical_cash_flow_warning')}
                  </p>
                  <p className="text-xs text-red-700">
                    {t('critical_cash_flow_description')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('liquidity_metrics')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('avg_monthly_inflow')}</span>
                <span className="text-sm font-medium text-emerald-600">
                  {cashFlowData?.key_metrics.avg_monthly_inflow.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('avg_monthly_outflow')}</span>
                <span className="text-sm font-medium text-error">
                  {cashFlowData?.key_metrics.avg_monthly_outflow.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('liquidity_ratio')}</span>
                <span className="text-sm font-medium text-blue-600">
                  {cashFlowData?.key_metrics.liquidity_ratio.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('operating_cash_flow')}</span>
                <span className={`text-sm font-medium ${
                  cashFlowData?.key_metrics.operating_cash_flow > 0 ? 'text-emerald-600' : 'text-error'
                }`}>
                  {cashFlowData?.key_metrics.operating_cash_flow.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('cash_efficiency')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('cash_flow_volatility')}</span>
                <span className="text-sm font-medium text-amber-600">
                  {(cashFlowData?.key_metrics.cash_flow_volatility * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('free_cash_flow')}</span>
                <span className={`text-sm font-medium ${
                  cashFlowData?.key_metrics.free_cash_flow > 0 ? 'text-emerald-600' : 'text-error'
                }`}>
                  {cashFlowData?.key_metrics.free_cash_flow.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t('burn_rate_trend')}</span>
                <div className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-error" />
                  <span className="text-sm font-medium text-error">
                    {t('increasing')}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
