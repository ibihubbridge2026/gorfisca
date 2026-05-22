'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { 
  GitBranch, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  ArrowRight,
  TrendingUp,
  Filter,
  Search,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfoBadge } from '@/components/ui/Tooltip'

interface ReconciliationMatch {
  id: string
  fluxSource: string
  amount: number
  grandLivreProposed: string
  matchScore: number
  status: 'perfect' | 'suspense' | 'manual'
  date: string
}

export default function ReconciliationPage() {
  const { user, canApproveTransactions, canImportData } = useAuth()
  const [matches, setMatches] = useState<ReconciliationMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'perfect' | 'suspense' | 'manual'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch real reconciliation matches from API
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true)
        // TODO: brancher sur le vrai endpoint quand disponible
        // const data = await reconciliationService.fetchMatches()
        // setMatches(data || [])
        setMatches([])
      } catch (err) {
        console.error('Erreur API Réconciliation:', err)
        setMatches([])
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (score >= 75) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 95) return 'Match Parfait'
    if (score >= 75) return 'Suspense'
    return 'À vérifier'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'perfect':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'suspense':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'manual':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const handleApproveAll = async () => {
    // TODO: Connecter aux vrais endpoints Django
    console.log('Approuver tous les matches par IA')
    
    // Simulation de l'approbation
    setMatches(prev => prev.map(match => ({
      ...match,
      status: 'perfect' as const,
      matchScore: 100
    })))
  }

  const handleApproveMatch = (id: string) => {
    setMatches(prev => prev.map(match => 
      match.id === id 
        ? { ...match, status: 'perfect' as const, matchScore: 100 }
        : match
    ))
  }

  const filteredMatches = matches.filter(match => {
    const matchesFilter = filter === 'all' || match.status === filter
    const matchesSearch = match.fluxSource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.grandLivreProposed.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

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
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Hub de Réconciliation IA
                </h1>
                <p className="text-slate-600 text-lg">
                  Rapprochement automatisé des flux financiers avec les écritures du Grand Livre OHADA.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Barre de Statuts & Métriques Flash */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-slate-900">{matches.length === 0 ? '—' : `${Math.round((matches.filter(m => m.status === 'perfect').length / matches.length) * 100)}%`}</span>
                </div>
                <div className="text-sm text-slate-600">Taux de Rapprochement IA</div>
              </div>

              <div className="w-px h-12 bg-slate-200 mx-8"></div>

              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1">{matches.filter(m => m.status !== 'perfect').length}</div>
                <div className="text-sm text-slate-600">Flux en attente</div>
              </div>

              <div className="w-px h-12 bg-slate-200 mx-8"></div>

              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="text-2xl font-bold text-slate-900">{matches.length === 0 ? '—' : 'maintenant'}</span>
                </div>
                <div className="text-sm text-slate-600">Dernière réconciliation</div>
              </div>
            </div>
          </motion.div>

          {/* Tableau des Correspondances */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border-0"
          >
            {/* En-tête du tableau avec filtres et actions */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">Matching Engine UI</h2>
                  <InfoBadge content="Score de confiance IA : 85%+ = approuvé automatiquement" />
                </div>
                
                {/* Actions de masse */}
                <div className="flex items-center gap-2">
                  {canImportData() && (
                    <button 
                      onClick={() => window.location.href = '/imports'}
                      className="bg-white px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Importer un flux
                    </button>
                  )}
                  {canApproveTransactions() && (
                    <button
                      onClick={handleApproveAll}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Tout approuver par IA</span>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Filtres */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un flux ou une écriture..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-400" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="all">Tous les matchs</option>
                    <option value="perfect">Matchs parfaits</option>
                    <option value="suspense">En suspense</option>
                    <option value="manual">Manuel</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tableau */}
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse h-14 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Tout est propre ! 🌟
                </h3>
                <p className="text-sm text-slate-500 max-w-md">
                  Aucun flux Mobile Money en attente de traitement. Glissez un nouveau relevé pour commencer.
                </p>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-6 font-medium text-slate-700">Flux Source</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-700">Montant</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-700">Écriture Grand Livre Proposée</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-700">Score de Match</th>
                    <th className="text-left py-3 px-6 font-medium text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match, index) => (
                    <tr key={match.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(match.status)}
                          <div>
                            <p className="text-sm font-medium text-slate-900">{match.fluxSource}</p>
                            <p className="text-xs text-slate-500">{match.date}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-slate-900">
                          {match.amount.toLocaleString()} FCFA
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-700">{match.grandLivreProposed}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                            getScoreColor(match.matchScore)
                          )}>
                            {match.matchScore}%
                          </span>
                          <span className="text-xs text-slate-500">
                            {getScoreLabel(match.matchScore)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {match.status === 'perfect' ? (
                          <button
                            onClick={() => handleApproveMatch(match.id)}
                            className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors duration-200 text-sm font-medium"
                          >
                            Approuver
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproveMatch(match.id)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors duration-200 text-sm font-medium"
                          >
                            Lier manuellement
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}
