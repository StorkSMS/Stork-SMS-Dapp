'use client'

import React, { useState, useEffect, useRef } from 'react'

interface ChatStickerPickerProps {
  isOpen: boolean
  onStickerSend: (sticker: string) => void
  onClose: () => void
  colors: {
    bg: string
    text: string
    border: string
  }
  isDarkMode?: boolean
  className?: string
  buttonRef?: React.RefObject<HTMLElement>
}

// Chat stickers from /Message-Stickers directory
const CHAT_STICKER_OPTIONS = [
  'Applause.png',
  'Bonk.png',
  'Envy.png',
  'Gib alpha.png',
  'Poke.png',
  'Rugarugruuug.png',
  'Stork.png',
  'certi jeet.png'
]

const CHAT_STICKER_BASE_PATH = '/Message-Stickers'

export default function ChatStickerPicker({
  isOpen,
  onStickerSend,
  onClose,
  colors,
  isDarkMode = false,
  className = '',
  buttonRef
}: ChatStickerPickerProps) {
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const [loadingStickers, setLoadingStickers] = useState<Set<string>>(new Set())
  const [failedStickers, setFailedStickers] = useState<Set<string>>(new Set())
  const pickerRef = useRef<HTMLDivElement>(null)

  // Load sticker images when picker opens
  useEffect(() => {
    if (!isOpen) return

    const loadStickers = async () => {
      const imagePromises = CHAT_STICKER_OPTIONS.map(async (stickerName) => {
        if (loadedImages.has(stickerName)) return

        setLoadingStickers(prev => new Set(prev).add(stickerName))
        
        try {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = reject
            image.src = `${CHAT_STICKER_BASE_PATH}/${encodeURIComponent(stickerName)}`
          })

          setLoadedImages(prev => new Map(prev).set(stickerName, image))
          setLoadingStickers(prev => {
            const newSet = new Set(prev)
            newSet.delete(stickerName)
            return newSet
          })
        } catch (error) {
          console.warn(`Failed to load chat sticker ${stickerName}:`, error)
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

    loadStickers()
  }, [isOpen, loadedImages])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isClickOnPicker = pickerRef.current && pickerRef.current.contains(target)
      const isClickOnButton = buttonRef?.current && buttonRef.current.contains(target)
      
      if (!isClickOnPicker && !isClickOnButton) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleStickerClick = (stickerName: string) => {
    onStickerSend(stickerName)
    onClose()
  }

  return (
    <div 
      ref={pickerRef}
      className={`
        absolute bottom-full left-0 right-0 z-[0]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'}
        ${className}
      `}
      style={{
        backgroundColor: colors.bg,
        borderTop: `4px solid ${colors.border}`,
        borderBottom: 'none',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxHeight: '180px'
      }}
      role="dialog"
      aria-label="Sticker picker"
    >
      {/* Paper Texture Overlay - matches main app texture */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: 'url(/Paper-Texture-7.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'multiply',
          opacity: isDarkMode ? 0.8 : 0.4
        }}
      />
      
      {/* Vertical Scrolling Sticker Grid */}
      <div className="p-2 max-h-44 overflow-y-auto relative z-[2]">
        <div className="grid grid-cols-5 gap-1.5">
          {CHAT_STICKER_OPTIONS.map((stickerName) => {
            const isLoading = loadingStickers.has(stickerName)
            const hasFailed = failedStickers.has(stickerName)
            const image = loadedImages.get(stickerName)
            
            return (
              <button
                key={stickerName}
                onClick={() => handleStickerClick(stickerName)}
                className="
                  relative aspect-square w-full border-2 p-1.5 rounded-md
                  transition-all duration-200 hover:scale-105 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  hover:shadow-md active:scale-95
                "
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg
                }}
                disabled={isLoading || hasFailed}
                aria-label={`Send ${stickerName.replace('.png', '')} sticker`}
              >
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
                    <div 
                      className="animate-spin rounded-full h-3 w-3 border-b border"
                      style={{ borderColor: colors.text }}
                    />
                  </div>
                )}
                
                {/* Failed state */}
                {hasFailed && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center text-xs"
                    style={{ color: colors.text }}
                  >
                    <div className="text-center opacity-50">
                      <div className="text-xs mb-0.5">⚠️</div>
                      <div className="text-[10px]">Failed</div>
                    </div>
                  </div>
                )}
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 transition-all duration-200 rounded-md" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}