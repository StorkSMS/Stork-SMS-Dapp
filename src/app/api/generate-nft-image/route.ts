import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas'
import { r2Storage } from '@/lib/r2-storage'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'

// Register custom font if available
try {
  const fontPath = path.join(process.cwd(), 'public/fonts/SelfWritten-Regular.ttf')
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'SelfWritten' })
  }
} catch (error) {
  console.warn('Could not load custom font:', error)
}

interface GenerateNFTImageRequest {
  messageContent: string
  senderWallet: string
  recipientWallet: string
  nftType?: 'sender' | 'recipient'
  theme?: 'default' | 'romantic' | 'formal' | 'casual' | 'celebration'
  selectedSticker?: string
  customization?: {
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
    backgroundImage?: string
  }
}

interface CanvasTheme {
  backgroundColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  padding: number
  lineHeight: number
  borderRadius: number
  shadowBlur: number
  shadowColor: string
}

const themes: Record<string, CanvasTheme> = {
  default: {
    backgroundColor: '#ffffff',
    textColor: '#1a1a1a',
    fontFamily: 'SelfWritten, serif',
    fontSize: 32,
    padding: 80,
    lineHeight: 1.5,
    borderRadius: 20,
    shadowBlur: 20,
    shadowColor: 'rgba(0, 0, 0, 0.1)'
  },
  romantic: {
    backgroundColor: '#fff5f5',
    textColor: '#7c2d12',
    fontFamily: 'SelfWritten, serif',
    fontSize: 36,
    padding: 100,
    lineHeight: 1.6,
    borderRadius: 30,
    shadowBlur: 25,
    shadowColor: 'rgba(220, 38, 127, 0.15)'
  },
  formal: {
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    fontFamily: 'serif',
    fontSize: 28,
    padding: 60,
    lineHeight: 1.4,
    borderRadius: 10,
    shadowBlur: 15,
    shadowColor: 'rgba(0, 0, 0, 0.08)'
  },
  casual: {
    backgroundColor: '#f0f9ff',
    textColor: '#0c4a6e',
    fontFamily: 'SelfWritten, sans-serif',
    fontSize: 34,
    padding: 90,
    lineHeight: 1.5,
    borderRadius: 25,
    shadowBlur: 20,
    shadowColor: 'rgba(14, 165, 233, 0.1)'
  },
  celebration: {
    backgroundColor: '#fefce8',
    textColor: '#a16207',
    fontFamily: 'SelfWritten, serif',
    fontSize: 38,
    padding: 110,
    lineHeight: 1.6,
    borderRadius: 35,
    shadowBlur: 30,
    shadowColor: 'rgba(217, 119, 6, 0.2)'
  }
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Handle empty text
  if (!text || !text.trim()) return []
  
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = context.measureText(currentLine + ' ' + word).width
    if (width < maxWidth && currentLine.length > 0) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  
  if (currentLine && currentLine.length > 0) {
    lines.push(currentLine)
  }
  
  return lines
}

function truncateMessage(message: string, maxLength: number = 500): string {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

function truncateWalletAddress(address: string, prefixLength: number = 4, suffixLength: number = 4): string {
  if (address.length <= prefixLength + suffixLength + 3) return address
  return `${address.substring(0, prefixLength)}...${address.substring(address.length - suffixLength)}`
}

async function generateNFTImage(request: GenerateNFTImageRequest): Promise<Buffer> {
  const { messageContent, senderWallet, recipientWallet, nftType = 'recipient', theme = 'default', selectedSticker, customization } = request
  
  // Log sticker selection for debugging
  if (selectedSticker) {
    console.log(`Sticker selected for simple NFT generation: ${selectedSticker}`)
  }
  
  // Get theme configuration
  const themeConfig = themes[theme] || themes.default
  
  // Apply customizations
  const config: CanvasTheme = {
    ...themeConfig,
    backgroundColor: customization?.backgroundColor || themeConfig.backgroundColor,
    textColor: customization?.textColor || themeConfig.textColor,
    fontFamily: customization?.fontFamily || themeConfig.fontFamily,
  }

  // Canvas dimensions (1024x1024 for NFT standard)
  const width = 1024
  const height = 1024
  
  // Create canvas
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Set up background
  ctx.fillStyle = config.backgroundColor
  ctx.fillRect(0, 0, width, height)
  
  // Add subtle gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, config.backgroundColor)
  gradient.addColorStop(1, config.backgroundColor + '88')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // Add background pattern (optional)
  if (theme === 'celebration') {
    // Add sparkle effect for celebration theme
    ctx.fillStyle = config.textColor + '20'
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = Math.random() * 4 + 2
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  
  // Create main content area with rounded rectangle
  const contentWidth = width - (config.padding * 2)
  const contentHeight = height - (config.padding * 2)
  const contentX = config.padding
  const contentY = config.padding
  
  // Add shadow
  ctx.shadowColor = config.shadowColor
  ctx.shadowBlur = config.shadowBlur
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 10
  
  // Draw rounded rectangle background
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(contentX, contentY, contentWidth, contentHeight, config.borderRadius)
  ctx.fill()
  
  // Reset shadow
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
  
  // Set up text styling (original font)
  ctx.fillStyle = config.textColor
  ctx.font = `${config.fontSize}px ${config.fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  
  // Note: For simple NFT generation, we'll convert emojis to text for now
  // The production NFT system handles emoji images properly
  function emojiToText(emoji: string): string {
    const emojiMap: Record<string, string> = {
      '😊': '☺',  // Use simple smiley face
      '😂': 'LOL',
      '❤️': '♥',   // Simple heart
      '🚀': '^',     // Arrow up
      '🎉': '*',     // Star
      '💎': '◆',  // Diamond
      '🔥': '~',     // Tilde
      '🌙': '☽',  // Moon
      '🎵': '♫',  // Musical note
      '🍕': 'pizza',
      '👨‍💻': 'dev',
      '👩‍🚀': 'astronaut',
      '🏴‍☠️': 'pirate',
      '💯': '100',
      '✨': '★',      // Star
      '🎯': '•',  // Bullet
      '🎨': 'art',
      '🔮': 'crystal',
      '⚡': '↯',      // Lightning
      '🌟': '★'   // Star
    }
    
    return emojiMap[emoji] || '[emoji]'
  }
  
  // Function to replace emojis with simple text/symbol representations
  function replaceEmojisWithText(text: string): string {
    return text.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji}]/gu, (emoji) => {
      const replacement = emojiToText(emoji)
      console.log(`🔄 Simple NFT: Replacing emoji '${emoji}' with '${replacement}'`)
      return replacement
    })
  }

  // Prepare message content based on NFT type
  let rawDisplayMessage: string
  let headerText: string
  
  if (nftType === 'sender') {
    const truncatedRecipient = truncateWalletAddress(recipientWallet, 6, 4)
    rawDisplayMessage = `you started a chat with ${truncatedRecipient}`
    headerText = 'Stork Chat Initiated'
  } else {
    rawDisplayMessage = truncateMessage(messageContent, 400)
    headerText = 'Stork Message'
  }
  
  // Convert emojis to simple symbols for Canvas compatibility
  const displayMessage = replaceEmojisWithText(rawDisplayMessage)
  console.log('🎨 Simple NFT: Using emoji-to-symbol conversion for compatibility')
  
  // Calculate text area
  const textPadding = 60
  const textWidth = contentWidth - (textPadding * 2)
  const textStartY = contentY + textPadding + 60 // Leave space for header
  
  // Add header
  ctx.font = `${Math.floor(config.fontSize * 0.6)}px ${config.fontFamily}`
  ctx.fillStyle = config.textColor + '80'
  ctx.fillText(headerText, width / 2, contentY + textPadding)
  
  // Reset font for main message
  ctx.font = `${config.fontSize}px ${config.fontFamily}`
  ctx.fillStyle = config.textColor
  
  // Wrap text and draw
  const lines = wrapText(ctx, displayMessage, textWidth)
  const lineHeight = config.fontSize * config.lineHeight
  const totalTextHeight = lines.length * lineHeight
  
  // Center text vertically
  const textY = Math.max(textStartY, (height - totalTextHeight) / 2)
  
  lines.forEach((line, index) => {
    const y = textY + (index * lineHeight)
    if (y + lineHeight <= contentY + contentHeight - textPadding) {
      // Render with simple emoji-to-symbol conversion
      ctx.fillText(line, width / 2, y)
    }
  })
  
  // Add decorative elements based on theme
  if (theme === 'romantic') {
    // Add hearts
    ctx.fillStyle = '#dc2626'
    ctx.font = '40px serif'
    ctx.fillText('♥', contentX + 40, contentY + 40)
    ctx.fillText('♥', contentX + contentWidth - 60, contentY + contentHeight - 80)
  } else if (theme === 'formal') {
    // Add border lines
    ctx.strokeStyle = config.textColor + '40'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(contentX + 40, contentY + 80)
    ctx.lineTo(contentX + contentWidth - 40, contentY + 80)
    ctx.moveTo(contentX + 40, contentY + contentHeight - 40)
    ctx.lineTo(contentX + contentWidth - 40, contentY + contentHeight - 40)
    ctx.stroke()
  }
  
  // Add timestamp in corner
  ctx.fillStyle = config.textColor + '60'
  ctx.font = `${Math.floor(config.fontSize * 0.5)}px ${config.fontFamily}`
  ctx.textAlign = 'right'
  const timestamp = new Date().toLocaleDateString()
  ctx.fillText(timestamp, contentX + contentWidth - 20, contentY + contentHeight - 20)
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateNFTImageRequest = await request.json()
    
    // Validate required fields
    if (!body.messageContent || !body.senderWallet || !body.recipientWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: messageContent, senderWallet, recipientWallet' },
        { status: 400 }
      )
    }
    
    // Validate wallet addresses (basic format check)
    if (body.senderWallet.length < 32 || body.recipientWallet.length < 32) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }
    
    // Generate unique message ID
    const messageId = uuidv4()
    
    // Generate NFT image
    const imageBuffer = await generateNFTImage(body)
    
    // Upload image to R2 storage
    const uploadResult = await r2Storage.uploadNFTImage(
      imageBuffer,
      body.senderWallet,
      messageId,
      'image/png'
    )
    
    return NextResponse.json({
      success: true,
      messageId,
      imageUrl: uploadResult.publicUrl,
      imageKey: uploadResult.key,
      size: uploadResult.size,
      theme: body.theme || 'default'
    })
    
  } catch (error) {
    console.error('NFT image generation error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate NFT image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'NFT Image Generation API',
    endpoint: '/api/generate-nft-image',
    method: 'POST',
    requiredFields: ['messageContent', 'senderWallet', 'recipientWallet'],
    optionalFields: ['nftType', 'theme', 'selectedSticker', 'customization'],
    nftTypes: ['sender', 'recipient'],
    themes: Object.keys(themes),
    imageSize: '1024x1024',
    format: 'PNG'
  })
}