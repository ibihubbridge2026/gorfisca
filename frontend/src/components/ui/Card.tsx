import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'surface'
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseStyles = 'rounded-lg transition-all duration-200'
    
    const variants = {
      default: 'bg-surface-container-lowest shadow-sm',
      glass: 'bg-surface-container-lowest/80 backdrop-blur-md shadow-glass border border-outline-variant/10',
      elevated: 'bg-surface-container-lowest shadow-glass-lg',
      surface: 'bg-surface-container-low'
    }
    
    return (
      <div
        className={cn(baseStyles, variants[variant], className)}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pb-4', className)} {...props} />
  )
)

CardHeader.displayName = 'CardHeader'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-4 border-t border-surface-container-low/50', className)} {...props} />
  )
)

CardFooter.displayName = 'CardFooter'
