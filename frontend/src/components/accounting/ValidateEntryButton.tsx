'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import accountingService from '@/services/api/accounting.service'

interface ValidateEntryButtonProps {
  entryId: number
  entryReference: string
  onValidated?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function ValidateEntryButton({ 
  entryId, 
  entryReference, 
  onValidated, 
  disabled = false,
  variant = 'primary',
  size = 'md'
}: ValidateEntryButtonProps) {
  const t = useTranslations('accounting')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleValidate = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      await accountingService.validateAIEntry(entryId)
      
      // Success callback
      if (onValidated) {
        onValidated()
      }
    } catch (err: any) {
      console.error('Error validating entry:', err)
      setError(err.response?.data?.error || 'Erreur lors de la validation')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = async () => {
    if (showPreview) {
      setShowPreview(false)
      return
    }

    try {
      const entry = await accountingService.getEntry(entryId)
      // In a real implementation, you would show a modal with entry details
      console.log('Entry preview:', entry)
      setShowPreview(true)
    } catch (err: any) {
      console.error('Error fetching entry:', err)
      setError('Impossible de charger les détails de l\'écriture')
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 bg-error-container/30 rounded-lg border border-error/30"
        >
          <AlertCircle className="w-4 h-4 text-error" />
          <span className="text-sm text-error">{error}</span>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Preview Button */}
        <Button
          variant="outline"
          size={size}
          onClick={handlePreview}
          disabled={isLoading || disabled}
          className={sizeClasses[size]}
        >
          <Eye className={`${iconSizes[size]} mr-2`} />
          {showPreview ? 'Masquer' : 'Aperçu'}
        </Button>

        {/* Validate Button */}
        <motion.div
          whileHover={{ scale: isLoading || disabled ? 1 : 1.02 }}
          whileTap={{ scale: isLoading || disabled ? 1 : 0.98 }}
        >
          <Button
            variant={variant}
            size={size}
            onClick={handleValidate}
            disabled={isLoading || disabled}
            className={`${sizeClasses[size]} ${
              variant === 'primary' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className={`${iconSizes[size]} mr-2 animate-spin`} />
                Validation...
              </>
            ) : (
              <>
                <CheckCircle className={`${iconSizes[size]} mr-2`} />
                Approuver l'écriture
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Preview Content */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-surface-container-low/50 rounded-lg border border-surface-container-low"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-on-surface">
                Aperçu de l'écriture
              </h4>
              <span className="text-sm text-on-surface-variant">
                Réf: {entryReference}
              </span>
            </div>
            
            <div className="text-sm text-on-surface-variant">
              <p>Cette écriture a été générée par l'IA et nécessite votre validation avant d'être incluse dans les rapports officiels.</p>
              <p className="mt-2">
                <strong>Action:</strong> En approuvant cette écriture, vous confirmez que les informations sont correctes et que l'écriture doit être comptabilisée.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {!isLoading && !error && onValidated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200"
        >
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            Écriture validée avec succès
          </span>
        </motion.div>
      )}
    </div>
  )
}

// Compact version for table rows
export function ValidateEntryButtonCompact({ 
  entryId, 
  entryReference, 
  onValidated, 
  disabled = false
}: Omit<ValidateEntryButtonProps, 'variant' | 'size'>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      await accountingService.validateAIEntry(entryId)
      
      if (onValidated) {
        onValidated()
      }
    } catch (err: any) {
      console.error('Error validating entry:', err)
      setError(err.response?.data?.error || 'Erreur de validation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {error && (
        <div className="text-xs text-error">
          {error}
        </div>
      )}
      
      <motion.button
        whileHover={{ scale: isLoading || disabled ? 1 : 1.05 }}
        whileTap={{ scale: isLoading || disabled ? 1 : 0.95 }}
        onClick={handleValidate}
        disabled={isLoading || disabled}
        className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
          isLoading || disabled
            ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Validation...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>Approuver</span>
          </div>
        )}
      </motion.button>
    </div>
  )
}
