'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  Building,
  PiggyBank
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { CashAccount } from '@/services/api/dashboard.service'

interface CashRealWidgetProps {
  total: number
  breakdown: CashAccount[]
  currency: string
  loading?: boolean
}

export function CashRealWidget({ total, breakdown, currency, loading }: CashRealWidgetProps) {
  const t = useTranslations('dashboard')

  const getAccountIcon = (accountCode: string) => {
    if (accountCode.startsWith('51') || accountCode.startsWith('52')) {
      return <CreditCard className="w-4 h-4" />
    } else if (accountCode.startsWith('53')) {
      return <Building className="w-4 h-4" />
    } else if (accountCode.startsWith('54') || accountCode.startsWith('55') || accountCode.startsWith('56') || accountCode.startsWith('57') || accountCode.startsWith('58')) {
      return <PiggyBank className="w-4 h-4" />
    }
    return <Wallet className="w-4 h-4" />
  }

  const getAccountColor = (balance: number) => {
    return balance > 0 ? 'text-emerald-600' : 'text-red-600'
  }

  if (loading) {
    return (
      <Card variant="elevated" className="col-span-2 row-span-2">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-container-low rounded mb-4"></div>
            <div className="h-16 bg-surface-container-low rounded mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-surface-container-low rounded"></div>
              <div className="h-4 bg-surface-container-low rounded"></div>
              <div className="h-4 bg-surface-container-low rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="elevated" className="col-span-2 row-span-2 bg-gradient-to-br from-emerald-50/30 to-teal-50/30 border-emerald-200/50">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-on-surface text-lg">Trésorerie Réelle</h3>
              <p className="text-sm text-on-surface-variant">Classe 5 - Disponibilités</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-on-surface-variant mb-1">Total disponible</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* Total Visual */}
        <div className="mb-6 p-4 bg-surface-container-low/50 rounded-xl">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-on-surface-variant mb-2">Solde Total</p>
              <motion.p 
                className="text-4xl font-bold text-emerald-600"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {formatCurrency(total)}
              </motion.p>
              <p className="text-xs text-on-surface-variant mt-1">{currency}</p>
            </div>
          </div>
        </div>

        {/* Account Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-on-surface text-sm mb-3">Détail par compte</h4>
          {breakdown.map((account, index) => (
            <motion.div
              key={account.account_code}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-surface-container rounded-lg flex items-center justify-center ${getAccountColor(account.balance)}`}>
                  {getAccountIcon(account.account_code)}
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {account.account_code}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {account.account_label}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${getAccountColor(account.balance)}`}>
                  {formatCurrency(account.balance)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {account.balance > 0 ? 'Positif' : 'Négatif'}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-emerald-200/30 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-on-surface-variant">Comptes actifs</p>
            <p className="text-lg font-bold text-on-surface">
              {breakdown.filter(acc => acc.balance > 0).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-on-surface-variant">Solde moyen</p>
            <p className="text-lg font-bold text-on-surface">
              {formatCurrency(total / breakdown.length || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
