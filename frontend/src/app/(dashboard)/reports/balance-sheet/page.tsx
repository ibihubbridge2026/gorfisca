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
  Plus
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

interface BalanceSheetItem {
  id: string
  code: string
  label: string
  level: number
  amount_current: number
  amount_previous: number
  variation_percent: number
  children?: BalanceSheetItem[]
  is_parent?: boolean
}

interface BalanceSheetData {
  period_current: string
  period_previous: string
  total_assets: number
  total_liabilities: number
  total_equity: number
  assets: BalanceSheetItem[]
  liabilities: BalanceSheetItem[]
  equity: BalanceSheetItem[]
}

export default function BalanceSheetPage() {
  const t = useTranslations('reports')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_year')

  // Fetch balance sheet data
  const { data: balanceSheet, isLoading, error } = useQuery({
    queryKey: ['balance-sheet', selectedPeriod],
    queryFn: async () => {
      // Mock data - replace with actual API
      return {
        period_current: '2026',
        period_previous: '2025',
        total_assets: 12500000,
        total_liabilities: 7200000,
        total_equity: 5300000,
        assets: [
          {
            id: 'actif',
            code: 'ACTIF',
            label: 'ACTIF',
            level: 0,
            amount_current: 12500000,
            amount_previous: 11800000,
            variation_percent: 5.93,
            is_parent: true,
            children: [
              {
                id: 'actif_courant',
                code: 'ACTIF COURANT',
                label: 'Actif courant',
                level: 1,
                amount_current: 8500000,
                amount_previous: 7900000,
                variation_percent: 7.59,
                is_parent: true,
                children: [
                  {
                    id: 'classe_5',
                    code: 'Classe 5',
                    label: 'Comptes de trésorerie',
                    level: 2,
                    amount_current: 3200000,
                    amount_previous: 2800000,
                    variation_percent: 14.29,
                    is_parent: true,
                    children: [
                      {
                        id: '51',
                        code: '51',
                        label: 'Valeurs mobilières de placement',
                        level: 3,
                        amount_current: 1500000,
                        amount_previous: 1200000,
                        variation_percent: 25.00
                      },
                      {
                        id: '52',
                        code: '52',
                        label: 'Banques',
                        level: 3,
                        amount_current: 1200000,
                        amount_previous: 1100000,
                        variation_percent: 9.09
                      },
                      {
                        id: '53',
                        code: '53',
                        label: 'Caisse',
                        level: 3,
                        amount_current: 500000,
                        amount_previous: 500000,
                        variation_percent: 0.00
                      }
                    ]
                  },
                  {
                    id: 'classe_4',
                    code: 'Classe 4',
                    label: 'Comptes de tiers',
                    level: 2,
                    amount_current: 5300000,
                    amount_previous: 5100000,
                    variation_percent: 3.92,
                    is_parent: true,
                    children: [
                      {
                        id: '41',
                        code: '41',
                        label: 'Clients',
                        level: 3,
                        amount_current: 2800000,
                        amount_previous: 2600000,
                        variation_percent: 7.69
                      },
                      {
                        id: '42',
                        code: '42',
                        label: 'Fournisseurs',
                        level: 3,
                        amount_current: -1500000,
                        amount_previous: -1400000,
                        variation_percent: 7.14
                      },
                      {
                        id: '48',
                        code: '48',
                        label: 'Autres comptes de tiers',
                        level: 3,
                        amount_current: 4000000,
                        amount_previous: 3900000,
                        variation_percent: 2.56
                      }
                    ]
                  }
                ]
              },
              {
                id: 'actif_immobilise',
                code: 'ACTIF IMMOBILISÉ',
                label: 'Actif immobilisé',
                level: 1,
                amount_current: 4000000,
                amount_previous: 3900000,
                variation_percent: 2.56,
                is_parent: true,
                children: [
                  {
                    id: 'classe_2',
                    code: 'Classe 2',
                    label: 'Immobilisations corporelles',
                    level: 2,
                    amount_current: 3500000,
                    amount_previous: 3400000,
                    variation_percent: 2.94
                  },
                  {
                    id: 'classe_3',
                    code: 'Classe 3',
                    label: 'Immobilisations incorporelles',
                    level: 2,
                    amount_current: 500000,
                    amount_previous: 500000,
                    variation_percent: 0.00
                  }
                ]
              }
            ]
          }
        ],
        liabilities: [
          {
            id: 'passif',
            code: 'PASSIF',
            label: 'PASSIF',
            level: 0,
            amount_current: 7200000,
            amount_previous: 6800000,
            variation_percent: 5.88,
            is_parent: true,
            children: [
              {
                id: 'dettes_courantes',
                code: 'DETTES COURANTES',
                label: 'Dettes courantes',
                level: 1,
                amount_current: 5200000,
                amount_previous: 4900000,
                variation_percent: 6.12,
                is_parent: true,
                children: [
                  {
                    id: 'classe_4_passif',
                    code: 'Classe 4',
                    label: 'Comptes de tiers',
                    level: 2,
                    amount_current: 3200000,
                    amount_previous: 3000000,
                    variation_percent: 6.67
                  },
                  {
                    id: 'classe_5_passif',
                    code: 'Classe 5',
                    label: 'Comptes de trésorerie',
                    level: 2,
                    amount_current: 2000000,
                    amount_previous: 1900000,
                    variation_percent: 5.26
                  }
                ]
              },
              {
                id: 'dettes_long_terme',
                code: 'DETTES LONG TERME',
                label: 'Dettes à long terme',
                level: 1,
                amount_current: 2000000,
                amount_previous: 1900000,
                variation_percent: 5.26
              }
            ]
          }
        ],
        equity: [
          {
            id: 'capitaux_propres',
            code: 'CAPITAUX PROPRES',
            label: 'CAPITAUX PROPRES',
            level: 0,
            amount_current: 5300000,
            amount_previous: 5000000,
            variation_percent: 6.00,
            is_parent: true,
            children: [
              {
                id: 'classe_1',
                code: 'Classe 1',
                label: 'Comptes de ressources durables',
                level: 1,
                amount_current: 5300000,
                amount_previous: 5000000,
                variation_percent: 6.00
              }
            ]
          }
        ]
      } as BalanceSheetData
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

  const renderBalanceSheetItem = (item: BalanceSheetItem, section: 'assets' | 'liabilities' | 'equity') => {
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

          {/* Variation */}
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
              {item.children?.map(child => renderBalanceSheetItem(child, section))}
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
          {t('error_loading_balance_sheet')}
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
            {t('balance_sheet')}
          </h1>
          <p className="text-on-surface-variant">
            {t('balance_sheet_description')}
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

      {/* Period Info */}
      <Card className="p-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-on-surface-variant">{t('period_current')}</p>
              <p className="font-medium text-on-surface">{balanceSheet?.period_current}</p>
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('period_previous')}</p>
              <p className="font-medium text-on-surface">{balanceSheet?.period_previous}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Badge variant="outline" className="text-xs">
              {t('generated_on')}: {format(new Date(), 'dd MMM yyyy HH:mm', { locale: fr })}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Balance Sheet Table */}
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
          <div className="w-24 text-center font-semibold text-on-surface">
            {t('variation')}
          </div>
        </div>

        {/* Assets Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-on-surface border-b border-surface-container-low pb-2">
            {t('assets')}
          </h2>
          {balanceSheet?.assets.map(item => renderBalanceSheetItem(item, 'assets'))}
          
          {/* Total Assets */}
          <div className="flex items-center font-bold text-lg border-t-2 border-surface-container-low pt-2">
            <div className="w-28"></div>
            <div className="flex-1">{t('total_assets')}</div>
            <div className="w-32 text-right">
              {balanceSheet.total_assets.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-on-surface-variant">
              {(balanceSheet.total_assets - balanceSheet.total_liabilities + balanceSheet.total_equity).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-24 text-right text-emerald-600">
              +{((balanceSheet.total_assets / (balanceSheet.total_assets - balanceSheet.total_liabilities + balanceSheet.total_equity) - 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Liabilities + Equity Section */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-bold text-on-surface border-b border-surface-container-low pb-2">
            {t('liabilities_equity')}
          </h2>
          
          {/* Liabilities */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('liabilities')}
            </h3>
            {balanceSheet?.liabilities.map(item => renderBalanceSheetItem(item, 'liabilities'))}
            
            {/* Total Liabilities */}
            <div className="flex items-center font-semibold border-t border-surface-container-low pt-2">
              <div className="w-28"></div>
              <div className="flex-1">{t('total_liabilities')}</div>
              <div className="w-32 text-right">
                {balanceSheet.total_liabilities.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </div>
              <div className="w-32 text-right text-on-surface-variant">
                {(balanceSheet.total_liabilities - balanceSheet.total_equity + balanceSheet.total_assets).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </div>
              <div className="w-24 text-right text-amber-600">
                +{((balanceSheet.total_liabilities / (balanceSheet.total_liabilities - balanceSheet.total_equity + balanceSheet.total_assets) - 1) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Equity */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-on-surface">
              {t('equity')}
            </h3>
            {balanceSheet?.equity.map(item => renderBalanceSheetItem(item, 'equity'))}
            
            {/* Total Equity */}
            <div className="flex items-center font-semibold border-t border-surface-container-low pt-2">
              <div className="w-28"></div>
              <div className="flex-1">{t('total_equity')}</div>
              <div className="w-32 text-right">
                {balanceSheet.total_equity.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </div>
              <div className="w-32 text-right text-on-surface-variant">
                {(balanceSheet.total_equity - balanceSheet.total_assets + balanceSheet.total_liabilities).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </div>
              <div className="w-24 text-right text-emerald-600">
                +{((balanceSheet.total_equity / (balanceSheet.total_equity - balanceSheet.total_assets + balanceSheet.total_liabilities) - 1) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Total Liabilities + Equity */}
          <div className="flex items-center font-bold text-lg border-t-2 border-surface-container-low pt-2">
            <div className="w-28"></div>
            <div className="flex-1">{t('total_liabilities_equity')}</div>
            <div className="w-32 text-right">
              {(balanceSheet.total_liabilities + balanceSheet.total_equity).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-32 text-right text-on-surface-variant">
              {((balanceSheet.total_liabilities + balanceSheet.total_equity) - balanceSheet.total_assets + balanceSheet.total_liabilities + balanceSheet.total_equity).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
            </div>
            <div className="w-24 text-right text-emerald-600">
              +{(((balanceSheet.total_liabilities + balanceSheet.total_equity) / ((balanceSheet.total_liabilities + balanceSheet.total_equity) - balanceSheet.total_assets + balanceSheet.total_liabilities + balanceSheet.total_equity) - 1) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Balance Check */}
        <div className="mt-8 pt-4 border-t-2 border-surface-container-low">
          <div className="flex items-center justify-center">
            <Badge variant={balanceSheet.total_assets === balanceSheet.total_liabilities + balanceSheet.total_equity ? 'success' : 'error'} className="text-sm">
              {balanceSheet.total_assets === balanceSheet.total_liabilities + balanceSheet.total_equity ? 
                t('balanced') : t('unbalanced')
              }
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  )
}
