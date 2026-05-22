'use client'

import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ReconcileRibbon } from '@/components/ui/StatusBadge'
import { Spinner, LoadingCard, LoadingTable } from '@/components/ui/Spinner'
import { Account } from '@/types/accounting'
import { formatCurrency } from '@/lib/utils'
import { Download, Plus, TrendingUp, Wallet, PieChart } from 'lucide-react'
import accountingService from '@/services/api/accounting.service'

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch accounts from API
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const data = await accountingService.fetchAccounts()
        setAccounts(data)
      } catch (err) {
        console.error('Error fetching accounts:', err)
        setError('Erreur lors du chargement des comptes')
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Calculate totals
  const totalAssets = accounts
    .filter(account => account.account_type === 'asset')
    .reduce((sum, account) => sum + account.balance, 0)
  
  const totalLiabilities = accounts
    .filter(account => account.account_type === 'liability')
    .reduce((sum, account) => sum + Math.abs(account.balance), 0)
  
  const totalEquity = accounts
    .filter(account => account.account_type === 'equity')
    .reduce((sum, account) => sum + Math.abs(account.balance), 0)

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header Loading */}
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="h-4 bg-surface-container-low rounded w-32"></div>
              <div className="h-8 bg-surface-container-low rounded w-48"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-surface-container-low rounded-full w-24"></div>
              <div className="h-10 bg-primary rounded-full w-32"></div>
            </div>
          </div>

          {/* Summary Cards Loading */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-5">
              <LoadingCard />
            </div>
            <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-6">
              <LoadingCard />
              <LoadingCard />
            </div>
          </div>

          {/* Table Loading */}
          <Card>
            <CardContent className="p-8">
              <LoadingTable rows={8} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-error font-medium">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-primary'
      case 'liability': return 'bg-tertiary'
      case 'equity': return 'bg-secondary'
      case 'revenue': return 'bg-emerald-500'
      case 'expense': return 'bg-red-500'
      default: return 'bg-slate-500'
    }
  }

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case 'asset': return 'Actif'
      case 'liability': return 'Passif'
      case 'equity': return 'Capitaux propres'
      case 'revenue': return 'Produit'
      case 'expense': return 'Charge'
      default: return type
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary/60 uppercase">
              <span>Sanctuary</span>
              <span className="text-[12px]">›</span>
              <span>Comptabilité Générale</span>
            </nav>
            <h1 className="editorial-header text-on-surface">Comptabilité</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4" />
              Nouveau Compte
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-12 gap-6">
          {/* Total Assets */}
          <Card className="col-span-12 lg:col-span-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <p className="card-header">Total Actifs</p>
                  <h3 className="hero-number text-on-surface">
                    {formatCurrency(totalAssets)}
                  </h3>
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <TrendingUp className="w-4 h-4" />
                    12.5% augmentation par rapport au trimestre dernier
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-primary">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-surface-container-low flex items-center justify-between">
                <p className="text-xs text-on-surface-variant">Prochain audit: Déc 2024</p>
                <Button variant="tertiary" size="sm">Voir Détails</Button>
              </div>
            </CardContent>
          </Card>

          {/* Liabilities & Equity */}
          <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-tertiary"></div>
              <CardContent className="p-8">
                <p className="card-header mb-4">Total Passifs</p>
                <h3 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
                  {formatCurrency(totalLiabilities)}
                </h3>
                <p className="text-xs text-tertiary font-medium mt-2">Échéance 30 jours: 45,000 FCFA</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
              <CardContent className="p-8">
                <p className="card-header mb-4">Capitaux Propres</p>
                <h3 className="text-3xl font-headline font-extrabold tracking-tight text-on-surface">
                  {formatCurrency(totalEquity)}
                </h3>
                <p className="text-xs text-on-surface-variant font-medium mt-2">Bénéfices conservés: 82%</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-container-low p-4 rounded-full">
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">Tous Comptes</Button>
            <Button variant="ghost" size="sm">Actifs</Button>
            <Button variant="ghost" size="sm">Passifs</Button>
            <Button variant="ghost" size="sm">Capitaux</Button>
            <Button variant="ghost" size="sm">Produits</Button>
          </div>
          <div className="flex items-center gap-4 pr-2">
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <PieChart className="w-4 h-4" />
              <span className="font-medium">FY 2024 - Q3</span>
            </div>
          </div>
        </div>

        {/* Chart of Accounts Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-low">
                  <th className="px-8 py-5 table-header">Code Compte</th>
                  <th className="px-8 py-5 table-header">Nom du Compte</th>
                  <th className="px-8 py-5 table-header">Catégorie</th>
                  <th className="px-8 py-5 table-header text-right">Débit</th>
                  <th className="px-8 py-5 table-header text-right">Crédit</th>
                  <th className="px-8 py-5 table-header text-right">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low/50">
                {accounts.map((account) => (
                  <tr key={account.id} className="group hover:bg-surface-container-low transition-colors duration-150">
                    <td className="px-8 py-6">
                      <span className="bg-surface-container-high text-on-surface px-3 py-1 rounded-md text-[11px] font-bold">
                        {account.code}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getAccountTypeColor(account.account_type)}`}></div>
                        <span className="font-bold text-on-surface">{account.label}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-on-surface-variant text-xs font-medium">
                        {getAccountTypeName(account.account_type)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right font-headline text-on-surface font-semibold">
                      {account.debit > 0 ? formatCurrency(account.debit) : '—'}
                    </td>
                    <td className="px-8 py-6 text-right font-headline text-on-surface-variant font-semibold">
                      {account.credit > 0 ? formatCurrency(account.credit) : '—'}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`font-headline font-bold ${
                        account.balance > 0 ? 'text-primary' : 
                        account.balance < 0 ? 'text-tertiary' : 
                        'text-on-surface-variant'
                      }`}>
                        {account.balance !== 0 ? formatCurrency(Math.abs(account.balance)) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer Action */}
        <Card className="bg-primary-container text-on-primary">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold font-headline tracking-wide">Vérification Cohérence Grand Livre</p>
                <p className="text-on-primary/80 text-sm">Débits et crédits sont parfaitement équilibrés pour FY2024-Q3.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary">Clôturer Période</Button>
              <Button className="bg-emerald-900/30 border border-white/20 text-white hover:bg-emerald-900/50">
                Vue Réconciliation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
