import React from 'react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  className?: string
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'full', 
  className = '' 
}) => {
  const sizes = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 }
  }

  const { width, height } = sizes[size]

  if (variant === 'icon') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cercle de fond */}
        <circle cx="50" cy="50" r="45" fill="#1e3a8a"/>
        
        {/* G stylisé */}
        <path
          d="M25 30 L25 70 L40 70 L40 50 L55 50 L55 70 L75 70 L75 30 L55 30 L55 45 L40 45 L40 30 Z"
          fill="#ffffff"
        />
        
        {/* Accent orange */}
        <circle cx="75" cy="25" r="8" fill="#f97316"/>
      </svg>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cercle de fond */}
        <circle cx="50" cy="50" r="45" fill="#1e3a8a"/>
        
        {/* G stylisé */}
        <path
          d="M25 30 L25 70 L40 70 L40 50 L55 50 L55 70 L75 70 L75 30 L55 30 L55 45 L40 45 L40 30 Z"
          fill="#ffffff"
        />
        
        {/* Accent orange */}
        <circle cx="75" cy="25" r="8" fill="#f97316"/>
      </svg>
      
      <div className="flex flex-col">
        <span className="font-bold text-white" style={{ fontSize: size === 'sm' ? '14px' : size === 'md' ? '16px' : '20px' }}>
          GORFISCA
        </span>
        <span className="text-xs" style={{ color: '#f97316', fontSize: '10px' }}>
          Financial Sanctuary
        </span>
      </div>
    </div>
  )
}
