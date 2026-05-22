'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wallet, 
  RefreshCw, 
  CreditCard, 
  Building2,
  Smartphone,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertCircle,
  Clock,
  MoreHorizontal
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BankAccount {
  id: number
  name: string
  type: 'bank' | 'mobile_money' | 'wallet'
  provider: string
  account_number: string
  balance: number
  currency: string
  last_sync: string
  is_active: boolean
  sync_status: 'synced' | 'syncing' | 'error' | 'pending'
  transactions_count: number
  unreconciled_count: number
}

export default function BankingAccountsPage() {
  const t = useTranslations('banking')
  const queryClient = useQueryClient()
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)

  // Fetch accounts with TanStack Query
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return [
        {
          id: 1,
          name: 'Compte Principal BIAO',
          type: 'bank' as const,
          provider: 'BIAO',
          account_number: '01234567890',
          balance: 2500000,
          currency: 'XOF',
          last_sync: '2026-05-21T14:30:00Z',
          is_active: true,
          sync_status: 'synced' as const,
          transactions_count: 156,
          unreconciled_count: 12
        },
        {
          id: 2,
          name: 'Orange Money',
          type: 'mobile_money' as const,
          provider: 'Orange',
          account_number: '+22507xxxxxxxx',
          balance: 450000,
          currency: 'XOF',
          last_sync: '2026-05-21T15:45:00Z',
          is_active: true,
          sync_status: 'synced' as const,
          transactions_count: 89,
          unreconciled_count: 3
        },
        {
          id: 3,
          name: 'MTN Mobile Money',
          type: 'mobile_money' as const,
          provider: 'MTN',
          account_number: '+22505xxxxxxxx',
          balance: 320000,
          currency: 'XOF',
          last_sync: '2026-05-21T12:15:00Z',
          is_active: true,
          sync_status: 'error' as const,
          transactions_count: 67,
          unreconciled_count: 8
        },
        {
          id: 4,
          name: 'Wallet Pro',
          type: 'wallet' as const,
          provider: 'Wave',
          account_number: 'WV123456789',
          balance: 180000,
          currency: 'XOF',
          last_sync: '2026-05-20T18:00:00Z',
          is_active: false,
          sync_status: 'pending' as const,
          transactions_count: 45,
          unreconciled_count: 0
        }
      ]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  // Sync account mutation
  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: number) => {
      // Simulate sync API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      return { success: true, accountId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] })
      // Show success animation
      setTimeout(() => setSelectedAccount(null), 2000)
    },
    onError: (error) => {
      console.error('Sync error:', error)
      setSelectedAccount(null)
    }
  })

  const handleSync = (accountId: number) => {
    setSelectedAccount(accountId)
    syncAccountMutation.mutate(accountId)
  }

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-6 h-6" />
      case 'mobile_money':
        return <Smartphone className="w-6 h-6" />
      case 'wallet':
        return <Wallet className="w-6 h-6" />
      default:
        return <CreditCard className="w-6 h-6" />
    }
  }

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'bank':
        return 'from-blue-500 to-blue-600'
      case 'mobile_money':
        return 'from-orange-500 to-orange-600'
      case 'wallet':
        return 'from-purple-500 to-purple-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-error" />
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return null
    }
  }

  const getSyncStatusText = (status: string) => {
    switch (status) {
      case 'synced':
        return t('synced')
      case 'syncing':
        return t('syncing')
      case 'error':
        return t('sync_error')
      case 'pending':
        return t('sync_pending')
      default:
        return t('unknown')
    }
  }

  // Loading state with Skeleton
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

        {/* Account Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-on-surface mb-2">
          {t('error_loading_accounts')}
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
            {t('accounts')}
          </h1>
          <p className="text-on-surface-variant">
            {t('accounts_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('sync_all')}
          </Button>
          <Button>
            <Wallet className="w-4 h-4 mr-2" />
            {t('add_account')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_balance')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {accounts?.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('active_accounts')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {accounts?.filter(acc => acc.is_active).length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('unreconciled')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {accounts?.reduce((sum, acc) => sum + acc.unreconciled_count, 0) || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <List className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">{t('total_transactions')}</p>
              <p className="text-lg font-semibold text-on-surface">
                {accounts?.reduce((sum, acc) => sum + acc.transactions_count, 0) || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Account Cards - NeoBank Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {accounts?.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -4 }}
              className="relative"
            >
              <Card className={`p-6 cursor-pointer transition-all duration-200 ${
                selectedAccount === account.id ? 'ring-2 ring-emerald-500 shadow-lg' : 'shadow-md hover:shadow-lg'
              }`}>
                {/* Sync Animation Overlay */}
                {selectedAccount === account.id && syncAccountMutation.isPending && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center z-10"
                  >
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-medium text-on-surface">
                        {t('syncing_account')}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Account Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getAccountColor(account.type)} flex items-center justify-center text-white`}>
                    {getAccountIcon(account.type)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={account.is_active ? 'success' : 'secondary'}>
                      {account.is_active ? t('active') : t('inactive')}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          {t('view_transactions')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t('sync_now')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="w-4 h-4 mr-2" />
                          {t('settings')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Account Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-on-surface mb-1">
                    {account.name}
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    {account.provider} • {account.account_number}
                  </p>
                </div>

                {/* Balance */}
                <div className="mb-4">
                  <p className="text-sm text-on-surface-variant mb-1">{t('balance')}</p>
                  <p className="text-2xl font-bold text-on-surface">
                    {account.balance.toLocaleString('fr-FR', { style: 'currency', currency: account.currency })}
                  </p>
                </div>

                {/* Sync Status */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {getSyncStatusIcon(account.sync_status)}
                    <span className="text-sm text-on-surface-variant">
                      {getSyncStatusText(account.sync_status)}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-on-surface-variant">
                      {t('last_sync')}
                    </p>
                    <p className="text-xs text-on-surface">
                      {format(new Date(account.last_sync), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-low">
                  <div className="text-center">
                    <p className="text-sm font-medium text-on-surface">
                      {account.transactions_count}
                    </p>
                    <p className="text-xs text-on-surface-variant">{t('transactions')}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-sm font-medium ${account.unreconciled_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {account.unreconciled_count}
                    </p>
                    <p className="text-xs text-on-surface-variant">{t('unreconciled')}</p>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleSync(account.id)}
                    disabled={syncAccountMutation.isPending}
                    className="min-w-20"
                  >
                    {syncAccountMutation.isPending && selectedAccount === account.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Success Animation */}
      <AnimatePresence>
        {syncAccountMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-900">
                    {t('sync_successful')}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {t('account_synced_successfully')}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
