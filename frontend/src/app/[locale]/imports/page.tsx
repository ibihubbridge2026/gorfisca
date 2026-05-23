'use client'

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload,
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Brain,
  Database,
  Lock,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import axios from 'axios'
import FileAndImageUploader from '@/components/reconciliation/FileAndImageUploader'

// Colonnes attendues (toutes normalisées en minuscules, sans espaces)
const REQUIRED_HEADER_ALIASES: Record<string, string[]> = {
  date: ['date', 'date_operation', 'date_op', 'date_transaction'],
  description: [
    'description',
    'libelle',
    'libellé',
    'label',
    'motif',
    'reference',
    'référence',
    'désignation',
    'designation',
  ],
  amount: ['amount', 'montant', 'value', 'valeur', 'somme'],
}

const normalizeHeader = (h: string) =>
  (h || '')
    .replace(/^\uFEFF/, '') // BOM
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[\s_-]+/g, '_')

function validateCsvFile(file: File): Promise<{ ok: true } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: '', // auto-detection (',' or ';' or tab)
      transformHeader: (h: string) => normalizeHeader(h),
      preview: 5, // n'analyse que les 5 premières lignes
      complete: (results) => {
        const headers = (results.meta.fields || []).map(normalizeHeader)
        const missing: string[] = []
        for (const key of Object.keys(REQUIRED_HEADER_ALIASES)) {
          const aliases = REQUIRED_HEADER_ALIASES[key].map(normalizeHeader)
          const found = headers.some((h) => aliases.includes(h))
          if (!found) missing.push(key)
        }
        if (missing.length > 0) {
          resolve({
            ok: false,
            reason: `En-têtes manquants ou non reconnus. Votre fichier doit contenir des colonnes pour la Date, le Libellé (ou Description) et le Montant (ou Amount).`,
          })
          return
        }
        if (!results.data || results.data.length === 0) {
          resolve({ ok: false, reason: 'Le fichier est vide ou ne contient aucune ligne de données.' })
          return
        }
        resolve({ ok: true })
      },
      error: (err) => {
        resolve({ ok: false, reason: `Impossible de lire le fichier CSV : ${err.message}` })
      },
    })
  })
}

interface ImportFile {
  name: string
  size: number
  type: string
  sha256?: string
}

interface MappedTransaction {
  id: string
  rawLabel: string
  ohadaAccount: string
  confidence: number
  amount: number
  date: string
}

type Step = 'upload' | 'review' | 'commit'
type UploadStatus = 'idle' | 'processing' | 'success' | 'error'

export default function ImportsPage() {
  const { user, canImportData } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [uploadedFile, setUploadedFile] = useState<ImportFile | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [mappedTransactions, setMappedTransactions] = useState<MappedTransaction[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Réinitialise complètement la zone d'upload pour permettre un nouveau drop
  const resetDropzone = useCallback(() => {
    setUploadedFile(null)
    setSelectedImage(null)
    setUploadProgress(0)
    setUploadStatus('idle')
    setError(null)
    setMappedTransactions([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Étapes du wizard
  const steps = [
    { id: 'upload', name: 'Ingestion & Sécurisation', icon: Upload },
    { id: 'review', name: 'Revue & Nettoyage IA', icon: Brain },
    { id: 'commit', name: 'Commit & Validation', icon: Database }
  ]

  // Pas de mock : les transactions mappées proviendront du backend après l'upload réel

  // Gestion du Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!canImportData()) {
      setError('Vous n\'avez pas les permissions pour importer des fichiers.')
      setUploadStatus('error')
      return
    }

    setIsProcessing(true)
    setUploadStatus('processing')
    setError(null)
    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type
    })

    // Pré-validation CSV côté client (délimiteur auto + en-têtes nettoyés)
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
      const validation = await validateCsvFile(file)
      if (!validation.ok) {
        setError(validation.reason)
        setUploadStatus('error')
        setIsProcessing(false)
        setUploadProgress(0)
        return
      }
    }

    // Simulation de la progression
    for (let i = 0; i <= 100; i += 5) {
      setUploadProgress(i)
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    try {
      // Créer FormData pour l'upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Ajouter l'image si présente
      if (selectedImage) {
        formData.append('receipt_image', selectedImage)
      }

      // Appel API réel vers l'endpoint Django
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/reconciliation/upload/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token ? `Bearer ${token}` : ''
          }
        }
      )

      // Succès - traiter la réponse enrichie avec statistiques
      const batchData = response.data.batch
      const importStats = {
        imported_rows: response.data.imported_rows || 0,
        skipped_duplicates: response.data.skipped_duplicates || 0,
        failed_rows: response.data.failed_rows || 0,
        total_processed: response.data.total_processed || 0,
        message: response.data.message || 'Importation terminée'
      }
      
      console.log('Import réussi:', batchData)
      console.log('Statistiques:', importStats)

      // Notifications toast avec détection de doublons
      if (importStats.skipped_duplicates > 0) {
        // Toast principal - succès avec avertissement de doublons
        toast.success(
          `Importation réussie : ${importStats.total_processed} transactions traitées.`,
          {
            duration: 5000,
            description: `${importStats.imported_rows} nouvelles transactions ajoutées.`
          }
        )
        
        // Toast secondaire - information sur les doublons
        toast.warning(
          `Note : ${importStats.skipped_duplicates} transactions existaient déjà en base de données et ont été fusionnées/ignorées pour éviter les doublons.`,
          {
            duration: 6000,
            icon: '⚠️'
          }
        )
      } else {
        // Toast succès simple - pas de doublons
        toast.success(
          `Importation réussie : ${importStats.imported_rows} transactions traitées.`,
          {
            duration: 4000,
            description: 'Toutes les transactions ont été ajoutées avec succès.'
          }
        )
      }

      // Récupérer les vraies transactions mappées depuis la réponse backend
      const realMapped: MappedTransaction[] = Array.isArray(response.data?.mapped_transactions)
        ? response.data.mapped_transactions
        : Array.isArray(batchData?.transactions)
        ? batchData.transactions
        : []
      setMappedTransactions(realMapped)
      setUploadStatus('success')
      
      // Debug: s'assurer que les états sont corrects
      console.log('Upload status:', 'success')
      console.log('Uploaded file:', uploadedFile)
      console.log('Is processing:', false)

    } catch (err: any) {
      console.error('Erreur upload:', err)
      setUploadStatus('error')

      // Message d'erreur utilisateur propre
      if (err.response?.status === 403) {
        setError('Vous n\'avez pas les permissions pour importer des fichiers.')
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.detail || 'Le format du fichier est incorrect ou incomplet. Vérifiez votre export Mobile Money.')
      } else {
        setError('Erreur lors de l\'import. Veuillez réessayer.')
      }
    } finally {
      setIsProcessing(false)
      setUploadProgress(0)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const proceedToReview = () => {
    // Blocage strict : on ne passe à l'étape suivante qu'en cas de succès validé
    if (uploadStatus !== 'success') {
      setError('Le fichier doit être validé avec succès avant de continuer.')
      return
    }
    setCurrentStep('review')
  }

  const proceedToCommit = () => {
    setCurrentStep('commit')
  }

  const handleCommit = async () => {
    // TODO: Connecter aux vrais endpoints Django
    console.log('Commit des transactions:', mappedTransactions)
    
    // Simulation du commit
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Redirection vers le dashboard ou page de succès
    alert('Importation réussie ! Les écritures ont été injectées dans le Grand Livre.')
  }

  const getStepIcon = (stepId: Step) => {
    const step = steps.find(s => s.id === stepId)
    return step ? step.icon : Upload
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (confidence >= 85) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 95) return 'Confiance élevée'
    if (confidence >= 85) return 'À vérifier'
    return 'Faible confiance'
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
                <Upload className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Raffinerie & Ingestion de Flux
                </h1>
                <p className="text-slate-600 text-lg">
                  Glissez vos fichiers ou connectez vos banques pour nettoyer, sécuriser (SHA-256) et mapper vos écritures au format OHADA.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stepper - Indicateur d'étapes */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm p-6 mb-8 border-0"
          >
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = currentStep === step.id
                const isCompleted = steps.findIndex(s => s.id === currentStep) > index
                const Icon = step.icon
                
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
                        isActive ? "bg-emerald-500 text-white" : 
                        isCompleted ? "bg-emerald-100 text-emerald-600" : 
                        "bg-slate-100 text-slate-400"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={cn(
                          "font-medium text-sm",
                          isActive ? "text-emerald-600" : 
                          isCompleted ? "text-slate-700" : 
                          "text-slate-400"
                        )}>
                          {step.name}
                        </p>
                        {isActive && (
                          <p className="text-xs text-emerald-500 mt-1">Étape {index + 1}/3</p>
                        )}
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "flex-1 h-px mx-4 transition-all duration-300",
                        isCompleted ? "bg-emerald-300" : "bg-slate-200"
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Contenu des étapes */}
          <AnimatePresence mode="wait">
            {/* Étape 1: Upload */}
            {currentStep === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-sm p-8 border-0"
              >
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
                    Ingestion & Sécurisation
                  </h2>
                  
                  {/* Nouveau composant d'upload double */}
                  <FileAndImageUploader
                    onFileSelected={(file) => {
                      console.log('File sélectionné dans callback:', file.name)
                      setUploadedFile({
                        name: file.name,
                        size: file.size,
                        type: file.type
                      })
                      console.log('UploadedFile mis à jour:', file.name)
                      // Lancer l'upload automatiquement quand un fichier est sélectionné
                      handleFileUpload(file)
                    }}
                    onImageSelected={(file) => {
      setSelectedImage(file)
      console.log('Image reçue dans imports/page.tsx:', file.name)
    }}
                  />
                  
                  {/* Boutons d'action après upload */}
                  {uploadedFile && (
                    <div className="mt-6 space-y-3">
                      {isProcessing && (
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-600">Traitement en cours...</span>
                            <span className="text-sm text-emerald-600">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Debug: Afficher l'état actuel */}
                      <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded">
                        Debug: isProcessing={isProcessing.toString()}, uploadStatus={uploadStatus}, hasFile={!!uploadedFile}
                        {uploadedFile && `, fileName=${uploadedFile.name}`}
                      </div>
                      
                      {/* Debug: Afficher l'état de l'image */}
                      {selectedImage && (
                        <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                          Image sélectionnée: {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)}MB)
                        </div>
                      )}
                      
                      {!isProcessing && uploadStatus === 'success' && (
                        <button
                          onClick={proceedToReview}
                          className="w-full px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 flex items-center justify-center"
                        >
                          Continuer vers la revue IA
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                      )}

                      {!isProcessing && uploadStatus === 'error' && (
                        <button
                          onClick={resetDropzone}
                          className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200 flex items-center justify-center font-medium"
                        >
                          <RefreshCw className="w-5 h-5 mr-2" />
                          Changer de fichier
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Affichage des erreurs */}
                  {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  )}

                                  </div>
              </motion.div>
            )}

            {/* Étape 2: Revue IA */}
            {currentStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-sm p-8 border-0"
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    Revue & Nettoyage IA
                  </h2>
                  <p className="text-slate-600">
                    L'IA a analysé et mappé {mappedTransactions.length} transactions au format OHADA
                  </p>
                </div>

                {/* Tableau de mapping */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Libellé brut</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Compte OHADA proposé</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Montant</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Confiance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedTransactions.map((transaction, index) => (
                        <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="text-sm text-slate-700">{transaction.rawLabel}</p>
                            <p className="text-xs text-slate-500">{transaction.date}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                              {transaction.ohadaAccount}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "text-sm font-medium",
                              transaction.amount > 0 ? "text-emerald-600" : "text-red-600"
                            )}>
                              {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} FCFA
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border",
                                getConfidenceColor(transaction.confidence)
                              )}>
                                {transaction.confidence}%
                              </span>
                              <span className="text-xs text-slate-500">
                                {getConfidenceLabel(transaction.confidence)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setCurrentStep('upload')}
                    className="px-6 py-3 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors duration-200 flex items-center"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Retour
                  </button>
                  <button
                    onClick={proceedToCommit}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 flex items-center"
                  >
                    Continuer vers la validation
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Étape 3: Commit */}
            {currentStep === 'commit' && (
              <motion.div
                key="commit"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-sm p-8 border-0"
              >
                <div className="max-w-2xl mx-auto text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Database className="w-8 h-8 text-emerald-600" />
                  </div>
                  
                  <h2 className="text-2xl font-semibold text-slate-900 mb-4">
                    Commit & Validation
                  </h2>
                  
                  <p className="text-slate-600 mb-8">
                    Prêt à injecter {mappedTransactions.length} écritures dans le Grand Livre OHADA
                  </p>

                  {/* Résumé */}
                  <div className="bg-slate-50 rounded-xl p-6 mb-8">
                    <h3 className="font-medium text-slate-700 mb-4">Résumé de l'importation</h3>
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div>
                        <p className="text-sm text-slate-500">Fichier source</p>
                        <p className="font-medium text-slate-700">{uploadedFile?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Nombre de transactions</p>
                        <p className="font-medium text-slate-700">{mappedTransactions.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Total débit</p>
                        <p className="font-medium text-slate-700">
                          {mappedTransactions
                            .filter(t => t.amount < 0)
                            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                            .toLocaleString()} FCFA
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Total crédit</p>
                        <p className="font-medium text-slate-700">
                          {mappedTransactions
                            .filter(t => t.amount > 0)
                            .reduce((sum, t) => sum + t.amount, 0)
                            .toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Validation */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8">
                    <div className="flex items-center justify-center">
                      <Lock className="w-5 h-5 text-emerald-600 mr-2" />
                      <p className="text-sm text-emerald-800">
                        Cette action est irréversible. Les écritures seront validées et injectées dans le Grand Livre.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentStep('review')}
                      className="px-6 py-3 bg-white text-slate-700 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors duration-200 flex items-center"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Retour
                    </button>
                    <button
                      onClick={handleCommit}
                      className="px-8 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors duration-200 flex items-center font-medium"
                    >
                      <Database className="w-5 h-5 mr-2" />
                      Valider et Injecter dans le Grand Livre
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  )
}
