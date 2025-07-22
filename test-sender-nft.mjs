import { createCanvas, loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Text area specifications for sender NFT
const SENDER_TEXT_AREA = {
  width: 988,
  height: 340,
  centerX: 48.35,
  centerY: 291.25,
  fontSize: 105, // Fixed font size
  letterSpacing: -0.07, // -7%
}

// Canvas dimensions
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

function applyLetterSpacing(ctx, text, x, y, letterSpacing) {
  let currentX = x
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    ctx.fillText(char, currentX, y)
    const charWidth = ctx.measureText(char).width
    currentX += charWidth + letterSpacing
  }
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
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

async function generateTestSenderNFT(request) {
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
    const framePath = path.join(__dirname, '/public/Nft-Build-Images/Sender NFT/Frame 11.png')
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
  
  // Draw text layer
  console.log('📝 Drawing text on canvas...')
  const fontSize = SENDER_TEXT_AREA.fontSize
  const letterSpacing = fontSize * SENDER_TEXT_AREA.letterSpacing
  
  console.log('🔤 Font size:', fontSize)
  console.log('📐 Letter spacing:', letterSpacing)
  
  // Set font - using Helvetica Neue with fallbacks (same as recipient production system)
  ctx.font = `500 ${fontSize}px "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  
  // Calculate text area position (following recipient NFT pattern)
  // centerX is actually the LEFT edge position, centerY is the vertical center
  const textBoxLeftX = SENDER_TEXT_AREA.centerX
  const textBoxCenterY = SENDER_TEXT_AREA.centerY
  const maxWidth = SENDER_TEXT_AREA.width
  
  console.log('🔧 DEBUG TEXT POSITIONING:')
  console.log('📍 SENDER_TEXT_AREA.centerX:', SENDER_TEXT_AREA.centerX)
  console.log('📍 SENDER_TEXT_AREA.centerY:', SENDER_TEXT_AREA.centerY) 
  console.log('📍 SENDER_TEXT_AREA.width:', SENDER_TEXT_AREA.width)
  console.log('📍 SENDER_TEXT_AREA.height:', SENDER_TEXT_AREA.height)
  console.log('📍 textBoxCenterY:', textBoxCenterY)
  console.log('📍 textBoxLeftX:', textBoxLeftX)
  
  // Wrap text
  const lines = wrapText(ctx, senderMessage, maxWidth)
  const lineHeight = fontSize * 1.2 // Standard line height for readability
  
  // Calculate starting Y position to center text vertically in the specified box
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
  
  console.log('✅ Production sender NFT generation completed')
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

async function testSenderNFT() {
  try {
    console.log('🧪 Testing sender NFT generation...')
    
    const testRequest = {
      messageContent: 'Hello! This is a test message for sender NFT generation.',
      senderWallet: '2jHkCvYwGSKHsjjBvGcnoXe8m1YngVWtEXpQQDfdmn1Q',
      recipientWallet: '6Ww1s3YG4Wz2wvzayamaK4rjwye8PKD2DyCqMY6vuBST'
    }
    
    console.log('📝 Test message:', testRequest.messageContent)
    console.log('💬 Expected text: "You started a conversation with ...vuBST"')
    
    const imageBuffer = await generateTestSenderNFT(testRequest)
    
    // Create test output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'public/test-sender-nft')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Save the generated image
    const filename = `sender-nft-test-${Date.now()}.png`
    const filepath = path.join(outputDir, filename)
    fs.writeFileSync(filepath, imageBuffer)
    
    console.log('✅ Test sender NFT generated successfully!')
    console.log('📁 Saved to:', filepath)
    console.log('🖼️ Image size:', imageBuffer.length, 'bytes')
    
    // Also save a copy with a fixed name for easy viewing
    const fixedFilepath = path.join(outputDir, 'latest-test.png')
    fs.writeFileSync(fixedFilepath, imageBuffer)
    console.log('📋 Latest test saved as:', fixedFilepath)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testSenderNFT()