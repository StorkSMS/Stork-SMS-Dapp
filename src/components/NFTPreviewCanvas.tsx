'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface NFTPreviewCanvasProps {
  messageContent: string
  selectedSticker?: string | null
  isStickerHidden?: boolean
  isTextFaded?: boolean
  width?: number
  height?: number
  className?: string
  onCanvasReady?: (canvasDataUrl: string) => void
}

interface LayerAsset {
  path: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  name: string
}

// Define layer assets in Z-index order (bottom to top) - same as backend
const LAYER_ASSETS: LayerAsset[] = [
  {
    path: '/Nft-Build-Images/Recipient NFT/White bg (position bottom left).png',
    position: 'bottom-left',
    name: 'white-bg'
  },
  {
    path: '/Nft-Build-Images/Recipient NFT/Ticket edge (position top left).png',
    position: 'top-left',
    name: 'ticket-edge'
  },
  {
    path: '/Nft-Build-Images/Recipient NFT/under rip image (position bottom right).png',
    position: 'bottom-right',
    name: 'under-rip'
  },
  {
    path: '/Nft-Build-Images/Recipient NFT/Paper-rip (positon bottom right).png',
    position: 'bottom-right',
    name: 'paper-rip'
  },
  {
    path: '/Nft-Build-Images/Recipient NFT/Stork-branding (position top right).png',
    position: 'top-right',
    name: 'stork-branding'
  },
  // User text layer will be drawn programmatically here
  {
    path: '/Nft-Build-Images/Recipient NFT/Paper-Texture (position bottom right).png',
    position: 'bottom-right',
    name: 'paper-texture'
  },
  {
    path: '/Nft-Build-Images/Recipient NFT/Stickers (position bottom left)',
    position: 'bottom-left',
    name: 'stickers'
  }
]

const STICKER_OPTIONS = [
  'Applause 1.png',
  'Bonk 1.png',
  'Envy 1.png',
  'Gib alpha 1.png',
  'Mattle 12.png',
  'Poke 1.png',
  'Rugarugruuug 1.png',
  'Stork 1.png',
  'certi jeet 1.png'
]

// Canvas dimensions - same as backend
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Text area specifications - same as backend
const TEXT_AREA = {
  width: 985,
  height: 575,
  centerX: 52,
  centerY: 337,
  maxFontSize: 160,
  letterSpacing: -0.07, // -7%
  lineHeight: 0.94, // 94%
  maxChars: 300
}

// Calculate font size based on character count - same as backend
function calculateFontSize(characterCount: number): number {
  const baseSize = TEXT_AREA.maxFontSize
  
  if (characterCount <= 24) return baseSize
  if (characterCount <= 50) return baseSize * 0.85
  if (characterCount <= 100) return baseSize * 0.7
  if (characterCount <= 150) return baseSize * 0.6
  if (characterCount <= 200) return baseSize * 0.5
  if (characterCount <= 250) return baseSize * 0.4
  
  return baseSize * 0.35 // For 250+ characters
}

// Position asset on canvas - same as backend
function positionAsset(
  image: HTMLImageElement,
  position: string,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  let x = 0
  let y = 0

  switch (position) {
    case 'top-left':
      x = 0
      y = 0
      break
    case 'top-right':
      x = canvasWidth - image.width
      y = 0
      break
    case 'bottom-left':
      x = 0
      y = canvasHeight - image.height
      break
    case 'bottom-right':
      x = canvasWidth - image.width
      y = canvasHeight - image.height
      break
    default:
      x = 0
      y = 0
  }

  return { x, y }
}

// Wrap text within max width - same as backend
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0] || ''

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    const metrics = ctx.measureText(testLine)
    
    if (metrics.width > maxWidth) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  
  lines.push(currentLine)
  return lines
}

// Function to convert emojis to text representations - same as backend
function emojiToText(emoji: string): string {
  const emojiMap: Record<string, string> = {
    '😊': 'SMILE',
    '😂': 'LOL',
    '❤️': 'HEART',
    '🚀': 'ROCKET',
    '🎉': 'PARTY',
    '💎': 'GEM',
    '🔥': 'FIRE',
    '🌙': 'MOON',
    '🎵': 'MUSIC',
    '🍕': 'PIZZA',
    '👨‍💻': ':man_technologist:',
    '👩‍🚀': ':woman_astronaut:',
    '🏴‍☠️': ':pirate_flag:',
    '💯': ':100:',
    '✨': ':sparkles:',
    '🎯': ':direct_hit:',
    '🎨': ':art:',
    '🔮': ':crystal_ball:',
    '⚡': ':zap:',
    '🌟': ':star2:',
    '🎪': ':circus_tent:',
    '🎭': ':performing_arts:',
    '😀': ':grinning:',
    '😃': ':smiley:',
    '😄': ':smile:',
    '😁': ':grin:',
    '😅': ':sweat_smile:',
    '😆': ':laughing:',
    '🤣': ':rofl:',
    '😇': ':innocent:',
    '😍': ':heart_eyes:',
    '🥰': ':smiling_face_with_hearts:',
    '😘': ':kissing_heart:',
    '😗': ':kissing:',
    '😙': ':kissing_smiling_eyes:',
    '😚': ':kissing_closed_eyes:',
    '😋': ':yum:',
    '😛': ':stuck_out_tongue:',
    '😜': ':stuck_out_tongue_winking_eye:',
    '🤪': ':zany_face:',
    '😝': ':stuck_out_tongue_closed_eyes:',
    '🤑': ':money_mouth_face:',
    '🤗': ':hugs:',
    '🤭': ':hand_over_mouth:',
    '🤫': ':shushing_face:',
    '🤔': ':thinking:',
    '🤐': ':zipper_mouth_face:',
    '🤨': ':raised_eyebrow:',
    '😐': ':neutral_face:',
    '😑': ':expressionless:',
    '😶': ':no_mouth:',
    '😏': ':smirk:',
    '😒': ':unamused:',
    '🙄': ':roll_eyes:',
    '😬': ':grimacing:',
    '🤥': ':lying_face:',
    '😔': ':pensive:',
    '😕': ':confused:',
    '🙁': ':slightly_frowning_face:',
    '☹️': ':frowning_face:',
    '😣': ':persevere:',
    '😖': ':confounded:',
    '😫': ':tired_face:',
    '😩': ':weary:',
    '🥺': ':pleading_face:',
    '😢': ':cry:',
    '😭': ':sob:',
    '😤': ':huffing:',
    '😠': ':angry:',
    '😡': ':rage:',
    '🤬': ':face_with_symbols_over_mouth:',
    '🤯': ':exploding_head:',
    '😳': ':flushed:',
    '🥵': ':hot_face:',
    '🥶': ':cold_face:',
    '😱': ':scream:',
    '😨': ':fearful:',
    '😰': ':cold_sweat:',
    '😥': ':disappointed_relieved:',
    '😓': ':sweat:',
    '🤗': ':hugs:',
    '🤡': ':clown_face:',
    '🥳': ':partying_face:',
    '🥴': ':woozy_face:',
    '🥸': ':disguised_face:',
    '😷': ':mask:',
    '🤒': ':thermometer_face:',
    '🤕': ':head_bandage:',
    '🤢': ':nauseated_face:',
    '🤮': ':vomiting_face:',
    '🤧': ':sneezing_face:',
    '😵': ':dizzy_face:',
    '😵‍💫': ':face_with_spiral_eyes:',
    '🤠': ':cowboy_hat_face:',
    '🥺': ':pleading_face:',
    '🫠': ':melting_face:',
    '🫡': ':saluting_face:',
    '🫢': ':face_with_open_eyes_and_hand_over_mouth:',
    '🫣': ':face_with_peeking_eye:',
    '🫤': ':face_with_diagonal_mouth:',
    '🫥': ':dotted_line_face:'
  }
  
  const result = emojiMap[emoji] || 'EMOJI'
  console.log(`🔄 Frontend emoji mapping: ${emoji} -> ${result}`)
  return result
}

// Function to replace emojis with text representations - same as backend
function replaceEmojisWithText(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}]/gu, (emoji) => {
    const replacement = emojiToText(emoji)
    console.log(`🔄 Frontend: Replacing emoji '${emoji}' with '${replacement}'`)
    return replacement
  })
}

// Smart text rendering with emoji font switching - same as backend
function renderTextWithEmojiSupport(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  letterSpacing: number
): void {
  // Split text into proper grapheme clusters
  const chars = [...text]  // This handles emoji properly in modern browsers
  let currentX = x
  
  // Store fonts
  const textFont = `500 ${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`
  const emojiFont = `500 ${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Helvetica Neue", system-ui, sans-serif`
  
  for (const char of chars) {
    // Check if character is an emoji
    const isEmoji = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}]/u.test(char)
    
    if (isEmoji) {
      // Switch to emoji font for this character
      ctx.font = emojiFont
      console.log(`🎨 Frontend: Rendering emoji: ${char} with emoji font`)
    } else {
      // Use original Helvetica Neue font for text
      ctx.font = textFont
    }
    
    ctx.fillText(char, currentX, y)
    const charWidth = ctx.measureText(char).width
    currentX += charWidth + letterSpacing
  }
  
  // Restore original font
  ctx.font = textFont
}

// Keep original letter spacing function as fallback
function applyLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
): void {
  const chars = text.split('')
  let currentX = x
  
  chars.forEach((char) => {
    ctx.fillText(char, currentX, y)
    const charWidth = ctx.measureText(char).width
    currentX += charWidth + letterSpacing
  })
}

// Load image with error handling
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function NFTPreviewCanvas({
  messageContent,
  selectedSticker,
  isStickerHidden = false,
  isTextFaded = false,
  width = 512,
  height = 512,
  className = '',
  onCanvasReady
}: NFTPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map())
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Load all layer images
  const loadAllImages = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const imagePromises = LAYER_ASSETS.map(async (layer) => {
        try {
          let imagePath: string

          if (layer.name === 'stickers') {
            // Handle sticker selection - only load if sticker is selected and not hidden
            if (!selectedSticker || !STICKER_OPTIONS.includes(selectedSticker) || isStickerHidden) {
              return null // Don't load any sticker if none selected or hidden
            }
            
            imagePath = `${layer.path}/${selectedSticker}`
          } else {
            imagePath = layer.path
          }

          const image = await loadImage(imagePath)
          return [layer.name, image] as [string, HTMLImageElement]
        } catch (error) {
          console.warn(`Could not load layer ${layer.name}:`, error)
          return null
        }
      })

      const results = await Promise.all(imagePromises)
      const imageMap = new Map<string, HTMLImageElement>()
      
      results.forEach((result) => {
        if (result) {
          imageMap.set(result[0], result[1])
        }
      })

      setLoadedImages(imageMap)
    } catch (error) {
      console.error('Error loading images:', error)
      setError('Failed to load NFT assets')
    } finally {
      setIsLoading(false)
    }
  }, [selectedSticker, isStickerHidden])

  // Render canvas with all layers
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw all layers including white bg
    LAYER_ASSETS.forEach((layer) => {
      const image = loadedImages.get(layer.name)
      if (image && layer.name !== 'paper-texture' && layer.name !== 'stickers') {
        const position = positionAsset(image, layer.position, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.drawImage(image, position.x, position.y)
      }
    })
    
    // Draw text layer after paper-rip layer (correct Z-index position)
    // Only draw text if it's not faded (i.e., when no sticker is selected)
    const paperRipLayer = LAYER_ASSETS.find(layer => layer.name === 'paper-rip')
    if (paperRipLayer && messageContent.trim() && !isTextFaded) {
      // Check for emojis - in browser canvas, we can try native emoji rendering first
      const containsEmoji = /\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}/u.test(messageContent)
      console.log('🖼️ Frontend preview: Contains emojis:', containsEmoji)
      
      // Keep original message with emojis - we'll render them with smart font switching
      const processedMessage = messageContent
      console.log('🎭 Frontend preview: Original message with emojis:', processedMessage.substring(0, 100))
      
      const truncatedMessage = processedMessage.length > TEXT_AREA.maxChars 
        ? processedMessage.substring(0, TEXT_AREA.maxChars) + '...'
        : processedMessage

      const fontSize = calculateFontSize(truncatedMessage.length)
      const letterSpacing = fontSize * TEXT_AREA.letterSpacing
      
      // Set font - using Helvetica Neue (same as original)
      ctx.font = `500 ${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      
      // Calculate text area position (left-aligned text, vertically centered)
      const textBoxLeftX = TEXT_AREA.centerX
      const textBoxCenterY = TEXT_AREA.centerY + (TEXT_AREA.height / 2)
      const maxWidth = TEXT_AREA.width
      
      // Wrap text
      const lines = wrapText(ctx, truncatedMessage, maxWidth)
      const lineHeight = fontSize * TEXT_AREA.lineHeight
      
      // Calculate starting Y position to center text vertically
      const totalTextHeight = lines.length * lineHeight
      const startY = textBoxCenterY - (totalTextHeight / 2)
      
      // Draw each line with smart emoji font switching
      lines.forEach((line, index) => {
        const currentY = startY + (index * lineHeight)
        if (currentY >= 0 && currentY < CANVAS_HEIGHT) {
          // Use smart font switching for emojis
          renderTextWithEmojiSupport(ctx, line, textBoxLeftX, currentY, fontSize, letterSpacing)
        }
      })
    }
    
    // Create a mask from the current canvas content
    const currentImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Apply paper-texture with multiply blend mode, masked to existing content
    const paperTextureImage = loadedImages.get('paper-texture')
    if (paperTextureImage) {
      const position = positionAsset(paperTextureImage, 'bottom-right', CANVAS_WIDTH, CANVAS_HEIGHT)
      
      // Create a temporary canvas for the paper texture
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = CANVAS_WIDTH
      tempCanvas.height = CANVAS_HEIGHT
      const tempCtx = tempCanvas.getContext('2d')
      
      if (tempCtx) {
        // Draw the paper texture
        tempCtx.drawImage(paperTextureImage, position.x, position.y)
        
        // Get the paper texture image data
        const paperTextureData = tempCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        
        // Apply multiply blend mode manually, only where there's existing content
        const resultData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)
        
        for (let i = 0; i < currentImageData.data.length; i += 4) {
          const alpha = currentImageData.data[i + 3]
          
          if (alpha > 0) { // Only apply to non-transparent pixels
            // Multiply blend mode formula: result = (base * blend) / 255
            resultData.data[i] = (currentImageData.data[i] * paperTextureData.data[i]) / 255
            resultData.data[i + 1] = (currentImageData.data[i + 1] * paperTextureData.data[i + 1]) / 255
            resultData.data[i + 2] = (currentImageData.data[i + 2] * paperTextureData.data[i + 2]) / 255
            resultData.data[i + 3] = alpha // Preserve original alpha
          } else {
            // Keep transparent pixels transparent
            resultData.data[i] = currentImageData.data[i]
            resultData.data[i + 1] = currentImageData.data[i + 1]
            resultData.data[i + 2] = currentImageData.data[i + 2]
            resultData.data[i + 3] = alpha
          }
        }
        
        // Clear canvas and draw the result
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.putImageData(resultData, 0, 0)
      }
    }
    
    // Finally, draw stickers on top
    const stickerImage = loadedImages.get('stickers')
    if (stickerImage) {
      const position = positionAsset(stickerImage, 'bottom-left', CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.drawImage(stickerImage, position.x, position.y)
    }
    
    // Export canvas data if callback provided
    if (onCanvasReady) {
      const dataUrl = canvas.toDataURL('image/png')
      onCanvasReady(dataUrl)
    }
  }, [loadedImages, messageContent, onCanvasReady, isTextFaded])

  // Load images on mount and when sticker changes
  useEffect(() => {
    loadAllImages()
  }, [loadAllImages])

  // Render canvas when images load or message changes (debounced)
  useEffect(() => {
    if (loadedImages.size > 0) {
      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // Debounce text changes by 300ms
      debounceTimeoutRef.current = setTimeout(() => {
        renderCanvas()
      }, 300)
    }

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [loadedImages, renderCanvas])

  // Render immediately when images first load (no debounce)
  useEffect(() => {
    if (loadedImages.size > 0) {
      renderCanvas()
    }
  }, [loadedImages, renderCanvas])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ width, height }}>
        <div className="text-center text-red-600">
          <p className="text-sm font-medium">Preview Error</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius: '8px',
          backgroundColor: 'transparent'
        }}
        className=""
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading preview...</p>
          </div>
        </div>
      )}
    </div>
  )
}