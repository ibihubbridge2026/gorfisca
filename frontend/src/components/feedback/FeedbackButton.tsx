'use client'

import React, { useState } from 'react'
import { MessageSquare, Star, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import feedbackService from '@/services/api/feedback.service'

interface FeedbackButtonProps {
  suggestedAccount?: {
    code: string
    label: string
  }
  actualAccount?: {
    code: string
    label: string
  }
  transactionData?: {
    amount?: number
    description?: string
    date?: string
  }
  aiConfidence?: number
  aiEnabled?: boolean
  feedbackType?: 'account_suggestion' | 'magic_match' | 'document_analysis' | 'journal_entry'
  className?: string
}

export function FeedbackButton({
  suggestedAccount,
  actualAccount,
  transactionData,
  aiConfidence,
  aiEnabled = true,
  feedbackType = 'account_suggestion',
  className = ""
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [improvement, setImprovement] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setIsSubmitting(true)
    try {
      await feedbackService.createFeedback({
        feedback_type: feedbackType,
        rating,
        suggested_account_code: suggestedAccount?.code,
        suggested_account_label: suggestedAccount?.label,
        actual_account_code: actualAccount?.code,
        actual_account_label: actualAccount?.label,
        transaction_amount: transactionData?.amount,
        transaction_description: transactionData?.description,
        transaction_date: transactionData?.date,
        comment,
        improvement_suggestion: improvement,
        ai_confidence: aiConfidence,
        ai_enabled: aiEnabled
      })

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        resetForm()
      }, 2000)
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setRating(0)
    setComment('')
    setImprovement('')
    setSubmitted(false)
  }

  const StarRating = () => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          className="transition-colors"
        >
          <Star
            className={`w-6 h-6 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            }`}
          />
        </button>
      ))}
    </div>
  )

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`text-gray-500 hover:text-gray-700 ${className}`}
        title="Donner votre avis sur cette suggestion"
      >
        <MessageSquare className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Feedback sur la suggestion IA
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-600 font-medium">Merci pour votre feedback!</p>
              <p className="text-gray-500 text-sm mt-2">
                Votre avis nous aide à améliorer l'IA
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Comptes suggérés */}
              {(suggestedAccount || actualAccount) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm space-y-1">
                    {suggestedAccount && (
                      <div>
                        <span className="font-medium">Suggéré:</span>{' '}
                        <span className="text-gray-600">
                          {suggestedAccount.code} - {suggestedAccount.label}
                        </span>
                      </div>
                    )}
                    {actualAccount && (
                      <div>
                        <span className="font-medium">Utilisé:</span>{' '}
                        <span className="text-gray-600">
                          {actualAccount.code} - {actualAccount.label}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note de pertinence
                </label>
                <StarRating />
                {rating > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rating === 1 && "Très mauvais"}
                    {rating === 2 && "Mauvais"}
                    {rating === 3 && "Neutre"}
                    {rating === 4 && "Bon"}
                    {rating === 5 && "Excellent"}
                  </p>
                )}
              </div>

              {/* Commentaire */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Votre commentaire sur cette suggestion..."
                />
              </div>

              {/* Suggestion d'amélioration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment pourrions-nous améliorer? (optionnel)
                </label>
                <textarea
                  value={improvement}
                  onChange={(e) => setImprovement(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Vos suggestions pour améliorer les futures suggestions..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={rating === 0 || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
