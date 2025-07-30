'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertToSimpleWebP, getSimpleImageDimensions, isSimpleWebPSupported, calculateSimpleResize } from '@/lib/simple-image-processing'

// Animation state machine for smooth image upload transitions
enum AnimationPhase {
  FIXED_SKELETON = 'FIXED_SKELETON',      // 0-200ms: Initial skeleton
  SMART_DIMENSIONS = 'SMART_DIMENSIONS',  // 200-400ms: Morph to image dimensions
  UPLOAD_PROGRESS = 'UPLOAD_PROGRESS',    // 400ms+: Show upload progress
  CONVERSION_PHASE = 'CONVERSION_PHASE',  // WebP conversion progress
  FINAL_MORPHING = 'FINAL_MORPHING',      // 100ms: Morph to final size
  CONTENT_REVEAL = 'CONTENT_REVEAL'       // Show processed image
}

const PHASE_DURATIONS = {
  FIXED_SKELETON: 200,
  SMART_DIMENSIONS: 200,
  FINAL_MORPHING: 100
}

interface ImagePreviewProps {
  file: File
  onRemove: () => void
  colors: {
    bg: string
    text: string
    border: string
    bgSecondary: string
    textSecondary: string
  }
  isDarkMode: boolean
  className?: string
}

interface UploadProgress {
  phase: 'uploading' | 'converting' | 'complete' | 'error'
  percentage: number
  message?: string
}

export default function ImagePreview({ 
  file, 
  onRemove, 
  colors, 
  isDarkMode,
  className = '' 
}: ImagePreviewProps) {
  // State for preview only
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [hasError, setHasError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create shimmer animation keyframes
  React.useEffect(() => {
    if (!document.getElementById('shimmer-keyframes')) {
      const style = document.createElement('style')
      style.id = 'shimmer-keyframes'
      style.textContent = `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Create image preview URL and get dimensions
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)

    const loadDimensions = async () => {
      try {
        const dimensions = await getSimpleImageDimensions(file)
        const resized = calculateSimpleResize(dimensions.width, dimensions.height, 400, 300)
        setImageDimensions(resized)
      } catch (error) {
        console.warn('Failed to get image dimensions:', error)
        setImageDimensions({ width: 300, height: 200 }) // Fallback dimensions
      }
    }

    loadDimensions()

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  // Simple preview render
  if (hasError) {
    return (
      <div
        ref={containerRef}
        className={`relative rounded border-2 overflow-hidden p-4 text-center ${className}`}
        style={{
          borderColor: colors.border,
          backgroundColor: isDarkMode ? colors.bgSecondary : '#ffffff',
          width: '300px',
          height: '200px'
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-red-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="text-sm">Failed to load image</div>
          </div>
        </div>
        <Button
          onClick={onRemove}
          className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600"
        >
          <X className="w-3 h-3 text-white" />
        </Button>
      </div>
    )
  }

  // Show image preview
  return (
    <div
      ref={containerRef}
      className={`relative rounded border-2 overflow-hidden ${className}`}
      style={{
        borderColor: colors.border,
        backgroundColor: isDarkMode ? colors.bgSecondary : '#ffffff',
        width: imageDimensions ? `${imageDimensions.width}px` : '300px',
        height: imageDimensions ? `${imageDimensions.height}px` : '200px'
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={file.name}
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-gray-500">Loading...</div>
        </div>
      )}
      
      {/* File name */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate"
      >
        {file.name}
      </div>

      {/* Remove button */}
      <Button
        onClick={onRemove}
        className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600"
      >
        <X className="w-3 h-3 text-white" />
      </Button>
    </div>
  )
}