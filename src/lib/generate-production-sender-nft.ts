import { createCanvas, loadImage, CanvasRenderingContext2D, registerFont } from 'canvas'
import path from 'path'
import fs from 'fs'

interface GenerateProductionSenderNFTRequest {
  messageContent: string
  senderWallet: string
  recipientWallet: string
}

// Canvas dimensions
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Text area specifications for sender NFT (using recipient system approach)
const SENDER_TEXT_AREA = {
  width: 988,
  height: 340,
  leftX: 48.35,       // Left edge of text box
  topY: 291.25,       // Top edge of text box  
  baseFontSize: 110,  // Base font size (dynamic scaling like recipient)
  letterSpacing: -0.07, // -7%
  lineHeight: 0.94,   // Match recipient system (was 1.2)
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

// Use the Helvetica font files from public directory and OVERRIDE SelfWritten
try {
  console.log('🚨 SENDER: Using project Helvetica fonts and overriding SelfWritten')
  
  // Try both font files - the .ttc collection and the specific medium .otf
  const fontPaths = [
    path.join(process.cwd(), 'public/HelveticaNeue.ttc'),
    path.join(process.cwd(), 'public/HelveticaNeueMedium.otf')
  ]
  
  let fontRegistered = false
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      console.log('✅ SENDER: Found font file:', fontPath)
      
      // Register with ALL the family names to ensure it's used
      registerFont(fontPath, { family: 'Helvetica Neue', weight: '500' })
      registerFont(fontPath, { family: 'HelveticaNeue-Medium', weight: '500' })
      registerFont(fontPath, { family: 'Helvetica' })
      registerFont(fontPath, { family: 'Arial' })
      registerFont(fontPath, { family: 'sans-serif' })
      
      // NUCLEAR OPTION: Override SelfWritten completely
      registerFont(fontPath, { family: 'SelfWritten' })
      
      console.log('🎯 SENDER: Successfully registered font as ALL families including SelfWritten override!')
      fontRegistered = true
      break // Use the first font file found
    }
  }
  
  if (!fontRegistered) {
    console.error('❌ SENDER: No Helvetica font files found in public directory!')
  }
} catch (error) {
  console.error('❌ SENDER: Error registering Helvetica fonts:', error)
}

export async function generateProductionSenderNFT(request: GenerateProductionSenderNFTRequest): Promise<Buffer> {
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
  
  // Set font - using our registered HelveticaNeue.ttc (which has overridden SelfWritten)
  const fontString = `500 ${fontSize}px "HelveticaNeue-Medium", "Helvetica Neue", Helvetica, Arial, sans-serif`
  console.log('🎯 SENDER: Setting font to:', fontString)
  console.log('🎯 SENDER: Using project HelveticaNeue.ttc - SelfWritten is OVERRIDDEN!')
  ctx.font = fontString
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