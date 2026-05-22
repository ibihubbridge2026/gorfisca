'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Printer,
  FileSpreadsheet,
  Calculator,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Target
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PnLItem {
  id: string
  code: string
  label: string
  level: number
  amount_current: number
  amount_previous: number
  variation_percent: number
  variation_amount: number
  children?: PnLItem[]
  is_parent?: boolean
}

interface PnLData {
  period_current: string
  period_previous: string
  total_revenue: number
  total_expenses: number
  net_result: number
  net_result_previous: number
  revenue_items: PnLItem[]
  expense_items: PnLItem[]
}

export default function PnLPage() {
  const t = useTranslations('reports')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_year')

  // Fetch P&L data
  const { data: pnlData, isLoading, error } = useQuery({
    queryKey: ['pnl', selectedPeriod],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        period_current: '2026',
        period_previous: '2025',
        total_revenue: 18500000,
        total_expenses: 14200000,
        net_result: 4300000,
        net_result_previous: 3800000,
        revenue_items: [
          {
            id: 'produits',
            code: 'PRODUITS',
            label: 'PRODUITS',
            level: 0,
            amount_current: 18500000,
            amount_previous: 17200000,
            variation_percent: 7.56,
            variation_amount: 1300000,
            is_parent: true,
            children: [
              {
                id: 'produits_exploitation',
                code: 'PRODUITS D\'EXPLOITATION',
                label: 'Produits d\'exploitation',
                level: 1,
                amount_current: 17500000,
                amount_previous: 16200000,
                variation_percent: 8.02,
                variation_amount: 1300000,
                is_parent: true,
                children: [
                  {
                    id: 'classe_7',
                    code: 'Classe 7',
                    label: 'Comptes de produits',
                    level: 2,
                    amount_current: 17500000,
                    amount_previous: 16200000,
                    variation_percent: 8.02,
                    variation_amount: 1300000,
                    is_parent: true,
                    children: [
                      {
                        id: '70',
                        code: '70',
                        label: 'Ventes de marchandises',
                        level: 3,
                        amount_current: 8500000,
                        amount_previous: 7800000,
                        variation_percent: 8.97,
                        variation_amount: 700000
                      },
                      {
                        id: '71',
                        code: '71',
                        label: 'Ventes de produits finis',
                        level: 3,
                        amount_current: 6200000,
                        amount_previous: 5700000,
                        variation_percent: 8.77,
                        variation_amount: 500000
                      },
                      {
                        id: '72',
                        code: '72',
                        label: 'Prestations de services',
                        level: 3,
                        amount_current: 2800000,
                        amount_previous: 2700000,
                        variation_percent: 3.70,
                        variation_amount: 100000
                      }
                    ]
                  }
                ]
              },
              {
                id: 'produits_financiers',
                code: 'PRODUITS FINANCIERS',
                label: 'Produits financiers',
                level: 1,
                amount_current: 500000,
                amount_previous: 600000,
                variation_percent: -16.67,
                variation_amount: -100000,
                is_parent: true,
                children: [
                  {
                    id: '77',
                    code: '77',
                    label: 'Revenus financiers',
                    level: 2,
                    amount_current: 500000,
                    amount_previous: 600000,
                    variation_percent: -16.67,
                    variation_amount: -100000
                  }
                ]
              },
              {
                id: 'produits_exceptionnels',
                code: 'PRODUITS EXCEPTIONNELS',
                label: 'Produits exceptionnels',
                level: 1,
                amount_current: 500000,
                amount_previous: 400000,
                variation_percent: 25.00,
                variation_amount: 100000,
                is_parent: true,
                children: [
                  {
                    id: '84',
                    code: '84',
                    label: 'Produits exceptionnels',
                    level: 2,
                    amount_current: 500000,
                    amount_previous: 400000,
                    variation_percent: 25.00,
                    variation_amount: 100000
                  }
                ]
              }
            ]
          }
        ],
        expense_items: [
          {
            id: 'charges',
            code: 'CHARGES',
            label: 'CHARGES',
            level: 0,
            amount_current: 14200000,
            amount_previous: 13400000,
            variation_percent: 5.97,
            variation_amount: 800000,
            is_parent: true,
            children: [
              {
                id: 'charges_exploitation',
                code: 'CHARGES D\'EXPLOITATION',
                label: 'Charges d\'exploitation',
                level: 1,
                amount_current: 13500000,
                amount_previous: 12800000,
                variation_percent: 5.47,
                variation_amount: 700000,
                is_parent: true,
                children: [
                  {
                    id: 'classe_6',
                    code: 'Classe 6',
                    label: 'Comptes de charges',
                    level: 2,
                    amount_current: 13500000,
                    amount_previous: 12800000,
                    variation_percent: 5.47,
                    variation_amount: 700000,
                    is_parent: true,
                    children: [
                      {
                        id: '60',
                        code: '60',
                        label: 'Achats de marchandises',
                        level: 3,
                        amount_current: 4200000,
                        amount_previous: 4000000,
                        variation_percent: 5.00,
                        variation_amount: 200000
                      },
                      {
                        id: '61',
                        code: '61',
                        label: 'Services extérieurs',
                        level: 3,
                        amount_current: 3800000,
                        amount_previous: 3600000,
                        variation_percent: 5.56,
                        variation_amount: 200000
                      },
                      {
                        id: '62',
                        code: '62',
                        label: 'Autres services extérieurs',
                        level: 3,
                        amount_current: 2500000,
                        amount_previous: 2400000,
                        variation_percent: 4.17,
                        variation_amount: 100000
                      },
                      {
                        id: '63',
                        code: '63',
                        label: 'Charges de personnel',
                        level: 3,
                        amount_current: 1800000,
                        amount_previous: 1700000,
                        variation_percent: 5.88,
                        variation_amount: 100000
                      },
                      {
                        id: '64',
                        code: '64',
                        label: 'Impôts et taxes',
                        level: 3,
                        amount_current: 800000,
                        amount_previous: 750000,
                        variation_percent: 6.67,
                        variation_amount: 50000
                      },
                      {
                        id: '65',
                        code: '65',
                        label: 'Autres charges de gestion courante',
                        level: 3,
                        amount_current: 400000,
                        amount_previous: 350000,
                        variation_percent: 14.29,
                        variation_amount: 50000
                      }
                    ]
                  }
                ]
              },
              {
                id: 'charges_financieres',
                code: 'CHARGES FINANCIÈRES',
                label: 'Charges financières',
                level: 1,
                amount_current: 400000,
                amount_previous: 350000,
                variation_percent: 14.29,
                variation_amount: 50000,
                is_parent: true,
                children: [
                  {
                    id: '67',
                    code: '67',
                    label: 'Charges financières',
                    level: 2,
                    amount_current: 400000,
                    amount_previous: 350000,
                    variation_percent: 14.29,
                    variation_amount: 50000
                  }
                ]
              },
              {
                id: 'charges_exceptionnelles',
                code: 'CHARGES EXCEPTIONNELLES',
                label: 'Charges exceptionnelles',
                level: 1,
                amount_current: 300000,
                amount_previous: 250000,
                variation_percent: 20.00,
                variation_amount: 50000,
                is_parent: true,
                children: [
                  {
                    id: '85',
                    code: '85',
                    label: 'Charges exceptionnelles',
                    level: 2,
                    amount_current: 300000,
                    amount_previous: 250000,
                    variation_percent: 20.00,
                    variation_amount: 50000
                  }
                ]
              }
            ]
          }
        ]
      } as PnLData
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const renderPnLItem = (item: PnLItem, section: 'revenue' | 'expense') => {
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0
    const isParent = item.is_parent || hasChildren

    return (
      <React.Fragment key={item.id}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`
            flex items-center hover:bg-surface-container-low/30 transition-colors
            ${item.level === 0 ? 'font-bold text-lg border-b-2 border-surface-container-low pb-2 mb-2' : ''}
            ${item.level === 1 ? 'font-semibold text-base border-b border-surface-container-low/50 pb-1 mb-1' : ''}
            ${item.level === 2 ? 'text-sm pl-4' : ''}
            ${item.level === 3 ? 'text-sm pl-8' : ''}
          `}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-8 flex items-center">
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(item.id)}
                className="p-1 hover:bg-surface-container rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                )}
              </button>
            )}
          </div>

          {/* Account Code */}
          <div className="w-20 text-on-surface-variant text-sm">
            {item.code}
          </div>

          {/* Account Label */}
          <div className="flex-1 text-on-surface">
            {item.label}
          </div>

          {/* Amount Current */}
          <div className="w-32 text-right font-medium text-on-surface">
            {item.amount_current.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </div>

          {/* Amount Previous */}
          <div className="w-32 text-right text-on-surface-variant">
            {item.amount_previous.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
          </div>

          {/* Variation Amount */}
          <div className="w-32 text-right">
            <div className={`text-sm font-medium ${
              item.variation_amount > 0 ? 'text-emerald-600' : 
              item.variation_amount < 0 ? 'text-error' : 'text-on-surface-variant'
            }`}>
              {item.variation_amount > 0 && '+'}
              {item.variation_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
          </div>

          {/* Variation Percent */}
          <div className="w-24 text-right">
            <div className={`flex items-center justify-end gap-1 ${
              item.variation_percent > 0 ? 'text-emerald-600' : 
              item.variation_percent < 0 ? 'text-error' : 'text-on-surface-variant'
            }`}>
              {item.variation_percent > 0 && <TrendingUp className="w-3 h-3" />}
              {item.variation_percent < 0 && <TrendingDown className="w-3 h-3" />}
              {item.variation_percent === 0 && <Minus className="w-3 h-3" />}
              <span className="text-sm font-medium">
                {Math.abs(item.variation_percent).toFixed(2)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {item.children?.map(child => renderPnLItem(child, section))}
            </motion.div>
          )}
        </AnimatePresence>
      </React.Fragment>
    )
  }

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

        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
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
          {t('error_loading_pnl')}
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
    <div className="space-y-6 print:space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('profit_loss')}
          </h1>
          <p className="text-on-surface-variant">
            {t('profit_loss_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_year">{t('current_year')}</SelectItem>
              <SelectItem value="previous_year">{t('previous_year')}</SelectItem>
              <SelectItem value="current_quarter">{t('current_quarter')}</SelectItem>
              <SelectItem value="previous_quarter">{t('previous_quarter')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {t('export_excel')}
          </Button>
          
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            {t('print')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_revenue')}</p>
              <p className="text-lg font-semibold text-emerald-600">
                {pnlData?.total_revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_expenses')}</p>
              <p className="text-lg font-semibold text-error">
                {pnlData?.total_expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('net_result')}</p>
              <p className={`text-lg font-semibold ${
                pnlData?.net_result && pnlData.net_result > 0 ? 'text-emerald-600' : 'text-error'
              }`}>
                {pnlData?.net_result.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Period Info */}
      <Card className="p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-on-surface-variant">{t('period_current')}</p>
              <p className="font-medium text-on-surface">{pnlData?.period_current}</p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('period_previous')}</p>
              <p className="font-medium text-on-surface">{pnlData?.period_previous}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Badge variant="outline" className="text-xs">
              {t('generated_on')}: {format(new Date(), 'dd MMM yyyy HH:mm', { locale: fr })}
            </Badge>
          </div>
        </div>
      </Card>

      {/* P&L Statement */}
      <Card className="p-6 print:p-4 print:shadow-none">
        {/* Table Header */}
        <div className="flex items-center pb-4 border-b border-surface-container-low mb-4 print:mb-2">
          <div className="w-28"></div>
          <div className="flex-1"></div>
          <div className="w-32 text-center font-semibold text-on-surface">
            {t('amount_current')}
          </div>
          <div className="w-32 text-center font-semibold text-on-surface">
            {t('amount_previous')}
          </div>
          <div className="w-32 text-center font-semibold text-on-surface">
            {t('variation_amount')}
          </div>
          <div className="w-24 text-center font-semibold text-on-surface">
            {t('variation_percent')}
          </div>
        </div>

        {/* Revenue Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-on-surface border-b border-surface-container-low pb-2">
            {t('revenue')}
          </h2>
          {pnlData?.revenue_items.map(item => renderPnLItem(item, 'revenue'))}
          
          {/* Total Revenue */}
          <div className="flex items-center font-bold text-lg border-t-2 border-surface-container-low pt-2">
            <div className="w-28"></div>
            <div className="flex-1">{t('total_revenue')}</div>
            <div className="w-32 text-right text-emerald-600">
              {pnlData.total_revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-on-surface-variant">
              {(pnlData.total_revenue - pnlData.total_expenses + pnlData.net_result).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-emerald-600">
              +{(pnlData.total_revenue - (pnlData.total_revenue - pnlData.total_expenses + pnlData.net_result)).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-24 text-right text-emerald-600">
              +{((pnlData.total_revenue / (pnlData.total_revenue - pnlData.total_expenses + pnlData.net_result) - 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Expense Section */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-bold text-on-surface border-b border-surface-container-low pb-2">
            {t('expenses')}
          </h2>
          {pnlData?.expense_items.map(item => renderPnLItem(item, 'expense'))}
          
          {/* Total Expenses */}
          <div className="flex items-center font-bold text-lg border-t-2 border-surface-container-low pt-2">
            <div className="w-28"></div>
            <div className="flex-1">{t('total_expenses')}</div>
            <div className="w-32 text-right text-error">
              {pnlData.total_expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-on-surface-variant">
              {(pnlData.total_expenses - pnlData.total_revenue + pnlData.net_result).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-error">
              +{(pnlData.total_expenses - (pnlData.total_expenses - pnlData.total_revenue + pnlData.net_result)).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-24 text-right text-error">
              +{((pnlData.total_expenses / (pnlData.total_expenses - pnlData.total_revenue + pnlData.net_result) - 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Net Result */}
        <div className="mt-8 pt-4 border-t-2 border-surface-container-low">
          <div className="flex items-center font-bold text-xl">
            <div className="w-28"></div>
            <div className="flex-1">{t('net_result')}</div>
            <div className={`w-32 text-right ${
              pnlData.net_result > 0 ? 'text-emerald-600' : 'text-error'
            }`}>
              {pnlData.net_result.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-on-surface-variant">
              {pnlData.net_result_previous.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className={`w-32 text-right ${
              pnlData.net_result - pnlData.net_result_previous > 0 ? 'text-emerald-600' : 'text-error'
            }`}>
              {(pnlData.net_result - pnlData.net_result_previous > 0 ? '+' : '')}{(pnlData.net_result - pnlData.net_result_previous).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className={`w-24 text-right ${
              ((pnlData.net_result / pnlData.net_result_previous - 1) * 100) > 0 ? 'text-emerald-600' : 'text-error'
            }`}>
              {((pnlData.net_result / pnlData.net_result_previous - 1) * 100) > 0 && '+'}
              {((pnlData.net_result / pnlData.net_result_previous - 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="mt-6 pt-4 border-t border-surface-container-low">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-on-surface-variant mb-2">{t('profit_margin')}</p>
              <Badge variant={pnlData.net_result > 0 ? 'success' : 'error'} className="text-sm">
                {((pnlData.net_result / pnlData.total_revenue) * 100).toFixed(2)}%
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
