import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas'
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

interface GenerateProductionNFTRequest {
  messageContent: string
  senderWallet: string
  recipientWallet: string
  sticker?: string // Optional specific sticker selection
}

interface LayerAsset {
  path: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  name: string
}

// Define layer assets in Z-index order (bottom to top)
const LAYER_ASSETS: LayerAsset[] = [
  {
    path: '/public/Nft-Build-Images/Recipient NFT/White bg (position bottom left).png',
    position: 'bottom-left',
    name: 'white-bg'
  },
  {
    path: '/public/Nft-Build-Images/Recipient NFT/Ticket edge (position top left).png',
    position: 'top-left',
    name: 'ticket-edge'
  },
  {
    path: '/public/Nft-Build-Images/Recipient NFT/under rip image (position bottom right).png',
    position: 'bottom-right',
    name: 'under-rip'
  },
  {
    path: '/public/Nft-Build-Images/Recipient NFT/Paper-rip (positon bottom right).png',
    position: 'bottom-right',
    name: 'paper-rip'
  },
  {
    path: '/public/Nft-Build-Images/Recipient NFT/Stork-branding (position top right).png',
    position: 'top-right',
    name: 'stork-branding'
  },
  // User text layer will be drawn programmatically here
  {
    path: '/public/Nft-Build-Images/Recipient NFT/Paper-Texture (position bottom right).png',
    position: 'bottom-right',
    name: 'paper-texture'
  },
  {
    path: '/public/Nft-Build-Images/Recipient NFT/Stickers (position bottom left)',
    position: 'bottom-left',
    name: 'stickers'
  }
]

const STICKER_OPTIONS = [
  'Applause 1.png',
  'Bonk 1.png',
  'Envy 1.png',
  'Gib alpha 1.png',
  'Poke 1.png',
  'Rugarugruuug 1.png',
  'Stork 1.png',
  'certi jeet 1.png'
]

// Canvas dimensions
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Text area specifications
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

function calculateFontSize(characterCount: number): number {
  // Dynamic font scaling based on character count
  const baseSize = TEXT_AREA.maxFontSize
  
  if (characterCount <= 24) return baseSize
  if (characterCount <= 50) return baseSize * 0.85
  if (characterCount <= 100) return baseSize * 0.7
  if (characterCount <= 150) return baseSize * 0.6
  if (characterCount <= 200) return baseSize * 0.5
  if (characterCount <= 250) return baseSize * 0.4
  
  return baseSize * 0.35 // For 250+ characters
}

function positionAsset(
  ctx: CanvasRenderingContext2D,
  image: any,
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

async function generateProductionNFT(request: GenerateProductionNFTRequest): Promise<Buffer> {
  const { messageContent, senderWallet, recipientWallet, sticker } = request
  
  console.log('🖼️ Starting production NFT generation...')
  console.log('📏 Original message length:', messageContent.length)
  
  // Truncate message if too long
  const truncatedMessage = messageContent.length > TEXT_AREA.maxChars 
    ? messageContent.substring(0, TEXT_AREA.maxChars) + '...'
    : messageContent
    
  console.log('✂️ Final message for NFT:', truncatedMessage)
  console.log('🎨 Text area specs:', TEXT_AREA)

  // Create canvas
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // Set up initial canvas with transparent background
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  console.log('🖼️ CANVAS DEBUG INFO:')
  console.log('Canvas dimensions:', CANVAS_WIDTH, 'x', CANVAS_HEIGHT)
  console.log('Canvas scaling:', ctx.getTransform())
  console.log('Device pixel ratio equivalent:', 1) // Node.js canvas default

  // Draw white background first
  try {
    const whiteBgPath = path.join(process.cwd(), '/public/Nft-Build-Images/Recipient NFT/White bg (position bottom left).png')
    const whiteBgImage = await loadImage(whiteBgPath)
    const position = positionAsset(ctx, whiteBgImage, 'bottom-left', CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.drawImage(whiteBgImage, position.x, position.y)
  } catch (error) {
    console.error('CRITICAL: Could not load white background layer:', error)
    throw new Error('Failed to load critical NFT background asset')
  }

  // Draw other layers except paper-texture and stickers
  const criticalLayers = ['ticket-edge', 'under-rip', 'paper-rip', 'stork-branding']
  for (const layer of LAYER_ASSETS) {
    try {
      // Skip paper-texture and stickers for now
      if (layer.name === 'white-bg' || layer.name === 'paper-texture' || layer.name === 'stickers') {
        continue
      }
      
      const imagePath = path.join(process.cwd(), layer.path)
      const image = await loadImage(imagePath)
      const position = positionAsset(ctx, image, layer.position, CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.drawImage(image, position.x, position.y)
      
    } catch (error) {
      if (criticalLayers.includes(layer.name)) {
        console.error(`CRITICAL: Could not load critical layer ${layer.name}:`, error)
        throw new Error(`Failed to load critical NFT asset: ${layer.name}`)
      } else {
        console.warn(`Could not load layer ${layer.name}:`, error)
      }
    }
  }
  
  // Draw text layer after paper-rip layer (correct Z-index position)
  if (truncatedMessage.trim()) {
    console.log('📝 Drawing text on canvas...')
    const fontSize = calculateFontSize(truncatedMessage.length)
    const letterSpacing = fontSize * TEXT_AREA.letterSpacing
    
    console.log('🔤 Font size:', fontSize)
    console.log('📐 Letter spacing:', letterSpacing)
    
    // Set font - using Helvetica Neue with fallbacks (same as frontend)
    ctx.font = `500 ${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    // Calculate text area position (left-aligned text, vertically centered)
    const textBoxLeftX = TEXT_AREA.centerX
    const textBoxCenterY = TEXT_AREA.centerY  // Use centerY directly, don't add height/2
    const maxWidth = TEXT_AREA.width
    
    console.log('🔧 DEBUG TEXT POSITIONING:')
    console.log('📍 TEXT_AREA.centerX:', TEXT_AREA.centerX)
    console.log('📍 TEXT_AREA.centerY:', TEXT_AREA.centerY) 
    console.log('📍 TEXT_AREA.height:', TEXT_AREA.height)
    console.log('📍 textBoxCenterY:', textBoxCenterY)
    console.log('📍 textBoxLeftX:', textBoxLeftX)
    
    // Wrap text
    const lines = wrapText(ctx, truncatedMessage, maxWidth)
    const lineHeight = fontSize * TEXT_AREA.lineHeight
    
    // Calculate starting Y position to center text vertically
    const totalTextHeight = lines.length * lineHeight
    const startY = textBoxCenterY - (totalTextHeight / 2)
    
    console.log('📏 Line height:', lineHeight)
    console.log('📏 Total text height:', totalTextHeight)
    console.log('🎯 Final startY:', startY)
    
    // Draw each line left-aligned
    console.log('📄 Drawing', lines.length, 'lines of text')
    lines.forEach((line, index) => {
      const currentY = startY + (index * lineHeight)
      console.log(`📍 Line ${index + 1}: "${line}" at Y=${currentY}`)
      if (currentY >= 0 && currentY < CANVAS_HEIGHT) {
        // Left-aligned text with letter spacing
        applyLetterSpacing(ctx, line, textBoxLeftX, currentY, letterSpacing)
      } else {
        console.log('⚠️ Line outside canvas bounds')
      }
    })
    console.log('✅ Text drawing complete')
  }
  
  // Create a mask from the current canvas content
  const currentImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  // TEMPORARILY DISABLE paper-texture to test text visibility
  console.log('⚠️ PAPER TEXTURE DISABLED FOR DEBUGGING')
  /*
  try {
    const paperTexturePath = path.join(process.cwd(), '/public/Nft-Build-Images/Recipient NFT/Paper-Texture (position bottom right).png')
    const paperTextureImage = await loadImage(paperTexturePath)
    const position = positionAsset(ctx, paperTextureImage, 'bottom-right', CANVAS_WIDTH, CANVAS_HEIGHT)
    
    // Create a temporary canvas for the paper texture
    const tempCanvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
    const tempCtx = tempCanvas.getContext('2d')
    
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
  } catch (error) {
    console.warn('Could not apply paper texture:', error)
  }
  */
  
  // Finally, draw stickers on top if provided
  if (sticker && STICKER_OPTIONS.includes(sticker)) {
    try {
      const stickerPath = path.join(process.cwd(), '/public/Nft-Build-Images/Recipient NFT/Stickers (position bottom left)', sticker)
      const stickerImage = await loadImage(stickerPath)
      const position = positionAsset(ctx, stickerImage, 'bottom-left', CANVAS_WIDTH, CANVAS_HEIGHT)
      ctx.drawImage(stickerImage, position.x, position.y)
    } catch (error) {
      console.warn('Could not load sticker:', error)
    }
  }


  // Convert canvas to buffer
  console.log('🔄 Converting canvas to PNG buffer...')
  const buffer = canvas.toBuffer('image/png')
  console.log('✅ Canvas converted to buffer, size:', buffer.length, 'bytes')
  
  // Generate hash for debugging
  const crypto = require('crypto')
  const bufferHash = crypto.createHash('md5').update(buffer).digest('hex')
  console.log('🔍 Generated image hash:', bufferHash)
  
  return buffer
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateProductionNFTRequest = await request.json()
    
    console.log('🎨 PRODUCTION NFT GENERATION STARTED')
    console.log('📝 Message content:', body.messageContent?.substring(0, 50) + '...')
    console.log('👤 Sender wallet:', body.senderWallet?.substring(0, 8) + '...')
    console.log('🎯 Recipient wallet:', body.recipientWallet?.substring(0, 8) + '...')
    console.log('🎪 Selected sticker:', body.sticker || 'none')
    
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
    
    // Validate sticker selection if provided
    if (body.sticker && !STICKER_OPTIONS.includes(body.sticker)) {
      return NextResponse.json(
        { error: `Invalid sticker. Must be one of: ${STICKER_OPTIONS.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Generate production NFT image
    console.log('🔄 Starting NFT image generation...')
    const imageBuffer = await generateProductionNFT(body)
    console.log('✅ NFT image generated successfully, buffer size:', imageBuffer.length, 'bytes')
    
    // Generate a unique hash for this image to verify it's unique
    const crypto = require('crypto')
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex')
    console.log('🔍 Image hash (for uniqueness verification):', imageHash)
    
    // Generate metadata
    const metadata = {
      name: `Stork SMS Message NFT`,
      description: `A decentralized message from ${body.senderWallet.substring(0, 8)}... to ${body.recipientWallet.substring(0, 8)}...`,
      image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
      attributes: [
        {
          trait_type: 'Message Length',
          value: body.messageContent.length
        },
        {
          trait_type: 'Sender',
          value: body.senderWallet
        },
        {
          trait_type: 'Recipient',
          value: body.recipientWallet
        },
        {
          trait_type: 'Sticker',
          value: body.sticker || 'Random'
        },
        {
          trait_type: 'Created',
          value: new Date().toISOString()
        }
      ],
      properties: {
        category: 'message',
        creators: [
          {
            address: body.senderWallet,
            share: 100
          }
        ]
      }
    }
    
    // Check if request wants JSON response with metadata
    const wantsJson = request.headers.get('accept')?.includes('application/json')
    
    if (wantsJson) {
      return NextResponse.json({
        imageBuffer: imageBuffer.toString('base64'),
        metadata,
        success: true
      })
    }
    
    // Return image buffer as response (default behavior)
    return new NextResponse(imageBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-NFT-Metadata': JSON.stringify(metadata)
      }
    })
    
  } catch (error) {
    console.error('Production NFT generation error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to generate production NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Production NFT Generation API',
    endpoint: '/api/generate-production-nft',
    method: 'POST',
    requiredFields: ['messageContent', 'senderWallet', 'recipientWallet'],
    optionalFields: ['sticker'],
    stickerOptions: STICKER_OPTIONS,
    textSpecs: {
      maxCharacters: TEXT_AREA.maxChars,
      maxFontSize: TEXT_AREA.maxFontSize,
      letterSpacing: `${TEXT_AREA.letterSpacing * 100}%`,
      lineHeight: `${TEXT_AREA.lineHeight * 100}%`,
      textArea: `${TEXT_AREA.width}x${TEXT_AREA.height}px`
    },
    layerOrder: [
      'White bg (bottom-left) - base layer',
      'Ticket edge (top-left)',
      'Stork branding (top-right)',
      'Under rip image (bottom-right)',
      'Paper rip (bottom-right)',
      'User text (center: x=38.82, y=246.21)',
      'Paper texture (bottom-right)',
      'Stickers (bottom-left) - top layer'
    ],
    imageSize: `${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
    format: 'PNG'
  })
}