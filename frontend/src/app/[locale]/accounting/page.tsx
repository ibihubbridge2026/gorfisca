'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { 
  BookOpen, 
  CheckCircle, 
  TrendingUp,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfoBadge } from '@/components/ui/Tooltip'
import { accountingService } from '@/services/api/accounting.service'

interface LocalJournalEntry {
  id: string
  number: string
  date: string
  account: string
  accountCode: string
  label: string
  debit: number
  credit: number
  class: number
}

export default function AccountingPage() {
  const { user, canCreateEntries } = useAuth()
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [journalEntries, setJournalEntries] = useState<LocalJournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch real journal entries from API
  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        setLoading(true)
        const apiEntries = await accountingService.fetchJournalEntries()
        // Map API JournalEntry -> LocalJournalEntry for the table.
        // Each API entry contains lines (debit/credit). We flatten them.
        const flat: LocalJournalEntry[] = []
        ;(apiEntries || []).forEach((entry: any) => {
          const lines = entry.lines || entry.entry_lines || []
          if (lines.length > 0) {
            lines.forEach((line: any, idx: number) => {
              const code: string = line.account?.code || line.account_code || ''
              flat.push({
                id: `${entry.id}-${idx}`,
                number: entry.entry_number || entry.number || `E-${entry.id}`,
                date: entry.entry_date || entry.date || '',
                account: line.account?.name || line.account_name || '',
                accountCode: code,
                label: line.description || entry.description || '',
                debit: Number(line.debit || 0),
                credit: Number(line.credit || 0),
                class: parseInt(code.charAt(0) || '0', 10) || 0,
              })
            })
          }
        })
        setJournalEntries(flat)
        setError('')
      } catch (err) {
        console.error('Erreur API Grand Livre:', err)
        // Cas Zéro strict : aucune donnée fictive
        setJournalEntries([])
        setError('')
      } finally {
        setLoading(false)
      }
    }

    fetchJournalEntries()
  }, [])

  const classes = [
    { id: 'all', name: 'Toutes', color: 'bg-slate-100 text-slate-700' },
    { id: 4, name: 'Clients & Fournisseurs', color: 'bg-blue-100 text-blue-700' },
    { id: 5, name: 'Banques & Caisses', color: 'bg-emerald-100 text-emerald-700' },
    { id: 6, name: 'Dépenses', color: 'bg-red-100 text-red-700' },
    { id: 7, name: 'Revenus', color: 'bg-green-100 text-green-700' }
  ]

  const filteredEntries = journalEntries.filter(entry => {
    const matchesClass = selectedClass === 'all' || entry.class === selectedClass
    const matchesSearch = entry.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.accountCode.includes(searchTerm)
    return matchesClass && matchesSearch
  })

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + entry.credit, 0)
  const isBalanced = totalDebit === totalCredit

  const formatAmount = (amount: number) => {
    return amount > 0 ? `${amount.toLocaleString()} FCFA` : '-'
  }

  return (
    <AppLayout>
      <div className="min-h-screen" style={{backgroundColor: '#F8FAFC'}}>
        <div className="p-8">
          {/* En-tête de la page */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Grand Livre & Journal Comptable
                </h1>
                <p className="text-slate-600 text-lg">
                  Registre officiel de toutes vos transactions financières, organisé selon les normes comptables africaines.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sélecteur de Classe & Filtres */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-0"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Filtres par Catégorie</h2>
              
              <div className="flex items-center gap-3">
                {canCreateEntries() && (
                  <button 
                    onClick={() => alert('Fonctionnalité de création d\'écriture en cours de développement')}
                    className="bg-emerald-500 px-4 py-2 rounded-lg text-white hover:bg-emerald-600 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle écriture
                  </button>
                )}
                
                {/* Recherche */}
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une écriture..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            {/* Boutons de filtres par Classe */}
            <div className="flex items-center gap-3 flex-wrap">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all duration-200",
                    selectedClass === cls.id 
                      ? "bg-slate-900 text-white shadow-sm" 
                      : cls.color + " hover:opacity-80"
                  )}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Tableau du Grand Livre */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border-0"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Journal des Transactions</h2>
              
              {/* Tableau */}
              {loading ? (
                <div className="space-y-3 py-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-lg"></div>
                  ))}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Aucune écriture comptable pour le moment
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Vos écritures s'afficheront ici dès que vous aurez validé vos premières réconciliations.
                  </p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-700">N° Écriture</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Compte</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-700">Libellé</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Argent Sorti (-)</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-700">Argent Entré (+)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry, index) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-slate-900">{entry.number}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-600">{entry.date}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-sm font-medium text-slate-900">{entry.account}</span>
                            <span className="text-xs text-slate-500 ml-2">({entry.accountCode})</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-slate-700">{entry.label}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "text-sm font-medium",
                            entry.debit > 0 ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {formatAmount(entry.debit)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={cn(
                            "text-sm font-medium",
                            entry.credit > 0 ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {formatAmount(entry.credit)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {/* Indicateur d'Équilibre */}
              {!loading && filteredEntries.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Total Sorti:</span>
                      <span className="ml-2 font-bold text-emerald-600">
                        {totalDebit.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Total Entré:</span>
                      <span className="ml-2 font-bold text-emerald-600">
                        {totalCredit.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-700">
                          ✓ Journal Équilibré
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-red-700">
                        ⚠ Déséquilibre détecté
                      </span>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}
