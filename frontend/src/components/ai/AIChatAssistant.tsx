'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  Bot, 
  X, 
  Upload, 
  FileText, 
  Send,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import aiService, { DocumentAnalysisResponse, DocumentAnalysisData, SuggestedJournalEntry } from '@/services/api/ai.service'
import accountingService from '@/services/api/accounting.service'
import { AIProposalCard } from './AIProposalCard'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface AIChatAssistantProps {
  onProposalAccepted?: (entryData: any) => void
}

export function AIChatAssistant({ onProposalAccepted }: AIChatAssistantProps) {
  const t = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const result = await aiService.analyzeFile(file)
      setAnalysisResult(result)
    } catch (err: any) {
      console.error('Error analyzing file:', err)
      setError(err.response?.data?.error || 'Erreur lors de l\'analyse du document')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setAnalysisResult(null)

    try {
      const result = await aiService.analyzeFile(file)
      setAnalysisResult(result)
    } catch (err: any) {
      console.error('Error analyzing file:', err)
      setError(err.response?.data?.error || 'Erreur lors de l\'analyse du document')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleProposalAccepted = async (entryData: SuggestedJournalEntry) => {
    // Build a payload matching the backend `JournalEntry` shape.
    // Source = 'ai_suggestion' + is_validated = true means the user has explicitly
    // approved the IA proposal, so it counts as an official entry.
    const reference =
      entryData.reference ||
      `AI-${format(new Date(), 'yyyyMMdd-HHmmss')}`

    const payload: any = {
      reference,
      date: entryData.date || format(new Date(), 'yyyy-MM-dd'),
      description: entryData.description,
      source: 'ai_suggestion',
      is_validated: true,
      lines: (entryData.lines || []).map((line) => ({
        account_code: line.account_code,
        account_label: line.account_label,
        line_type: line.line_type,
        amount: Number(line.amount) || 0,
        description: line.reasoning || entryData.description,
      })),
    }

    const toastId = toast.loading('Création de l\'écriture comptable...')

    try {
      const created = await accountingService.createJournalEntry(payload)

      // Success toast: show the entry id and a short hash preview if available.
      const shortHash = created.hash ? `${created.hash.slice(0, 8)}…` : 'pending'
      toast.success(
        `Écriture #${created.id} créée — Hash de sécurité : ${shortHash}`,
        { id: toastId, duration: 6000 }
      )

      // Notify parent so dashboard / journal list can refresh.
      if (onProposalAccepted) {
        onProposalAccepted(created)
      }

      // Reset and close the assistant.
      setIsOpen(false)
      setAnalysisResult(null)
    } catch (err: any) {
      console.error('Error accepting proposal:', err)
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        'Erreur lors de la validation de la proposition'
      toast.error(message, { id: toastId })
      setError(message)
    }
  }

  const resetAssistant = () => {
    setAnalysisResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 border-none text-white"
        >
          <Bot className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Sliding Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Assistant Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-96 bg-surface-container/95 backdrop-blur-xl border-l border-surface-container-low/50 z-50 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-surface-container-low/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Assistant IA</h3>
                    <p className="text-xs text-on-surface-variant">Analyse de documents comptables</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Upload Zone */}
                {!analysisResult && !isProcessing && (
                  <div>
                    <div className="mb-4">
                      <h4 className="font-medium text-on-surface mb-2">Analyser un document</h4>
                      <p className="text-sm text-on-surface-variant">
                        Glissez une facture ou un reçu, ou cliquez pour sélectionner
                      </p>
                    </div>

                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-emerald-200/50 rounded-xl p-8 text-center bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Upload className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                      <p className="font-medium text-on-surface mb-2">
                        Glissez-déposez votre document ici
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        ou cliquez pour parcourir
                      </p>
                      <div className="mt-4 text-xs text-on-surface-variant">
                        Formats supportés: PDF, JPG, PNG, TIFF, BMP
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-emerald-600 mx-auto mb-4 animate-spin" />
                    <h4 className="font-medium text-on-surface mb-2">Analyse en cours...</h4>
                    <p className="text-sm text-on-surface-variant">
                      L'IA extrait les informations comptables
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <Card variant="elevated" className="bg-error-container">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-error mt-0.5" />
                        <div>
                          <h4 className="font-medium text-error mb-1">Erreur d'analyse</h4>
                          <p className="text-sm text-error">{error}</p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={resetAssistant}
                            className="mt-3"
                          >
                            Réessayer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Analysis Result */}
                {analysisResult && analysisResult.success && analysisResult.data && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-medium text-on-surface">Analyse terminée</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetAssistant}
                        className="text-on-surface-variant"
                      >
                        Nouvelle analyse
                      </Button>
                    </div>

                    <AIProposalCard
                      analysisData={analysisResult.data}
                      onAccept={handleProposalAccepted}
                      onReset={resetAssistant}
                    />
                  </div>
                )}

                {/* Tips */}
                {!analysisResult && !isProcessing && (
                  <Card variant="elevated" className="bg-surface-container-low">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-on-surface mb-2">Conseils d'utilisation</h4>
                          <ul className="text-sm text-on-surface-variant space-y-1">
                            <li>• Utilisez des documents clairs et bien scannés</li>
                            <li>• L'IA extrait automatiquement les dates, montants et TVA</li>
                            <li>• Les comptes OHADA sont suggérés selon votre plan comptable</li>
                            <li>• Vérifiez toujours la proposition avant de valider</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
