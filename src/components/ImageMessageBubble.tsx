import React, { useState } from 'react'
import ImageSkeleton from './ImageSkeleton'

interface ImageMessageBubbleProps {
  message: {
    id: string
    file_url?: string
    metadata?: {
      thumbnail_url?: string
      uploading?: boolean
      upload_progress?: number
      error?: string
      display_width?: number
      display_height?: number
    }
  }
  onImageClick?: (imageUrl: string) => void
  onRetry?: () => void
  isDarkMode?: boolean
}

export default function ImageMessageBubble({
  message,
  onImageClick,
  onRetry,
  isDarkMode = false
}: ImageMessageBubbleProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageClick = () => {
    if (message.file_url && onImageClick) {
      onImageClick(message.file_url)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  // Show placeholder until image is fully loaded, even if we have a file_url
  const shouldShowPlaceholder = !message.file_url || (!imageLoaded && !imageError)

  return (
    <div>
      {shouldShowPlaceholder ? (
        /* Animated skeleton loader */
        <ImageSkeleton
          width={message.metadata?.display_width || 256}
          height={message.metadata?.display_height || 192}
          isDarkMode={isDarkMode}
        />
      ) : (
        /* Loaded image with solid black border */
        <div className="relative">
          <img 
            src={message.metadata?.thumbnail_url || message.file_url}
            alt="Shared image" 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            style={{ 
              maxHeight: '300px',
              objectFit: 'contain',
              opacity: message.metadata?.uploading ? 0.7 : 1,
              border: '2px solid #000000', // Solid black border
              display: 'block' // Remove any default spacing
            }}
            onClick={handleImageClick}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Upload progress overlay */}
          {message.metadata?.uploading && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            >
              <div className="text-white text-sm">
                {message.metadata.upload_progress ? 
                  `${Math.round(message.metadata.upload_progress)}%` : 
                  'Uploading...'
                }
              </div>
            </div>
          )}
          
          {/* Error overlay */}
          {(message.metadata?.error || imageError) && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)' }}
            >
              <div className="text-red-500 text-sm text-center">
                <div>{imageError ? 'Failed to load image' : 'Upload failed'}</div>
                {onRetry && (
                  <button 
                    onClick={onRetry}
                    className="text-xs underline mt-1"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden preload image to trigger onLoad event */}
      {message.file_url && !imageLoaded && !imageError && (
        <img 
          src={message.metadata?.thumbnail_url || message.file_url}
          alt=""
          style={{ display: 'none' }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  )
}