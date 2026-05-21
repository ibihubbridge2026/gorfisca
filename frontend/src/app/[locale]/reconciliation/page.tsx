'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge, ReconcileRibbon } from '@/components/ui/StatusBadge'
import { Spinner, LoadingCard, LoadingTable } from '@/components/ui/Spinner'
import { DragDropUpload } from '@/components/ui/DragDropUpload'
import { 
  BankTransaction, 
  ReconciliationStats, 
  PotentialMatch,
  ImportBatch 
} from '@/services/api/reconciliation.service'
import reconciliationService from '@/services/api/reconciliation.service'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Upload, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Filter,
  Search,
  Refresh,
  Zap
} from 'lucide-react'

export default function ReconciliationPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [stats, setStats] = useState<ReconciliationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null)
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [transactionsData, statsData] = await Promise.all([
          reconciliationService.fetchTransactions(filters),
          reconciliationService.getReconciliationStats()
        ])
        setTransactions(transactionsData)
        setStats(statsData)
      } catch (err) {
        console.error('Error fetching reconciliation data:', err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  // Handle CSV upload
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      const batch = await reconciliationService.importCSV(file)
      
      // Refresh data
      const [transactionsData, statsData] = await Promise.all([
        reconciliationService.fetchTransactions(filters),
        reconciliationService.getReconciliationStats()
      ])
      setTransactions(transactionsData)
      setStats(statsData)
      
      // Show success message (you could add a toast here)
      console.log('Import successful:', batch)
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Erreur lors de l\'import du fichier')
    } finally {
      setUploading(false)
    }
  }

  // Handle transaction matching
  const handleMatchTransaction = async (transactionId: string, journalLineId: number) => {
    try {
      await reconciliationService.matchTransaction(transactionId, journalLineId)
      
      // Refresh data
      const [transactionsData, statsData] = await Promise.all([
        reconciliationService.fetchTransactions(filters),
        reconciliationService.getReconciliationStats()
      ])
      setTransactions(transactionsData)
      setStats(statsData)
      
      setShowMatches(false)
      setSelectedTransaction(null)
    } catch (err) {
      console.error('Error matching transaction:', err)
      setError('Erreur lors du rapprochement')
    }
  }

  // Handle auto-match
  const handleAutoMatch = async () => {
    try {
      setLoading(true)
      const result = await reconciliationService.autoMatchTransactions(80, 100)
      
      // Refresh data
      const [transactionsData, statsData] = await Promise.all([
        reconciliationService.fetchTransactions(filters),
        reconciliationService.getReconciliationStats()
      ])
      setTransactions(transactionsData)
      setStats(statsData)
      
      console.log('Auto-match result:', result)
    } catch (err) {
      console.error('Error auto-matching:', err)
      setError('Erreur lors du rapprochement automatique')
    } finally {
      setLoading(false)
    }
  }

  // Get potential matches for transaction
  const handlePotentialMatches = async (transaction: BankTransaction) => {
    try {
      const matches = await reconciliationService.getPotentialMatches(transaction.id)
      setPotentialMatches(matches)
      setSelectedTransaction(transaction)
      setShowMatches(true)
    } catch (err) {
      console.error('Error fetching potential matches:', err)
      setError('Erreur lors de la recherche de correspondances')
    }
  }

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
              <div className="h-10 bg-surface-container-low rounded-full w-32"></div>
              <div className="h-10 bg-primary rounded-full w-40"></div>
            </div>
          </div>

          {/* Stats Cards Loading */}
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <LoadingCard key={i} />
            ))}
          </div>

          {/* Upload Area Loading */}
          <Card>
            <CardContent className="p-8">
              <LoadingCard />
            </CardContent>
          </Card>

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <nav className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-primary/60 uppercase">
              <span>Sanctuary</span>
              <span className="text-[12px]">›</span>
              <span>Réconciliation</span>
            </nav>
            <h1 className="editorial-header text-on-surface">Espace de Réconciliation</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleAutoMatch}>
              <Zap className="w-4 h-4" />
              Rapprochement Auto
            </Button>
            <Button variant="primary">
              <Refresh className="w-4 h-4" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="card-header mb-2">Total Transactions</p>
                    <h3 className="text-3xl font-headline font-extrabold text-on-surface">
                      {stats.total_transactions}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-primary">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="card-header mb-2">Rapprochées</p>
                    <h3 className="text-3xl font-headline font-extrabold text-on-surface">
                      {stats.matched_transactions}
                    </h3>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      {stats.reconciliation_rate.toFixed(1)}% de taux
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-tertiary"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="card-header mb-2">En Attente</p>
                    <h3 className="text-3xl font-headline font-extrabold text-on-surface">
                      {stats.pending_transactions}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-tertiary">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-error"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="card-header mb-2">Signalées</p>
                    <h3 className="text-3xl font-headline font-extrabold text-on-surface">
                      {stats.flagged_transactions}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-error">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <h2 className="section-header">Import de Transactions</h2>
          </CardHeader>
          <CardContent>
            <DragDropUpload
              onFileSelect={handleFileUpload}
              accept=".csv"
              maxSize={10 * 1024 * 1024}
              label="Glissez-déposez votre fichier CSV ici"
              description="Format: Date, Description, Montant, Référence"
              disabled={uploading}
            />
            {uploading && (
              <div className="mt-4 flex items-center gap-2 text-primary">
                <Spinner size="sm" />
                <span className="text-sm">Import en cours...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-4 rounded-full">
          <div className="flex items-center gap-2">
            <Button 
              variant={filters.status === '' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
            >
              Toutes
            </Button>
            <Button 
              variant={filters.status === 'pending' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, status: 'pending' }))}
            >
              En Attente
            </Button>
            <Button 
              variant={filters.status === 'matched' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, status: 'matched' }))}
            >
              Rapprochées
            </Button>
            <Button 
              variant={filters.status === 'flagged' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, status: 'flagged' }))}
            >
              Signalées
            </Button>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l border-outline-variant/30">
            <Search className="w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="bg-transparent border-none focus:ring-0 text-sm w-48 placeholder:text-on-surface-variant"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-low">
                  <th className="px-8 py-5 table-header">Date</th>
                  <th className="px-8 py-5 table-header">Description</th>
                  <th className="px-8 py-5 table-header">Montant</th>
                  <th className="px-8 py-5 table-header">Référence</th>
                  <th className="px-8 py-5 table-header">Statut</th>
                  <th className="px-8 py-5 table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low/50">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="group hover:bg-surface-container-low transition-colors duration-150">
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-on-surface">
                        {formatDate(transaction.date)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="font-bold text-on-surface">{transaction.description}</p>
                        {transaction.account_code && (
                          <p className="text-xs text-on-surface-variant">
                            {transaction.account_code} - {transaction.account_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`font-headline font-bold ${
                        transaction.transaction_type === 'credit' ? 'text-primary' : 'text-tertiary'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-on-surface-variant font-mono">
                        {transaction.reference}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={transaction.status} size="sm" />
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {transaction.status === 'pending' && (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handlePotentialMatches(transaction)}
                          >
                            <ArrowRight className="w-3 h-3" />
                            Rapprocher
                          </Button>
                        )}
                        {transaction.status === 'matched' && (
                          <StatusBadge status="matched" size="sm" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Potential Matches Modal */}
        {showMatches && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="section-header">Correspondances Possibles</h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      Transaction: {selectedTransaction.description} - {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMatches(false)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {potentialMatches.length > 0 ? (
                    potentialMatches.map((match) => (
                      <div
                        key={match.journal_line_id}
                        className="p-4 border border-surface-container-low rounded-lg hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-bold text-on-surface">
                                {match.account_code} - {match.account_label}
                              </span>
                              <StatusBadge status="matched" size="sm" />
                            </div>
                            <p className="text-sm text-on-surface-variant">
                              {match.entry_description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                              <span>Écriture: {match.entry_reference}</span>
                              <span>Date: {formatDate(match.entry_date)}</span>
                              <span>Montant: {formatCurrency(match.amount)}</span>
                              <span>Confiance: {match.confidence_score}%</span>
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMatchTransaction(selectedTransaction.id, match.journal_line_id)}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Rapprocher
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-tertiary mx-auto mb-4" />
                      <p className="text-on-surface-variant">Aucune correspondance trouvée</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
