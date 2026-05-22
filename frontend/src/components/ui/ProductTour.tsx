'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface ProductTourProps {
  steps: TourStep[]
  onComplete?: () => void
  className?: string
}

export default function ProductTour({ steps, onComplete, className }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  // Check if tour should be shown
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('gorfisca_tour_completed')
    if (!hasSeenTour) {
      // Delay to allow page to load
      setTimeout(() => {
        setIsVisible(true)
      }, 2000)
    }
  }, [])

  // Update position when step changes
  useEffect(() => {
    if (isVisible && steps[currentStep]) {
      const element = document.querySelector(steps[currentStep].target) as HTMLElement
      setTargetElement(element)
      
      if (element) {
        const rect = element.getBoundingClientRect()
        const scrollY = window.pageYOffset || document.documentElement.scrollTop
        
        setPosition({
          top: rect.top + scrollY,
          left: rect.left + rect.width / 2
        })

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [currentStep, isVisible, steps])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    localStorage.setItem('gorfisca_tour_completed', 'true')
    onComplete?.()
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isVisible || !steps[currentStep]) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-40 pointer-events-none"
      />

      {/* Highlight target element */}
      {targetElement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-40 pointer-events-none"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: targetElement.offsetWidth + 8,
            height: targetElement.offsetHeight + 8,
          }}
        >
          <div className="w-full h-full border-2 border-emerald-500 rounded-lg bg-emerald-500 bg-opacity-10" />
        </motion.div>
      )}

      {/* Tour bubble */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className={cn(
              "fixed z-50 w-80 bg-slate-900 text-white rounded-xl shadow-2xl border-0",
              className
            )}
            style={{
              top: position.top - 120, // Position above target
              left: Math.max(16, position.left - 320), // Ensure it doesn't go off screen
            }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-1 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>

            {/* Content */}
            <div className="p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentStep
                          ? "bg-emerald-400"
                          : index < currentStep
                          ? "bg-emerald-600"
                          : "bg-slate-600"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              {/* Title and content */}
              <h3 className="text-lg font-semibold mb-2 text-white">
                {step.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                {step.content}
              </p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm",
                    isFirstStep
                      ? "text-slate-600 cursor-not-allowed"
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Précédent
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    Passer
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    {isLastStep ? 'Terminer' : 'Suivant'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Arrow pointing to target */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <div className="w-4 h-4 bg-slate-900 rotate-45"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
