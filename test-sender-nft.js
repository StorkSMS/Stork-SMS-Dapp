const { generateProductionSenderNFT } = require('./src/lib/generate-production-sender-nft.ts')
const fs = require('fs')
const path = require('path')

async function testSenderNFT() {
  try {
    console.log('🧪 Testing sender NFT generation...')
    
    const testRequest = {
      messageContent: 'Hello! This is a test message for sender NFT generation.',
      senderWallet: '2jHkCvYwGSKHsjjBvGcnoXe8m1YngVWtEXpQQDfdmn1Q',
      recipientWallet: '6Ww1s3YG4Wz2wvzayamaK4rjwye8PKD2DyCqMY6vuBST'
    }
    
    console.log('📝 Test message:', testRequest.messageContent)
    console.log('💬 Expected text: "You started a conversation with ...uBST"')
    
    const imageBuffer = await generateProductionSenderNFT(testRequest)
    
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