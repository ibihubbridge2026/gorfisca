'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Filter, 
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Building2,
  CreditCard,
  Wallet,
  Calendar,
  MoreHorizontal
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
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

interface BankTransaction {
  id: number
  reference: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  status: 'reconciled' | 'pending' | 'error'
  source: 'orange_money' | 'mtn_money' | 'bank' | 'wallet'
  account_name: string
  account_number: string
  category?: string
  metadata?: Record<string, any>
}

export default function BankingTransactionsPage() {
  const t = useTranslations('banking')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7d')

  // Fetch transactions with TanStack Query
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['bank-transactions', { source: selectedSource, status: selectedStatus, dateRange }],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        {
          id: 1,
          reference: 'TXN202605210001',
          date: '2026-05-21T14:30:00Z',
          description: 'Paiement Client PRO123',
          amount: 250000,
          type: 'credit' as const,
          status: 'pending' as const,
          source: 'orange_money' as const,
          account_name: 'Orange Money',
          account_number: '+22507xxxxxxxx',
          category: 'Ventes'
        },
        {
          id: 2,
          reference: 'TXN202605210002',
          date: '2026-05-21T13:15:00Z',
          description: 'Achat fournisseur MAT456',
          amount: 85000,
          type: 'debit' as const,
          status: 'reconciled' as const,
          source: 'bank' as const,
          account_name: 'Compte Principal BIAO',
          account_number: '01234567890',
          category: 'Achats'
        },
        {
          id: 3,
          reference: 'TXN202605210003',
          date: '2026-05-21T11:45:00Z',
          description: 'Transfert interne',
          amount: 50000,
          type: 'debit' as const,
          status: 'pending' as const,
          source: 'mtn_money' as const,
          account_name: 'MTN Mobile Money',
          account_number: '+22505xxxxxxxx'
        },
        {
          id: 4,
          reference: 'TXN202605210004',
          date: '2026-05-20T16:30:00Z',
          description: 'Abonnement logiciel SaaS',
          amount: 25000,
          type: 'debit' as const,
          status: 'error' as const,
          source: 'wallet' as const,
          account_name: 'Wallet Pro',
          account_number: 'WV123456789',
          category: 'Services'
        },
        {
          id: 5,
          reference: 'TXN202605210005',
          date: '2026-05-20T14:20:00Z',
          description: 'Vente produits divers',
          amount: 125000,
          type: 'credit' as const,
          status: 'reconciled' as const,
          source: 'orange_money' as const,
          account_name: 'Orange Money',
          account_number: '+22507xxxxxxxx',
          category: 'Ventes'
        }
      ]
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.account_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSource = selectedSource === 'all' || transaction.source === selectedSource
      const matchesStatus = selectedStatus === 'all' || transaction.status === selectedStatus

      return matchesSearch && matchesSource && matchesStatus
    })
  }, [transactions, searchTerm, selectedSource, selectedStatus])

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'orange_money':
        return <Smartphone className="w-4 h-4 text-orange-600" />
      case 'mtn_money':
        return <Smartphone className="w-4 h-4 text-yellow-600" />
      case 'bank':
        return <Building2 className="w-4 h-4 text-blue-600" />
      case 'wallet':
        return <Wallet className="w-4 h-4 text-purple-600" />
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />
    }
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'orange_money':
        return 'Orange Money'
      case 'mtn_money':
        return 'MTN Money'
      case 'bank':
        return 'Banque'
      case 'wallet':
        return 'Wallet'
      default:
        return source
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reconciled':
        return <Badge variant="success">{t('reconciled')}</Badge>
      case 'pending':
        return <Badge variant="warning">{t('pending')}</Badge>
      case 'error':
        return <Badge variant="error">{t('error')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTransactionRowVariants = (index: number) => ({
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: index * 0.05, duration: 0.3 }
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Filters Skeleton */}
        <Card className="p-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>

        {/* Table Skeleton */}
        <Card className="p-6">
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 p-4 border border-surface-container-low rounded-lg">
                {[...Array(6)].map((_, j) => (
                  <Skeleton key={j} className="h-4" />
                ))}
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
        <AlertTriangle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_transactions')}
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
            {t('transactions')}
          </h1>
          <p className="text-on-surface-variant">
            {t('transactions_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_credits')}</p>
              <p className="text-lg font-semibold text-emerald-600">
                {filteredTransactions
                  .filter(t => t.type === 'credit')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_debits')}</p>
              <p className="text-lg font-semibold text-error">
                {filteredTransactions
                  .filter(t => t.type === 'debit')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('pending_reconciliation')}</p>
              <p className="text-lg font-semibold text-amber-600">
                {filteredTransactions.filter(t => t.status === 'pending').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('reconciled')}</p>
              <p className="text-lg font-semibold text-emerald-600">
                {filteredTransactions.filter(t => t.status === 'reconciled').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <Input
                type="text"
                placeholder={t('search_transactions')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('all_sources')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_sources')}</SelectItem>
                <SelectItem value="orange_money">Orange Money</SelectItem>
                <SelectItem value="mtn_money">MTN Money</SelectItem>
                <SelectItem value="bank">{t('bank')}</SelectItem>
                <SelectItem value="wallet">{t('wallet')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('all_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_status')}</SelectItem>
                <SelectItem value="reconciled">{t('reconciled')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="error">{t('error')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('last_7_days')}</SelectItem>
                <SelectItem value="30d">{t('last_30_days')}</SelectItem>
                <SelectItem value="90d">{t('last_90_days')}</SelectItem>
                <SelectItem value="all">{t('all_time')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Dense Transaction Table */}
      <Card className="p-6">
        <div className="space-y-1">
          <AnimatePresence>
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                {...getTransactionRowVariants(index)}
                whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                className="grid grid-cols-6 gap-4 p-3 border border-surface-container-low rounded-lg hover:shadow-sm transition-all duration-200"
              >
                {/* Transaction Info */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    {getSourceIcon(transaction.source)}
                    <span className="text-sm font-medium text-on-surface">
                      {transaction.reference}
                    </span>
                    {transaction.status === 'pending' && (
                      <Badge variant="warning" className="text-xs">
                        {t('unreconciled')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-on-surface-variant truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {transaction.account_name}
                  </p>
                </div>

                {/* Amount */}
                <div className="col-span-1 text-right">
                  <div className={`font-semibold ${
                    transaction.type === 'credit' ? 'text-emerald-600' : 'text-error'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}
                    {transaction.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {transaction.type === 'credit' ? t('credit') : t('debit')}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  {getStatusBadge(transaction.status)}
                  {transaction.category && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {transaction.category}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-on-surface-variant" />
                    <span className="text-sm text-on-surface">
                      {format(new Date(transaction.date), 'dd MMM', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {format(new Date(transaction.date), 'HH:mm', { locale: fr })}
                  </p>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        {t('view_details')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {t('reconcile')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        {t('export')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">
              {t('no_transactions_found')}
            </h3>
            <p className="text-on-surface-variant mb-4">
              {t('no_transactions_description')}
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('')
              setSelectedSource('all')
              setSelectedStatus('all')
            }}>
              {t('clear_filters')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
