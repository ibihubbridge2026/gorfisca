'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Plus,
  Edit,
  Eye,
  Layers
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { useQuery } from '@tanstack/react-query'
import accountingService from '@/services/api/accounting.service'

interface Account {
  id: number
  code: string
  label: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  account_class: number
  is_active: boolean
  balance?: number
  children?: Account[]
}

interface AccountClass {
  class: number
  name: string
  description: string
  color: string
  icon: React.ReactNode
  accounts: Account[]
}

export default function ChartOfAccountsPage() {
  const t = useTranslations('accounting')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7, 8]))

  // Fetch accounts with TanStack Query
  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountingService.fetchAccounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // OHADA Account Classes
  const accountClasses: AccountClass[] = [
    {
      class: 1,
      name: 'Classe 1 - Capitaux propres et emprunts',
      description: 'Ressources stables de l\'entreprise',
      color: 'text-blue-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 2,
      name: 'Classe 2 - Immobilisations',
      description: 'Biens durables de l\'entreprise',
      color: 'text-purple-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 3,
      name: 'Classe 3 - Stocks',
      description: 'Marchandises et matières premières',
      color: 'text-green-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 4,
      name: 'Classe 4 - Tiers',
      description: 'Clients, fournisseurs et autres tiers',
      color: 'text-orange-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 5,
      name: 'Classe 5 - Trésorerie',
      description: 'Disponibilités et équivalents',
      color: 'text-emerald-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 6,
      name: 'Classe 6 - Charges',
      description: 'Dépenses de l\'entreprise',
      color: 'text-red-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 7,
      name: 'Classe 7 - Produits',
      description: 'Revenus de l\'entreprise',
      color: 'text-cyan-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    },
    {
      class: 8,
      name: 'Classe 8 - Engagements hors bilan',
      description: 'Obligations futures',
      color: 'text-gray-600',
      icon: <BookOpen className="w-5 h-5" />,
      accounts: []
    }
  ]

  // Organize accounts by class
  const organizedAccounts = useMemo(() => {
    if (!accounts) return accountClasses

    return accountClasses.map(accountClass => ({
      ...accountClass,
      accounts: accounts
        .filter(account => account.account_class === accountClass.class)
        .filter(account => 
          searchTerm === '' || 
          account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          account.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.code.localeCompare(b.code))
    }))
  }, [accounts, searchTerm])

  // Filter classes with accounts
  const classesWithAccounts = organizedAccounts.filter(accountClass => 
    accountClass.accounts.length > 0 || searchTerm === ''
  )

  const toggleClassExpansion = (classNumber: number) => {
    setExpandedClasses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(classNumber)) {
        newSet.delete(classNumber)
      } else {
        newSet.add(classNumber)
      }
      return newSet
    })
  }

  const getAccountTypeColor = (type: string) => {
    const colors = {
      asset: 'text-blue-600 bg-blue-50',
      liability: 'text-purple-600 bg-purple-50',
      equity: 'text-green-600 bg-green-50',
      revenue: 'text-emerald-600 bg-emerald-50',
      expense: 'text-red-600 bg-red-50'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      asset: 'Actif',
      liability: 'Passif',
      equity: 'Capitaux propres',
      revenue: 'Produit',
      expense: 'Charge'
    }
    return labels[type as keyof typeof labels] || type
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Search Skeleton */}
        <Card className="p-4">
          <Skeleton className="h-10 w-full" />
        </Card>

        {/* Classes Skeleton */}
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-4 w-64 mb-4" />
            <div className="space-y-2">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center justify-between p-3 border border-surface-container-low rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="w-12 h-12 text-error mx-auto mb-4" />
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
            {t('chart_of_accounts')}
          </h1>
          <p className="text-on-surface-variant">
            {t('chart_of_accounts_description')}
          </p>
        </div>
        
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {t('create_account')}
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <Input
            type="text"
            placeholder={t('search_accounts_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Account Classes */}
      <div className="space-y-4">
        {classesWithAccounts.map((accountClass) => {
          const isExpanded = expandedClasses.has(accountClass.class)
          const hasAccounts = accountClass.accounts.length > 0

          return (
            <Card key={accountClass.class} className="overflow-hidden">
              {/* Class Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-surface-container-low/50 transition-colors"
                onClick={() => toggleClassExpansion(accountClass.class)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center ${accountClass.color}`}>
                      {accountClass.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-on-surface">
                        {accountClass.name}
                      </h3>
                      <p className="text-sm text-on-surface-variant">
                        {accountClass.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {hasAccounts && (
                      <Badge variant="secondary">
                        {accountClass.accounts.length} {t('accounts')}
                      </Badge>
                    )}
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounts */}
              {isExpanded && (
                <div className="border-t border-surface-container-low">
                  {hasAccounts ? (
                    <div className="divide-y divide-surface-container-low">
                      {accountClass.accounts.map((account) => (
                        <div key={account.id} className="p-4 hover:bg-surface-container-low/30 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-sm font-mono text-on-surface-variant w-12">
                                {account.code}
                              </div>
                              <div>
                                <h4 className="font-medium text-on-surface">
                                  {account.label}
                                </h4>
                                {account.balance !== undefined && (
                                  <p className="text-sm text-on-surface-variant">
                                    {t('balance')}: {account.balance.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={getAccountTypeColor(account.account_type)}
                              >
                                {getAccountTypeLabel(account.account_type)}
                              </Badge>
                              
                              <Badge variant={account.is_active ? 'success' : 'secondary'}>
                                {account.is_active ? t('active') : t('inactive')}
                              </Badge>
                              
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <BookOpen className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-on-surface mb-2">
                        {t('no_accounts_in_class')}
                      </h4>
                      <p className="text-on-surface-variant mb-4">
                        {t('no_accounts_in_class_description')}
                      </p>
                      <Button variant="ghost">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('create_first_account')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {/* No Results */}
        {classesWithAccounts.length === 0 && searchTerm !== '' && (
          <Card className="p-8 text-center">
            <Search className="w-12 h-12 text-on-surface-variant mx-auto mb-4" />
            <h3 className="text-lg font-medium text-on-surface mb-2">
              {t('no_search_results')}
            </h3>
            <p className="text-on-surface-variant mb-4">
              {t('no_search_results_description')}
            </p>
            <Button variant="ghost" onClick={() => setSearchTerm('')}>
              {t('clear_search')}
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
