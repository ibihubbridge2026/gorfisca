import React from 'react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className={cn('animate-spin', sizes[size], className)}>
      <svg 
        className="w-full h-full text-primary" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        ></circle>
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  )
}

// Loading Card Component
interface LoadingCardProps {
  title?: string
  className?: string
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ title = "Chargement...", className }) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 space-y-4', className)}>
      <Spinner size="lg" />
      <p className="text-on-surface-variant font-medium">{title}</p>
    </div>
  )
}

// Loading Table Component
export const LoadingTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex space-x-4">
            <div className="h-4 bg-surface-container-low rounded w-20"></div>
            <div className="h-4 bg-surface-container-low rounded flex-1"></div>
            <div className="h-4 bg-surface-container-low rounded w-24"></div>
            <div className="h-4 bg-surface-container-low rounded w-20"></div>
            <div className="h-4 bg-surface-container-low rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  )
}
