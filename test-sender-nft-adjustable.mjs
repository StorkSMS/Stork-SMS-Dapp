import { createCanvas, loadImage } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ADJUSTABLE PARAMETERS - MODIFY THESE TO TEST DIFFERENT SETTINGS
// Using recipient system approach: dynamic font sizing starting at 160px
const BASE_FONT_SIZE = 110  // Increased font size
const TEXT_X_LEFT = 48.35   // Left edge of text box
const TEXT_Y_TOP = 291.25   // Top edge of text box (changed from center)
const TEXT_WIDTH = 988 // Max text width
const TEXT_HEIGHT = 340 // Text box height
const LETTER_SPACING_PERCENT = -0.07 // Reduced spacing (-7%)
const LINE_HEIGHT_RATIO = 0.94 // Match recipient system (was 1.2)

// Canvas dimensions
const CANVAS_WIDTH = 1080
const CANVAS_HEIGHT = 1080

// Dynamic font size calculation (copied from recipient system)
function calculateFontSize(characterCount) {
  const baseSize = BASE_FONT_SIZE
  
  if (characterCount <= 24) return baseSize
  if (characterCount <= 50) return baseSize * 0.85
  if (characterCount <= 100) return baseSize * 0.7
  if (characterCount <= 150) return baseSize * 0.6
  if (characterCount <= 200) return baseSize * 0.5
  if (characterCount <= 250) return baseSize * 0.4
  
  return baseSize * 0.35 // For 250+ characters
}

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

async function generateTestSenderNFT() {
  const recipientWallet = '6Ww1s3YG4Wz2wvzayamaK4rjwye8PKD2DyCqMY6vuBST'
  
  console.log('🎨 ADJUSTABLE SENDER NFT TEST')
  console.log('📱 Canvas dimensions:', CANVAS_WIDTH, 'x', CANVAS_HEIGHT)
  console.log('🔤 Base font size:', BASE_FONT_SIZE, '(dynamic scaling enabled)')
  console.log('📍 Text position: X(Left)=' + TEXT_X_LEFT + ', Y(Top)=' + TEXT_Y_TOP)
  console.log('📏 Text box size:', TEXT_WIDTH + 'x' + TEXT_HEIGHT)
  console.log('📐 Letter spacing:', (LETTER_SPACING_PERCENT * 100) + '%')
  console.log('📏 Line height ratio:', LINE_HEIGHT_RATIO)

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
  
  // Draw text layer with dynamic font sizing (like recipient system)
  const fontSize = calculateFontSize(senderMessage.length)
  const letterSpacing = fontSize * LETTER_SPACING_PERCENT
  
  console.log('📏 Message length:', senderMessage.length, 'characters')
  console.log('🔤 Calculated font size:', fontSize, 'px')
  console.log('📐 Letter spacing:', letterSpacing, 'px')
  
  // Set font - using Helvetica Neue medium weight with more specific name
  ctx.font = `500 ${fontSize}px "HelveticaNeue-Medium", "Helvetica Neue", "Helvetica", Arial, sans-serif`
  console.log('🔤 Font set to:', ctx.font)
  
  // Test what font is actually being used
  const testText = "Test"
  const arialWidth = (() => {
    ctx.font = `500 ${fontSize}px Arial`
    return ctx.measureText(testText).width
  })()
  
  const helveticaWidth = (() => {
    ctx.font = `500 ${fontSize}px "Helvetica Neue", Arial, sans-serif`
    return ctx.measureText(testText).width
  })()
  
  console.log('🔍 Arial width:', arialWidth, 'px')
  console.log('🔍 Helvetica Neue width:', helveticaWidth, 'px')
  console.log('🔍 Fonts match?', arialWidth === helveticaWidth ? 'YES (Helvetica Neue not available)' : 'NO (Helvetica Neue is working)')
  ctx.fillStyle = '#000000'  // Black text
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  
  // Position text using top-left coordinates
  const textBoxLeftX = TEXT_X_LEFT
  const textBoxTopY = TEXT_Y_TOP
  const maxWidth = TEXT_WIDTH
  
  console.log('📝 Drawing text...')
  
  // Check text measurements before wrapping
  const textMetrics = ctx.measureText(senderMessage)
  console.log('📐 Text width would be:', textMetrics.width, 'px (max allowed:', maxWidth, 'px)')
  
  // Wrap text
  const lines = wrapText(ctx, senderMessage, maxWidth)
  const lineHeight = fontSize * LINE_HEIGHT_RATIO // Use recipient system's line height ratio
  
  console.log('📏 Line height:', lineHeight, 'px')
  
  // Position text slightly above the bottom of the text box
  const totalTextHeight = lines.length * lineHeight
  const bottomPadding = 30 // Add padding from bottom
  const startY = textBoxTopY + TEXT_HEIGHT - totalTextHeight - bottomPadding
  
  console.log('📄 Drawing', lines.length, 'lines of text')
  console.log('🎯 Final startY:', startY)
  
  // Draw each line left-aligned
  lines.forEach((line, index) => {
    const currentY = startY + (index * lineHeight)
    console.log(`📍 Line ${index + 1}: "${line}" at X=${textBoxLeftX}, Y=${currentY}`)
    
    if (currentY >= 0 && currentY < CANVAS_HEIGHT) {
      // Left-aligned text with letter spacing
      applyLetterSpacing(ctx, line, textBoxLeftX, currentY, letterSpacing)
    }
  })
  
  // Add a red rectangle to show the text area boundaries for debugging
  ctx.strokeStyle = '#ff0000'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.strokeRect(TEXT_X_LEFT, TEXT_Y_TOP, TEXT_WIDTH, TEXT_HEIGHT)
  console.log('🔲 Added red dashed rectangle showing text area boundaries')
  
  console.log('✅ Test sender NFT generation completed')
  
  // Convert canvas to buffer
  return canvas.toBuffer('image/png')
}

async function testSenderNFT() {
  try {
    console.log('🧪 STARTING ADJUSTABLE SENDER NFT TEST...')
    
    const imageBuffer = await generateTestSenderNFT()
    
    // Create test output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'public/test-sender-nft')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Save the generated image with parameters in filename
    const filename = `test-f${BASE_FONT_SIZE}-dynamic-x${TEXT_X_LEFT}-y${TEXT_Y_TOP}.png`
    const filepath = path.join(outputDir, filename)
    fs.writeFileSync(filepath, imageBuffer)
    
    console.log('✅ Test sender NFT generated successfully!')
    console.log('📁 Saved to:', filepath)
    console.log('🖼️ Image size:', imageBuffer.length, 'bytes')
    
    // Also save as latest for easy viewing
    const fixedFilepath = path.join(outputDir, 'adjustable-test.png')
    fs.writeFileSync(fixedFilepath, imageBuffer)
    console.log('📋 Latest test saved as:', fixedFilepath)
    console.log('')
    console.log('💡 To adjust settings, edit the parameters at the top of test-sender-nft-adjustable.mjs')
    console.log('   - BASE_FONT_SIZE: Currently', BASE_FONT_SIZE, '(with dynamic scaling)')
    console.log('   - TEXT_X_LEFT: Currently', TEXT_X_LEFT) 
    console.log('   - TEXT_Y_TOP: Currently', TEXT_Y_TOP)
    console.log('   - LINE_HEIGHT_RATIO: Currently', LINE_HEIGHT_RATIO)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

testSenderNFT()