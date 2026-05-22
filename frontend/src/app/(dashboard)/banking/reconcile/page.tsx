'use client'

import React, { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRightLeft, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Zap
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import accountingService from '@/services/api/accounting.service'

interface BankTransaction {
  id: number
  reference: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  source: string
  account_name: string
  category?: string
}

interface JournalEntry {
  id: number
  reference: string
  date: string
  description: string
  amount: number
  status: 'pending' | 'matched' | 'created'
  account_code: string
  account_label: string
}

interface Match {
  transaction_id: number
  entry_id: number
  confidence: number
  matched_at: string
}

export default function BankingReconcilePage() {
  const t = useTranslations('banking')
  const queryClient = useQueryClient()
  
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [isMagicMatching, setIsMagicMatching] = useState(false)
  const [searchTransaction, setSearchTransaction] = useState('')
  const [searchEntry, setSearchEntry] = useState('')

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['unreconciled-transactions'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          reference: 'TXN202605210001',
          date: '2026-05-21T14:30:00Z',
          description: 'Paiement Client PRO123',
          amount: 250000,
          type: 'credit' as const,
          source: 'orange_money',
          account_name: 'Orange Money',
          category: 'Ventes'
        },
        {
          id: 2,
          reference: 'TXN202605210003',
          date: '2026-05-21T11:45:00Z',
          description: 'Transfert interne',
          amount: 50000,
          type: 'debit' as const,
          source: 'mtn_money',
          account_name: 'MTN Mobile Money'
        },
        {
          id: 3,
          reference: 'TXN202605210004',
          date: '2026-05-20T16:30:00Z',
          description: 'Abonnement logiciel SaaS',
          amount: 25000,
          type: 'debit' as const,
          source: 'wallet',
          account_name: 'Wallet Pro',
          category: 'Services'
        }
      ]
    },
    staleTime: 30 * 1000
  })

  // Fetch journal entries
  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ['pending-entries'],
    queryFn: async () => {
      // Mock data - replace with actual API
      return [
        {
          id: 1,
          reference: 'JE202605210001',
          date: '2026-05-21T14:30:00Z',
          description: 'Paiement client PRO123',
          amount: 250000,
          status: 'pending' as const,
          account_code: '411000',
          account_label: 'Clients'
        },
        {
          id: 2,
          reference: 'JE202605210002',
          date: '2026-05-21T11:45:00Z',
          description: 'Transfert vers MTN Money',
          amount: 50000,
          status: 'pending' as const,
          account_code: '521000',
          account_label: 'Banques'
        },
        {
          id: 3,
          reference: 'JE202605210003',
          date: '2026-05-20T16:30:00Z',
          description: 'Frais logiciel mensuel',
          amount: 25000,
          status: 'pending' as const,
          account_code: '623000',
          account_label: 'Services extérieurs'
        }
      ]
    },
    staleTime: 30 * 1000
  })

  // ----------------------------------------------------------------------
  // Magic Match — OHADA-aware matching engine
  // ----------------------------------------------------------------------
  // 1) For each unmatched bank transaction, find the best pending journal
  //    entry by: same amount (±1 XOF), date within ±3 days, and lexical
  //    overlap of the description (Jaccard on tokens).
  // 2) Confidence = 0.4 * amountScore + 0.3 * dateScore + 0.3 * textScore.
  // 3) Transactions with no candidate are flagged so the UI can suggest:
  //    - class 7 (Produits) for credits (money in)
  //    - class 6 (Charges) for debits (money out)
  // The same scoring shape can later be replaced by a Mistral call to the
  // backend `/api/v1/ai/assistant/magic_match/` endpoint without changing
  // the surrounding component.
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2)
    )

  const jaccard = (a: Set<string>, b: Set<string>) => {
    if (a.size === 0 || b.size === 0) return 0
    let inter = 0
    a.forEach((t) => {
      if (b.has(t)) inter += 1
    })
    return inter / (a.size + b.size - inter)
  }

  const scorePair = (tx: BankTransaction, entry: JournalEntry) => {
    const amountScore = Math.abs(tx.amount - entry.amount) <= 1 ? 1 : 0
    const dateDiff = Math.abs(
      (new Date(tx.date).getTime() - new Date(entry.date).getTime()) /
        (1000 * 60 * 60 * 24)
    )
    const dateScore = dateDiff <= 0 ? 1 : dateDiff <= 3 ? 1 - dateDiff / 4 : 0
    const textScore = jaccard(tokenize(tx.description), tokenize(entry.description))
    return 0.4 * amountScore + 0.3 * dateScore + 0.3 * textScore
  }

  const magicMatchMutation = useMutation({
    mutationFn: async () => {
      setIsMagicMatching(true)
      // Latency to keep the "AI thinking" visual feedback honest.
      await new Promise((r) => setTimeout(r, 800))

      const txs = transactions ?? []
      const ents = entries ?? []
      const result: Match[] = []
      const usedEntries = new Set<number>()

      for (const tx of txs) {
        let best: { entry: JournalEntry; score: number } | null = null
        for (const e of ents) {
          if (usedEntries.has(e.id)) continue
          const score = scorePair(tx, e)
          if (!best || score > best.score) best = { entry: e, score }
        }
        // Only auto-match when the score is convincing (>= 0.7).
        if (best && best.score >= 0.7) {
          usedEntries.add(best.entry.id)
          result.push({
            transaction_id: tx.id,
            entry_id: best.entry.id,
            confidence: Number(best.score.toFixed(2)),
            matched_at: new Date().toISOString(),
          })
        }
      }
      return result
    },
    onSuccess: (magicMatches) => {
      setMatches(prev => [...prev, ...magicMatches])
      setIsMagicMatching(false)
      
      // Show success animation
      magicMatches.forEach((match, index) => {
        setTimeout(() => {
          // Visual feedback for each match
          console.log(`Matched transaction ${match.transaction_id} with entry ${match.entry_id}`)
        }, index * 300)
      })
    },
    onError: () => {
      setIsMagicMatching(false)
    }
  })

  // Manual match mutation
  const manualMatchMutation = useMutation({
    mutationFn: async ({ transactionId, entryId }: { transactionId: number; entryId: number }) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { transaction_id: transactionId, entry_id: entryId, confidence: 1.0, matched_at: new Date().toISOString() }
    },
    onSuccess: (newMatch) => {
      setMatches(prev => [...prev, newMatch])
      setSelectedTransaction(null)
      setSelectedEntry(null)
    }
  })

  // ----------------------------------------------------------------------
  // Create entry mutation
  // ----------------------------------------------------------------------
  // For an unmatched bank transaction, build a balanced double-entry payload
  // using the OHADA suggester (class 6 charges or 7 produits + class 5 banque)
  // and persist it through the real backend with `source='ai_suggestion'` +
  // `is_validated=true`. The returned hash chain is shown in the toast.
  const createEntryMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const tx = (transactions ?? []).find((t) => t.id === transactionId)
      if (!tx) throw new Error('Transaction introuvable')

      const suggestion = suggestOhadaAccount(tx)
      // Class 5 — Trésorerie (compte banque par défaut). In a real setup we
      // would map `tx.source` (orange_money, mtn_money, …) to the dedicated
      // class 5 sub-account configured in the organization settings.
      const cashAccount = { code: '521000', label: 'Banque' }

      // Double-entry: a CREDIT bank movement = money in (debit cash, credit
      // produits). A DEBIT bank movement = money out (debit charges, credit
      // cash). We build the two balanced lines accordingly.
      const lines =
        tx.type === 'credit'
          ? [
              {
                account_code: cashAccount.code,
                account_label: cashAccount.label,
                line_type: 'debit' as const,
                amount: tx.amount,
                description: tx.description,
              },
              {
                account_code: suggestion.code,
                account_label: suggestion.label,
                line_type: 'credit' as const,
                amount: tx.amount,
                description: suggestion.reasoning,
              },
            ]
          : [
              {
                account_code: suggestion.code,
                account_label: suggestion.label,
                line_type: 'debit' as const,
                amount: tx.amount,
                description: suggestion.reasoning,
              },
              {
                account_code: cashAccount.code,
                account_label: cashAccount.label,
                line_type: 'credit' as const,
                amount: tx.amount,
                description: tx.description,
              },
            ]

      const payload: any = {
        reference: `BNK-${tx.reference}`,
        date: format(new Date(tx.date), 'yyyy-MM-dd'),
        description: tx.description,
        source: 'ai_suggestion',
        is_validated: true,
        lines,
      }
      return accountingService.createJournalEntry(payload)
    },
    onSuccess: (created: any) => {
      const shortHash = created?.hash ? `${created.hash.slice(0, 8)}…` : 'pending'
      toast.success(
        `Écriture #${created?.id} créée — Hash : ${shortHash}`,
        { duration: 6000 }
      )
      queryClient.invalidateQueries({ queryKey: ['pending-entries'] })
      queryClient.invalidateQueries({ queryKey: ['unreconciled-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Erreur lors de la création de l\'écriture'
      toast.error(message)
    },
  })

  const handleMagicMatch = () => {
    magicMatchMutation.mutate()
  }

  const handleManualMatch = () => {
    if (selectedTransaction && selectedEntry) {
      manualMatchMutation.mutate({ transactionId: selectedTransaction, entryId: selectedEntry })
    }
  }

  const handleCreateEntry = (transactionId: number) => {
    createEntryMutation.mutate(transactionId)
  }

  // ----------------------------------------------------------------------
  // OHADA-aware account suggestion for an unmatched bank transaction.
  // Heuristics match common French/African banking libellés:
  //   - DEBIT (money out) → class 6 (Charges) account.
  //   - CREDIT (money in) → class 7 (Produits) account.
  // The patterns are intentionally simple and serve as a deterministic
  // fallback before/instead of a Mistral call.
  // ----------------------------------------------------------------------
  const suggestOhadaAccount = (tx: BankTransaction): { code: string; label: string; reasoning: string } => {
    const desc = tx.description.toLowerCase()

    if (tx.type === 'debit') {
      if (/(salaire|paie|payroll)/.test(desc)) {
        return { code: '661000', label: 'Charges de personnel', reasoning: 'Libellé évoquant un salaire' }
      }
      if (/(loyer|rent|bail)/.test(desc)) {
        return { code: '622000', label: 'Locations et charges locatives', reasoning: 'Libellé évoquant un loyer' }
      }
      if (/(electric|eau|water|sde|senelec|edf)/.test(desc)) {
        return { code: '605000', label: 'Autres achats (eau, électricité)', reasoning: 'Libellé évoquant un fluide' }
      }
      if (/(saas|abonnement|software|logiciel|licence|subscription)/.test(desc)) {
        return { code: '623000', label: 'Services extérieurs (logiciels)', reasoning: 'Libellé évoquant un abonnement logiciel' }
      }
      if (/(transport|taxi|carburant|essence|fuel)/.test(desc)) {
        return { code: '624000', label: 'Transports et déplacements', reasoning: 'Libellé évoquant un transport' }
      }
      if (/(four|achat|stock)/.test(desc)) {
        return { code: '601000', label: 'Achats de marchandises', reasoning: 'Libellé évoquant un achat fournisseur' }
      }
      // Default class 6 fallback
      return { code: '628000', label: 'Autres charges externes', reasoning: 'Sortie d\'argent — classe 6 (charges) par défaut' }
    }

    // CREDIT — money in
    if (/(client|vente|sale|paiement|invoice)/.test(desc)) {
      return { code: '701000', label: 'Ventes de marchandises', reasoning: 'Libellé évoquant une vente client' }
    }
    if (/(prestation|service|honoraire)/.test(desc)) {
      return { code: '706000', label: 'Services vendus', reasoning: 'Libellé évoquant une prestation de service' }
    }
    if (/(subvention|grant|aide)/.test(desc)) {
      return { code: '740000', label: 'Subventions d\'exploitation', reasoning: 'Libellé évoquant une subvention' }
    }
    // Default class 7 fallback
    return { code: '708000', label: 'Produits des activités annexes', reasoning: 'Entrée d\'argent — classe 7 (produits) par défaut' }
  }

  const isTransactionMatched = (transactionId: number) => {
    return matches.some(match => match.transaction_id === transactionId)
  }

  const isEntryMatched = (entryId: number) => {
    return matches.some(match => match.entry_id === entryId)
  }

  const getMatchConfidence = (transactionId: number, entryId: number) => {
    const match = matches.find(m => m.transaction_id === transactionId && m.entry_id === entryId)
    return match?.confidence || 0
  }

  // Filter data
  const filteredTransactions = transactions?.filter(t => 
    !isTransactionMatched(t.id) &&
    (searchTransaction === '' || t.description.toLowerCase().includes(searchTransaction.toLowerCase()))
  ) || []

  const filteredEntries = entries?.filter(e => 
    !isEntryMatched(e.id) &&
    (searchEntry === '' || e.description.toLowerCase().includes(searchEntry.toLowerCase()))
  ) || []

  // Loading states
  if (transactionsLoading || entriesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            {t('reconcile')}
          </h1>
          <p className="text-on-surface-variant">
            {t('reconcile_description')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleMagicMatch}
            disabled={isMagicMatching || magicMatchMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isMagicMatching ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('magic_matching')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('magic_match')}
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Magic Match Alert */}
      <AnimatePresence>
        {magicMatchMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert variant="success">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                {t('magic_match_success', { count: magicMatchMutation.data?.length || 0 })}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Bank Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              {t('bank_transactions')}
            </h2>
            <Badge variant="secondary">
              {filteredTransactions.length} {t('unreconciled')}
            </Badge>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <Input
                type="text"
                placeholder={t('search_transactions')}
                value={searchTransaction}
                onChange={(e) => setSearchTransaction(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredTransactions.map((transaction) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedTransaction(transaction.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTransaction === transaction.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-surface-container-low hover:border-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-on-surface text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {transaction.reference}
                      </p>
                    </div>
                    <Badge 
                      variant={transaction.type === 'credit' ? 'success' : 'error'}
                      className="text-xs"
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {transaction.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-on-surface-variant">
                      {format(new Date(transaction.date), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {transaction.source}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCreateEntry(transaction.id)
                        }}
                        disabled={createEntryMutation.isPending}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t('create_entry')}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-on-surface mb-2">
                {t('all_transactions_reconciled')}
              </h3>
              <p className="text-on-surface-variant">
                {t('all_transactions_reconciled_description')}
              </p>
            </div>
          )}
        </Card>

        {/* Right: Journal Entries */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              {t('journal_entries')}
            </h2>
            <Badge variant="secondary">
              {filteredEntries.length} {t('pending')}
            </Badge>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <Input
                type="text"
                placeholder={t('search_entries')}
                value={searchEntry}
                onChange={(e) => setSearchEntry(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedEntry(entry.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedEntry === entry.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-surface-container-low hover:border-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-on-surface text-sm">
                        {entry.description}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {entry.reference}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {entry.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-on-surface-variant">
                      <p>{entry.account_code} - {entry.account_label}</p>
                      <p>{format(new Date(entry.date), 'dd MMM HH:mm', { locale: fr })}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-on-surface mb-2">
                {t('all_entries_matched')}
              </h3>
              <p className="text-on-surface-variant">
                {t('all_entries_matched_description')}
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Match Actions */}
      {selectedTransaction && selectedEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <Card className="p-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <p className="font-medium text-on-surface">
                  {t('match_confirmation')}
                </p>
                <p className="text-on-surface-variant">
                  {transactions?.find(t => t.id === selectedTransaction)?.description} → {' '}
                  {entries?.find(e => e.id === selectedEntry)?.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTransaction(null)
                    setSelectedEntry(null)
                  }}
                >
                  {t('cancel')}
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleManualMatch}
                  disabled={manualMatchMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {manualMatchMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  {t('match')}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Recent Matches */}
      {matches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-4">
            {t('recent_matches')}
          </h3>
          
          <div className="space-y-2">
            <AnimatePresence>
              {matches.slice(-5).reverse().map((match, index) => (
                <motion.div
                  key={`${match.transaction_id}-${match.entry_id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        {transactions?.find(t => t.id === match.transaction_id)?.description}
                      </p>
                      <p className="text-xs text-emerald-700">
                        → {entries?.find(e => e.id === match.entry_id)?.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs">
                      {Math.round(match.confidence * 100)}% {t('confidence')}
                    </Badge>
                    <p className="text-xs text-emerald-600">
                      {format(new Date(match.matched_at), 'HH:mm:ss', { locale: fr })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}
    </div>
  )
}
