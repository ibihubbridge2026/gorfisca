'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Building,
  Calculator,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import aiService, { DocumentAnalysisData, SuggestedJournalEntry } from '@/services/api/ai.service'

interface AIProposalCardProps {
  analysisData: DocumentAnalysisData
  onAccept?: (entryData: any) => void
  onReset?: () => void
}

export function AIProposalCard({ analysisData, onAccept, onReset }: AIProposalCardProps) {
  const t = useTranslations()
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedEntry, setSuggestedEntry] = useState<SuggestedJournalEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateEntry = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await aiService.suggestJournalEntry(analysisData)
      
      if (response.success && response.suggested_entry) {
        setSuggestedEntry(response.suggested_entry)
      } else {
        setError(response.error || 'Erreur lors de la génération de l\'écriture')
      }
    } catch (err: any) {
      console.error('Error generating entry:', err)
      setError(err.response?.data?.error || 'Erreur lors de la génération de l\'écriture')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAcceptProposal = () => {
    if (suggestedEntry && onAccept) {
      onAccept(suggestedEntry)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600'
    if (confidence >= 0.6) return 'text-amber-600'
    return 'text-red-600'
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return { variant: 'success' as const, label: 'Élevée' }
    if (confidence >= 0.6) return { variant: 'warning' as const, label: 'Moyenne' }
    return { variant: 'error' as const, label: 'Faible' }
  }

  return (
    <div className="space-y-4">
      {/* Extracted Information */}
      <Card variant="elevated" className="bg-emerald-50/30 border-emerald-200/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h4 className="font-medium text-on-surface">Informations extraites</h4>
            {analysisData.confidence && (
              <div className="ml-auto">
                <StatusBadge {...getConfidenceBadge(analysisData.confidence)}>
                  Confiance: {Math.round(analysisData.confidence * 100)}%
                </StatusBadge>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Date */}
            {analysisData.date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-sm text-on-surface-variant">Date</span>
                </div>
                <span className="text-sm font-medium text-on-surface">
                  {formatDate(analysisData.date)}
                </span>
              </div>
            )}

            {/* Supplier */}
            {analysisData.supplier && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-sm text-on-surface-variant">Fournisseur</span>
                </div>
                <span className="text-sm font-medium text-on-surface">
                  {analysisData.supplier}
                </span>
              </div>
            )}

            {/* Amounts */}
            <div className="space-y-2">
              {analysisData.amount_ttc && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-on-surface-variant" />
                    <span className="text-sm text-on-surface-variant">Montant TTC</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(analysisData.amount_ttc)}
                  </span>
                </div>
              )}

              {analysisData.amount_ht && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-on-surface-variant" />
                    <span className="text-sm text-on-surface-variant">Montant HT</span>
                  </div>
                  <span className="text-sm font-medium text-on-surface">
                    {formatCurrency(analysisData.amount_ht)}
                  </span>
                </div>
              )}

              {analysisData.vat_amount && analysisData.vat_rate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-on-surface-variant" />
                    <span className="text-sm text-on-surface-variant">TVA ({analysisData.vat_rate}%)</span>
                  </div>
                  <span className="text-sm font-medium text-on-surface">
                    {formatCurrency(analysisData.vat_amount)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {analysisData.description && (
              <div className="pt-2 border-t border-emerald-200/30">
                <p className="text-sm text-on-surface-italic">
                  "{analysisData.description}"
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suggested Accounts */}
      {analysisData.suggested_accounts && analysisData.suggested_accounts.length > 0 && (
        <Card variant="elevated">
          <CardContent className="p-4">
            <h4 className="font-medium text-on-surface mb-3">Comptes suggérés</h4>
            <div className="space-y-2">
              {analysisData.suggested_accounts.map((account, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 bg-surface-container-low rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
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
                    <p className={`text-xs font-medium ${getConfidenceColor(account.confidence)}`}>
                      {Math.round(account.confidence * 100)}%
                    </p>
                    {account.reasoning && (
                      <p className="text-xs text-on-surface-variant max-w-32 truncate">
                        {account.reasoning}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card variant="elevated" className="bg-error-container">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error mt-0.5" />
              <div>
                <h4 className="font-medium text-error mb-1">Erreur</h4>
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!suggestedEntry ? (
          <Button
            variant="primary"
            onClick={handleGenerateEntry}
            disabled={isGenerating}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Générer l'écriture
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleAcceptProposal}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Valider la proposition
          </Button>
        )}
        
        <Button
          variant="secondary"
          onClick={onReset}
          disabled={isGenerating}
        >
          Réinitialiser
        </Button>
      </div>

      {/* Suggested Entry Preview */}
      {suggestedEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card variant="elevated" className="bg-emerald-50/30 border-emerald-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h4 className="font-medium text-on-surface">Écriture suggérée</h4>
                <div className="ml-auto">
                  <StatusBadge 
                    variant={suggestedEntry.is_balanced ? 'success' : 'error'}
                  >
                    {suggestedEntry.is_balanced ? 'Équilibrée' : 'Non équilibrée'}
                  </StatusBadge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Référence:</span>
                  <span className="font-medium text-on-surface">
                    {suggestedEntry.reference || 'AUTO'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Date:</span>
                  <span className="font-medium text-on-surface">
                    {formatDate(suggestedEntry.date)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Description:</span>
                  <span className="font-medium text-on-surface">
                    {suggestedEntry.description}
                  </span>
                </div>
              </div>

              {/* Journal Lines */}
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-medium text-on-surface mb-2">Lignes d'écriture:</h5>
                {suggestedEntry.lines.map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 bg-surface-container-low rounded"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        line.line_type === 'debit' ? 'bg-red-500' : 'bg-blue-500'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          {line.account_code}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {line.account_label}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-on-surface">
                        {formatCurrency(line.amount)}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {line.line_type === 'debit' ? 'Débit' : 'Crédit'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-3 border-t border-emerald-200/30 flex justify-between">
                <div>
                  <p className="text-sm text-on-surface-variant">Total Débit:</p>
                  <p className="font-bold text-on-surface">
                    {formatCurrency(suggestedEntry.total_debit)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-on-surface-variant">Total Crédit:</p>
                  <p className="font-bold text-on-surface">
                    {formatCurrency(suggestedEntry.total_credit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
