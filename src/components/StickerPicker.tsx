'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface StickerPickerProps {
  selectedSticker: string | null
  onStickerSelect: (sticker: string | null) => void
  className?: string
  isOpen?: boolean
  onClose?: () => void
  colors?: any
  isDarkMode?: boolean
}

const STICKER_OPTIONS = [
  'Applause 1.png',
  'Bonk 1.png',
  'Envy 1.png',
  'Gib alpha 1.png',
  'Mattle 1.png',
  'Poke 1.png',
  'Rugarugruuug 1.png',
  'Stork 1.png',
  'certi jeet 1.png'
]

const STICKER_BASE_PATH = '/Nft-Build-Images/Recipient NFT/Stickers (position bottom left)'

export default function StickerPicker({
  selectedSticker,
  onStickerSelect,
  className = '',
  isOpen = false,
  onClose
}: StickerPickerProps) {
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [loadingStickers, setLoadingStickers] = useState<Set<string>>(new Set())
  const [failedStickers, setFailedStickers] = useState<Set<string>>(new Set())

  // Load sticker images
  useEffect(() => {
    const loadStickers = async () => {
      const imagePromises = STICKER_OPTIONS.map(async (stickerName) => {
        if (loadedImages.has(stickerName)) return

        setLoadingStickers(prev => new Set(prev).add(stickerName))
        
        try {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = reject
            image.src = `${STICKER_BASE_PATH}/${encodeURIComponent(stickerName)}`
          })

          setLoadedImages(prev => new Map(prev).set(stickerName, image))
          setLoadingStickers(prev => {
            const newSet = new Set(prev)
            newSet.delete(stickerName)
            return newSet
          })
        } catch (error) {
          console.warn(`Failed to load sticker ${stickerName}:`, error)
          setFailedStickers(prev => new Set(prev).add(stickerName))
          setLoadingStickers(prev => {
            const newSet = new Set(prev)
            newSet.delete(stickerName)
            return newSet
          })
        }
      })

      await Promise.all(imagePromises)
    }

    if (isOpen) {
      loadStickers()
    }
  }, [isOpen, loadedImages])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleStickerClick = (stickerName: string) => {
    if (selectedSticker === stickerName) {
      // Deselect if already selected
      onStickerSelect(null)
    } else {
      // Select new sticker
      onStickerSelect(stickerName)
    }
  }

  if (!isOpen) return null

  return (
    <div className={`sticker-picker ${className}`}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[120]"
        onClick={onClose}
      />
      
      {/* Sticker Grid Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[130] p-4">
        <div 
          className="bg-white border-4 border-black relative max-w-md w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sticker-picker-title"
          aria-describedby="sticker-picker-description"
        >
          {/* Paper texture overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'url(/Paper-Texture-7.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              mixBlendMode: 'multiply',
              opacity: 0.4
            }}
          />
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-4 border-black relative z-10">
            <h3 
              id="sticker-picker-title"
              className="text-lg font-medium"
              style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
            >
              Choose a Sticker
            </h3>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-none"
              aria-label="Close sticker picker"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Sticker Grid */}
          <div className="p-4 sm:p-6 relative z-10 overflow-y-auto max-h-[50vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {STICKER_OPTIONS.map((stickerName) => {
                const isSelected = selectedSticker === stickerName
                const isLoading = loadingStickers.has(stickerName)
                const hasFailed = failedStickers.has(stickerName)
                const image = loadedImages.get(stickerName)
                
                return (
                  <button
                    key={stickerName}
                    onClick={() => handleStickerClick(stickerName)}
                    className={`
                      relative aspect-square border-2 p-2 transition-all duration-200
                      hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-lg' 
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                      }
                    `}
                    disabled={isLoading || hasFailed}
                    aria-label={`${isSelected ? 'Selected sticker' : 'Select sticker'}: ${stickerName.replace('.png', '')}`}
                    aria-pressed={isSelected}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      </div>
                    )}
                    
                    {/* Sticker Image */}
                    {image && !isLoading && !hasFailed && (
                      <img
                        src={image.src}
                        alt={stickerName.replace('.png', '')}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    )}
                    
                    {/* Loading state */}
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                      </div>
                    )}
                    
                    {/* Failed state */}
                    {hasFailed && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <div className="text-2xl mb-1">⚠️</div>
                          <div className="text-xs">Failed to load</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-all duration-200" />
                  </button>
                )
              })}
            </div>
            
            {/* Instructions */}
            <div className="mt-4 text-center">
              <p 
                id="sticker-picker-description"
                className="text-sm text-gray-600"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
              >
                Click a sticker to select it, or click again to deselect
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t-4 border-black relative z-10">
            <div className="flex gap-2">
              <Button
                onClick={() => onStickerSelect(null)}
                variant="outline"
                className="flex-1 rounded-none border-2 border-gray-300 hover:border-gray-400"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                aria-label="Clear sticker selection"
              >
                Clear Selection
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-none border-2 border-blue-500"
                style={{ fontFamily: 'Helvetica Neue, sans-serif' }}
                aria-label="Close sticker picker"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for managing sticker state with message preservation
export function useStickerState(initialMessage: string = '') {
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [originalMessage, setOriginalMessage] = useState<string>(initialMessage)
  const [currentMessage, setCurrentMessage] = useState<string>(initialMessage)
  const [isTextFaded, setIsTextFaded] = useState<boolean>(false)
  const [isStickerHidden, setIsStickerHidden] = useState<boolean>(false)

  const handleStickerSelect = (sticker: string | null) => {
    if (sticker) {
      // Store current message as original if not already stored
      if (!originalMessage && currentMessage) {
        setOriginalMessage(currentMessage)
      }
      
      // Select sticker and fade text
      setSelectedSticker(sticker)
      setIsTextFaded(true)
      setIsStickerHidden(false) // Show sticker
    } else {
      // Deselect sticker and restore text
      setSelectedSticker(null)
      setIsTextFaded(false)
      setIsStickerHidden(false)
      
      // Restore original message if it exists
      if (originalMessage) {
        setCurrentMessage(originalMessage)
      }
    }
  }

  const handleMessageChange = (message: string) => {
    setCurrentMessage(message)
    
    // If no sticker is selected, update original message too to keep them in sync
    if (!selectedSticker) {
      setOriginalMessage(message)
    }
    // If sticker is selected and we don't have an original message yet, store the current one
    else if (selectedSticker && !originalMessage && message) {
      setOriginalMessage(message)
    }
  }

  // Get the effective message for NFT creation
  const getEffectiveMessage = () => {
    if (selectedSticker && !isStickerHidden) {
      return originalMessage || currentMessage
    }
    return currentMessage
  }

  return {
    selectedSticker,
    originalMessage,
    currentMessage,
    isTextFaded,
    isStickerHidden,
    handleStickerSelect,
    handleMessageChange,
    getEffectiveMessage,
    // For external message updates - be more careful about originalMessage
    setCurrentMessage: (message: string) => {
      setCurrentMessage(message)
      // Only update originalMessage if no sticker is selected to avoid overwriting preserved message
      if (!selectedSticker) {
        setOriginalMessage(message)
      }
    }
  }
}