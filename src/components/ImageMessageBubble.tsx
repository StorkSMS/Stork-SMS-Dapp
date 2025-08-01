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
      file_data?: string
    }
  }
  onImageClick?: (imageUrl: string) => void
  onRetry?: () => void
  isDarkMode?: boolean
  isOwnMessage?: boolean
}

export default function ImageMessageBubble({
  message,
  onImageClick,
  onRetry,
  isDarkMode = false,
  isOwnMessage = false
}: ImageMessageBubbleProps) {
  // Check what image sources we have available
  const hasBase64Data = !!message.metadata?.file_data
  const hasRemoteUrl = !!(message.file_url || message.metadata?.thumbnail_url)
  const hasAnyImageSource = hasBase64Data || hasRemoteUrl
  
  // For base64 data, we can show immediately without loading state
  // For sender's own messages, ALWAYS show immediately (never loading state)
  const shouldShowImmediately = hasBase64Data || isOwnMessage
  const [imageLoaded, setImageLoaded] = useState(shouldShowImmediately)
  const [imageError, setImageError] = useState(false)

  // Show placeholder ONLY for recipient messages without image sources
  // NEVER show placeholder for sender's own messages
  const shouldShowPlaceholder = !isOwnMessage && (!hasAnyImageSource || (hasRemoteUrl && !hasBase64Data && !imageLoaded && !imageError))

  // Debug: Comment out for production
  // console.log('🖼️ ImageMessageBubble Debug:', { ... })

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

  return (
    <div>
      {shouldShowPlaceholder ? (
        /* Show different placeholder based on the situation */
        <div>
          {!hasAnyImageSource ? (
            /* No image data available - show loading for own messages, error for others */
            isOwnMessage ? (
              <ImageSkeleton
                width={message.metadata?.display_width || 256}
                height={message.metadata?.display_height || 192}
                isDarkMode={isDarkMode}
              />
            ) : (
              <div 
                className="flex items-center justify-center border-2 border-red-400 bg-red-50"
                style={{ 
                  width: message.metadata?.display_width || 256,
                  height: message.metadata?.display_height || 192,
                  minHeight: '100px'
                }}
              >
                <div className="text-center p-4">
                  <div className="text-red-600 text-sm font-medium">Image Not Available</div>
                  <div className="text-red-500 text-xs mt-1">Image could not be loaded</div>
                </div>
              </div>
            )
          ) : (
            /* Loading state for remote URLs */
            <ImageSkeleton
              width={message.metadata?.display_width || 256}
              height={message.metadata?.display_height || 192}
              isDarkMode={isDarkMode}
            />
          )}
        </div>
      ) : (
        /* Loaded image with solid black border */
        <div className="relative">
          {hasAnyImageSource ? (
            <img 
              src={message.metadata?.file_data || message.metadata?.thumbnail_url || message.file_url}
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
          ) : (
            /* No image source but we're showing immediately - show placeholder for sender */
            <div 
              className="flex items-center justify-center border-2 bg-gray-100"
              style={{ 
                width: message.metadata?.display_width || 256,
                height: message.metadata?.display_height || 192,
                minHeight: '100px',
                borderColor: '#000000'
              }}
            >
              <div className="text-center p-4">
                <div className="text-gray-600 text-sm">📷</div>
                <div className="text-gray-500 text-xs mt-1">Image</div>
              </div>
            </div>
          )}
          
          {/* Upload progress overlay - only show if we have an actual image */}
          {hasAnyImageSource && message.metadata?.uploading && (
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

      {/* Hidden preload image to trigger onLoad event - only for remote URLs when not showing immediately */}
      {hasRemoteUrl && !hasBase64Data && !imageLoaded && !imageError && (
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