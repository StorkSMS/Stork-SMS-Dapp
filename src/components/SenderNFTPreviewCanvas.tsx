'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface SenderNFTPreviewCanvasProps {
  recipientWallet: string
  width?: number
  height?: number
  className?: string
  onCanvasReady?: (canvasDataUrl: string) => void
}

// Canvas dimensions (same as recipient system)
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Text area specifications for sender NFT (matching our backend specs)
const SENDER_TEXT_AREA = {
  width: 988,
  height: 340,
  leftX: 48.35,       // Left edge of text box
  topY: 291.25,       // Top edge of text box  
  baseFontSize: 110,  // Base font size (dynamic scaling like recipient)
  letterSpacing: -0.07, // -7%
  lineHeight: 0.94,   // Match recipient system
}

// Dynamic font size calculation (copied from recipient system)
function calculateFontSize(characterCount: number): number {
  const baseSize = SENDER_TEXT_AREA.baseFontSize
  
  if (characterCount <= 24) return baseSize
  if (characterCount <= 50) return baseSize * 0.85
  if (characterCount <= 100) return baseSize * 0.7
  if (characterCount <= 150) return baseSize * 0.6
  if (characterCount <= 200) return baseSize * 0.5
  if (characterCount <= 250) return baseSize * 0.4
  
  return baseSize * 0.35 // For 250+ characters
}

function applyLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
): void {
  let currentX = x
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    ctx.fillText(char, currentX, y)
    const charWidth = ctx.measureText(char).width
    currentX += charWidth + letterSpacing
  }
}

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
    const testWidth = metrics.width

    if (testWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  
  lines.push(currentLine)
  return lines
}

export default function SenderNFTPreviewCanvas({
  recipientWallet,
  width = 400,
  height = 400,
  className = '',
  onCanvasReady
}: SenderNFTPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load Frame 11.png
  useEffect(() => {
    const loadFrameImage = async () => {
      try {
        setIsLoading(true)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        img.onload = () => {
          console.log('✅ Sender: Frame 11.png loaded successfully')
          setFrameImage(img)
          setIsLoading(false)
        }
        
        img.onerror = (error) => {
          console.error('❌ Sender: Failed to load Frame 11.png:', error)
          setIsLoading(false)
        }
        
        img.src = '/Nft-Build-Images/Sender NFT/Frame 11.png'
      } catch (error) {
        console.error('❌ Sender: Error loading frame image:', error)
        setIsLoading(false)
      }
    }

    loadFrameImage()
  }, [])

  // Draw the sender NFT canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !frameImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    console.log('🎨 Sender: Drawing canvas with Frame 11.png')

    // Draw Frame 11.png as base layer
    ctx.drawImage(frameImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Generate sender message
    const last5Chars = recipientWallet.slice(-5)
    const senderMessage = `You started a conversation with ...${last5Chars}`

    console.log('📝 Sender: Message:', senderMessage)

    // Calculate font size dynamically
    const fontSize = calculateFontSize(senderMessage.length)
    const letterSpacing = fontSize * SENDER_TEXT_AREA.letterSpacing

    console.log('📏 Sender: Message length:', senderMessage.length, 'characters')
    console.log('🔤 Sender: Calculated font size:', fontSize, 'px')
    console.log('📐 Sender: Letter spacing:', letterSpacing, 'px')

    // Set font - using the same font stack as recipient NFT to ensure consistency
    ctx.font = `500 ${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Position text using our exact specifications
    const textBoxLeftX = SENDER_TEXT_AREA.leftX
    const textBoxTopY = SENDER_TEXT_AREA.topY
    const maxWidth = SENDER_TEXT_AREA.width

    console.log('📍 Sender: Text position - X(Left):', textBoxLeftX, 'Y(Top):', textBoxTopY)

    // Wrap text
    const lines = wrapText(ctx, senderMessage, maxWidth)
    const lineHeight = fontSize * SENDER_TEXT_AREA.lineHeight

    // Position text at the bottom of the text box with padding
    const totalTextHeight = lines.length * lineHeight
    const bottomPadding = 30 // Add padding from bottom
    const startY = textBoxTopY + SENDER_TEXT_AREA.height - totalTextHeight - bottomPadding

    console.log('📄 Sender: Drawing', lines.length, 'lines of text')

    // Draw each line
    lines.forEach((line, index) => {
      const currentY = startY + (index * lineHeight)
      console.log(`📍 Sender: Line ${index + 1}: "${line}" at X=${textBoxLeftX}, Y=${currentY}`)
      
      if (currentY >= 0 && currentY < CANVAS_HEIGHT) {
        // Apply letter spacing
        applyLetterSpacing(ctx, line, textBoxLeftX, currentY, letterSpacing)
      }
    })

    console.log('✅ Sender: Canvas drawing completed')

    // Export canvas data if callback provided (this is the key!)
    if (onCanvasReady) {
      const dataUrl = canvas.toDataURL('image/png')
      console.log('📤 Sender: Canvas exported as data URL, length:', dataUrl.length)
      onCanvasReady(dataUrl)
    }
  }, [frameImage, recipientWallet, onCanvasReady])

  // Redraw when dependencies change
  useEffect(() => {
    if (!isLoading && frameImage) {
      // Small delay to ensure canvas is ready
      setTimeout(drawCanvas, 100)
    }
  }, [drawCanvas, isLoading, frameImage])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full object-contain bg-gray-100 rounded-lg"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          imageRendering: 'crisp-edges'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Loading sender preview...</div>
        </div>
      )}
    </div>
  )
}