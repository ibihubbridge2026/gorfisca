import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileText, X } from 'lucide-react'

interface DragDropUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
  label?: string
  description?: string
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  accept = '.csv',
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  disabled = false,
  label = 'Glissez-déposez votre fichier ici',
  description = 'ou cliquez pour sélectionner'
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }, [disabled])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }, [])

  const handleFile = (file: File) => {
    setError(null)

    // Check file type
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('.', ''))) {
      setError(`Type de fichier non autorisé. Veuillez sélectionner un fichier ${accept}`)
      return
    }

    // Check file size
    if (file.size > maxSize) {
      setError(`Fichier trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    setSelectedFile(file)
    onFileSelect(file)
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Drag and drop area */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-primary bg-primary-container/10'
            : 'border-outline-variant hover:border-primary hover:bg-surface-container-low',
          disabled && 'opacity-50 cursor-not-allowed',
          selectedFile && 'border-primary bg-primary-container/5'
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Upload icon */}
        <div className="flex flex-col items-center space-y-4">
          <div className={cn(
            'p-4 rounded-full transition-colors',
            isDragging ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
          )}>
            <Upload className="w-6 h-6" />
          </div>

          {/* Text content */}
          <div className="space-y-2">
            <p className="font-body font-semibold text-on-surface">
              {selectedFile ? selectedFile.name : label}
            </p>
            <p className="text-sm text-on-surface-variant">
              {selectedFile ? formatFileSize(selectedFile.size) : description}
            </p>
          </div>

          {/* Remove button */}
          {selectedFile && (
            <button
              onClick={removeFile}
              className="absolute top-4 right-4 p-2 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          )}
        </div>

        {/* File icon overlay when file is selected */}
        {selectedFile && (
          <div className="absolute top-4 left-4 p-2 rounded-full bg-primary text-on-primary">
            <FileText className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-error-container text-error text-sm">
          {error}
        </div>
      )}

      {/* File info */}
      {selectedFile && !error && (
        <div className="mt-4 p-3 rounded-lg bg-surface-container-low">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-on-surface">{selectedFile.name}</span>
            </div>
            <span className="text-xs text-on-surface-variant">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
