'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  Clock, 
  CheckCircle, 
  Edit, 
  AlertCircle,
  Bot,
  User
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface ValidationBadgeProps {
  source: 'manual' | 'api' | 'ai_suggestion'
  is_validated: boolean
  validated_by?: string
  validated_at?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ValidationBadge({ 
  source, 
  is_validated, 
  validated_by, 
  validated_at, 
  size = 'sm',
  showLabel = true 
}: ValidationBadgeProps) {
  const t = useTranslations('accounting')

  const getValidationStatus = () => {
    if (source === 'ai_suggestion') {
      if (is_validated) {
        return {
          variant: 'success' as const,
          label: 'Validée',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: CheckCircle,
          description: `Validée par ${validated_by || 'utilisateur'}`
        }
      } else {
        return {
          variant: 'warning' as const,
          label: 'Suggestion IA',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          icon: Clock,
          description: 'En attente de validation humaine'
        }
      }
    } else if (source === 'manual') {
      return {
        variant: 'info' as const,
        label: 'Saisie manuelle',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Edit,
        description: 'Saisie manuelle utilisateur'
      }
    } else {
      return {
        variant: 'default' as const,
        label: 'API',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: Bot,
        description: 'Import API automatique'
      }
    }
  }

  const status = getValidationStatus()
  const Icon = status.icon
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-2 ${status.bgColor} ${status.borderColor} border rounded-full ${sizeClasses[size]}`}
      title={status.description}
    >
      <Icon className={`${iconSizes[size]} ${status.color}`} />
      {showLabel && (
        <span className={`font-medium ${status.color}`}>
          {status.label}
        </span>
      )}
      
      {/* Additional info for AI suggestions */}
      {source === 'ai_suggestion' && !is_validated && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-1"
        >
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-amber-600">IA</span>
        </motion.div>
      )}
      
      {/* Validation info */}
      {is_validated && validated_by && (
        <div className="hidden md:flex items-center gap-1 text-xs text-emerald-600">
          <User className="w-3 h-3" />
          <span>{validated_by}</span>
        </div>
      )}
    </motion.div>
  )
}

// Enhanced version for dashboard cards
export function ValidationCard({ 
  source, 
  is_validated, 
  validated_by, 
  validated_at 
}: ValidationBadgeProps) {
  const t = useTranslations('accounting')

  const getValidationStatus = () => {
    if (source === 'ai_suggestion') {
      if (is_validated) {
        return {
          title: 'Suggestion IA Validée',
          description: `Validée par ${validated_by} le ${validated_at ? new Date(validated_at).toLocaleDateString() : ''}`,
          color: 'emerald',
          icon: CheckCircle,
          action: null
        }
      } else {
        return {
          title: 'Suggestion IA en Attente',
          description: 'Cette écriture a été générée par l\'IA et nécessite votre validation',
          color: 'amber',
          icon: AlertCircle,
          action: 'validate'
        }
      }
    } else if (source === 'manual') {
      return {
        title: 'Saisie Manuelle',
        description: 'Écriture saisie manuellement par un utilisateur',
        color: 'blue',
        icon: Edit,
        action: null
      }
    } else {
      return {
        title: 'Import API',
        description: 'Écriture importée automatiquement via API',
        color: 'purple',
        icon: Bot,
        action: null
      }
    }
  }

  const status = getValidationStatus()
  const Icon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-${status.color}-50/50 border border-${status.color}-200/50 rounded-lg`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 bg-${status.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 text-${status.color}-600`} />
        </div>
        
        <div className="flex-1">
          <h4 className={`font-semibold text-${status.color}-900 mb-1`}>
            {status.title}
          </h4>
          <p className={`text-sm text-${status.color}-700 mb-3`}>
            {status.description}
          </p>
          
          {status.action === 'validate' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-4 py-2 bg-${status.color}-600 text-white rounded-lg text-sm font-medium hover:bg-${status.color}-700 transition-colors`}
            >
              Approuver l'écriture
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
