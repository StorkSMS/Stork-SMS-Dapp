import { NextRequest, NextResponse } from 'next/server'
import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas'
import path from 'path'
import fs from 'fs'

// IMMEDIATELY OVERRIDE SelfWritten with our Helvetica fonts
try {
  console.log('🚨 API ROUTE: Overriding SelfWritten with Helvetica fonts IMMEDIATELY')
  
  // Try both font files
  const fontPaths = [
    path.join(process.cwd(), 'public/HelveticaNeue.ttc'),
    path.join(process.cwd(), 'public/HelveticaNeueMedium.otf')
  ]
  
  let fontRegistered = false
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      console.log('✅ API ROUTE: Found font file, registering as SelfWritten override:', fontPath)
      
      // NUCLEAR OPTION: Override SelfWritten completely at module load time
      registerFont(fontPath, { family: 'SelfWritten' })
      registerFont(fontPath, { family: 'Helvetica Neue' })
      registerFont(fontPath, { family: 'HelveticaNeue-Medium' })
      
      console.log('🎯 API ROUTE: SelfWritten has been HIJACKED with Helvetica font!')
      fontRegistered = true
      break
    }
  }
  
  if (!fontRegistered) {
    console.error('❌ API ROUTE: No Helvetica fonts found - SelfWritten will interfere!')
  }
} catch (error) {
  console.error('❌ API ROUTE: Error hijacking SelfWritten:', error)
}

interface GenerateProductionSenderNFTRequest {
  messageContent: string
  senderWallet: string
  recipientWallet: string
}

// Canvas dimensions
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Text area specifications for sender NFT
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

async function generateProductionSenderNFT(request: GenerateProductionSenderNFTRequest): Promise<Buffer> {
  const { recipientWallet } = request
  
  console.log('🎨 Starting production sender NFT generation...')
  console.log('📱 Canvas dimensions:', CANVAS_WIDTH, 'x', CANVAS_HEIGHT)
  console.log('🎨 Sender text area specs:', SENDER_TEXT_AREA)

  // Create canvas
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT)
  const ctx = canvas.getContext('2d')

  // Set up initial canvas with transparent background
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  console.log('🖼️ Loading Frame 11.png base layer...')
  
  // Load and draw Frame 11.png as base layer
  try {
    const framePath = path.join(process.cwd(), '/public/Nft-Build-Images/Sender NFT/Frame 11.png')
    const frameImage = await loadImage(framePath)
    
    // Draw the frame at full canvas size
    ctx.drawImage(frameImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    console.log('✅ Frame 11.png loaded and drawn successfully')
    
  } catch (error) {
    console.error('CRITICAL: Could not load Frame 11.png:', error)
    throw new Error('Failed to load sender NFT base frame')
  }
  
  // Generate sender text message
  const last5Chars = recipientWallet.slice(-5)
  const senderMessage = `You started a conversation with ...${last5Chars}`
  
  console.log('📝 Sender message:', senderMessage)
  
  // Draw text layer with dynamic font sizing (like recipient system)
  console.log('📝 Drawing text on canvas...')
  const fontSize = calculateFontSize(senderMessage.length)
  const letterSpacing = fontSize * SENDER_TEXT_AREA.letterSpacing
  
  console.log('📏 Message length:', senderMessage.length, 'characters')
  console.log('🔤 Calculated font size:', fontSize, 'px (from base', SENDER_TEXT_AREA.baseFontSize + 'px)')
  console.log('📐 Letter spacing:', letterSpacing, 'px')
  
  // Set font - using Helvetica Neue medium weight with more specific name
  ctx.font = `500 ${fontSize}px "HelveticaNeue-Medium", "Helvetica Neue", "Helvetica", Arial, sans-serif`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  
  // Calculate text area position from top-left coordinates
  const textBoxLeftX = SENDER_TEXT_AREA.leftX  
  const textBoxTopY = SENDER_TEXT_AREA.topY
  const maxWidth = SENDER_TEXT_AREA.width
  
  console.log('🔧 DEBUG TEXT POSITIONING:')
  console.log('📍 SENDER_TEXT_AREA.leftX:', SENDER_TEXT_AREA.leftX)
  console.log('📍 SENDER_TEXT_AREA.topY:', SENDER_TEXT_AREA.topY) 
  console.log('📍 SENDER_TEXT_AREA.width:', SENDER_TEXT_AREA.width)
  console.log('📍 SENDER_TEXT_AREA.height:', SENDER_TEXT_AREA.height)
  console.log('📍 textBoxTopY:', textBoxTopY)
  console.log('📍 textBoxLeftX:', textBoxLeftX)
  
  // Wrap text
  const lines = wrapText(ctx, senderMessage, maxWidth)
  const lineHeight = fontSize * SENDER_TEXT_AREA.lineHeight // Use recipient system's line height ratio
  
  // Position text at the bottom of the text box with padding
  const totalTextHeight = lines.length * lineHeight
  const bottomPadding = 30 // Add padding from bottom
  const startY = textBoxTopY + SENDER_TEXT_AREA.height - totalTextHeight - bottomPadding
  
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
  
  console.log('✅ Production sender NFT generation completed')
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateProductionSenderNFTRequest = await request.json()
    
    // Validate required fields
    if (!body.messageContent || !body.senderWallet || !body.recipientWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: messageContent, senderWallet, recipientWallet' },
        { status: 400 }
      )
    }
    
    // Validate wallet addresses (basic format check)
    if (body.recipientWallet.length < 32) {
      return NextResponse.json(
        { error: 'Invalid recipient wallet address format' },
        { status: 400 }
      )
    }
    
    console.log('🚀 Production sender NFT generation request received')
    
    // Generate production sender NFT image
    const imageBuffer = await generateProductionSenderNFT(body)
    
    console.log('📦 Sender NFT image generated, buffer size:', imageBuffer.length, 'bytes')
    
    return NextResponse.json({
      success: true,
      imageBuffer: imageBuffer.toString('base64'),
      size: imageBuffer.length,
      dimensions: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
      },
      textSpecs: SENDER_TEXT_AREA
    })
    
  } catch (error) {
    console.error('Production sender NFT generation error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate production sender NFT',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Production Sender NFT Generation API',
    endpoint: '/api/generate-production-sender-nft',
    method: 'POST',
    requiredFields: ['messageContent', 'senderWallet', 'recipientWallet'],
    specifications: {
      canvas: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT
      },
      baseAsset: 'Frame 11.png',
      font: {
        family: 'Helvetica Neue with system fallbacks',
        size: SENDER_TEXT_AREA.baseFontSize,
        weight: 500,
        letterSpacing: `${SENDER_TEXT_AREA.letterSpacing * 100}%`,
        color: '#000000'
      },
      textArea: SENDER_TEXT_AREA,
      textContent: 'You started a conversation with ...(last 5 chars of recipient wallet)'
    }
  })
}