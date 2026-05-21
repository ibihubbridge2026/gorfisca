'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Bell,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AIAlert } from '@/services/api/dashboard.service'

interface AIAlertWidgetProps {
  alert: AIAlert
  loading?: boolean
}

export function AIAlertWidget({ alert, loading }: AIAlertWidgetProps) {
  const t = useTranslations('dashboard')

  const getAlertIcon = (level?: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <AlertCircle className="w-5 h-5" />
      case 'low':
        return <Info className="w-5 h-5" />
      default:
        return <Bell className="w-5 h-5" />
    }
  }

  const getAlertColor = (level?: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'low':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getAlertBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return { variant: 'error' as const, label: 'Urgent' }
      case 'medium':
        return { variant: 'warning' as const, label: 'Attention' }
      case 'low':
        return { variant: 'success' as const, label: 'Info' }
      default:
        return { variant: 'info' as const, label: 'IA' }
    }
  }

  if (loading) {
    return (
      <Card variant="elevated" className="col-span-3">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-container-low rounded mb-4"></div>
            <div className="h-16 bg-surface-container-low rounded mb-4"></div>
            <div className="h-20 bg-surface-container-low rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const alertData = alert.success ? alert.data : null
  const alertLevel = alertData?.alert_level
  const alertColor = getAlertColor(alertLevel)
  const alertIcon = getAlertIcon(alertLevel)
  const alertBadge = getAlertBadge(alertLevel)

  return (
    <Card variant="elevated" className={`col-span-3 ${alertColor} border-opacity-50`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className={alertColor.replace('bg-', 'text-').split(' ')[0]}>
                {alertIcon}
              </div>
            </motion.div>
            <div>
              <h3 className="font-bold text-on-surface text-lg flex items-center gap-2">
                Alerte IA
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </h3>
              <p className="text-sm text-on-surface-variant">
                Analyse intelligente de vos données
              </p>
            </div>
          </div>
          <StatusBadge {...alertBadge}>
            {alertBadge.label}
          </StatusBadge>
        </div>

        {/* Alert Content */}
        {alert.success && alertData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Title and Message */}
            <div className="p-4 bg-surface-container-low/50 rounded-xl">
              <h4 className="font-bold text-on-surface mb-2 flex items-center gap-2">
                {alertIcon}
                {alertData.title}
              </h4>
              <p className="text-on-surface leading-relaxed">
                {alertData.message}
              </p>
            </div>

            {/* Recommendation */}
            {alertData.recommendation && (
              <div className="p-4 bg-surface-container-low/30 rounded-xl border-l-4 border-emerald-500">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-on-surface mb-2">Recommandation</h5>
                    <p className="text-sm text-on-surface-variant">
                      {alertData.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Priority Actions */}
            {alertData.priority_actions && alertData.priority_actions.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-on-surface flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Actions prioritaires
                </h5>
                <div className="space-y-2">
                  {alertData.priority_actions.map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg"
                    >
                      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-600">{index + 1}</span>
                      </div>
                      <p className="text-sm text-on-surface">{action}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          // Fallback alert
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-surface-container-low/50 rounded-xl">
              <h4 className="font-bold text-on-surface mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Alerte de trésorerie
              </h4>
              <p className="text-on-surface leading-relaxed">
                {alert.fallback || "Analyse en cours..."}
              </p>
            </div>

            {alert.error && (
              <div className="p-3 bg-error-container/30 rounded-lg">
                <p className="text-sm text-error">
                  Erreur IA: {alert.error}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* AI Status */}
        <div className="mt-6 pt-4 border-t border-surface-container-low/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-on-surface-variant">
                IA Mistral • Mise à jour en temps réel
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium">
                Actif
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
