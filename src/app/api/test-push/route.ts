import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing push notification...')
    
    // Test with dummy data
    const testData = {
      recipientWallet: 'test-wallet-123',
      senderWallet: 'sender-wallet-456', 
      messagePreview: 'Test notification from Edge Function',
      chatId: 'test-chat-789'
    }

    console.log('Calling Edge Function with test data:', testData)

    // Call the Edge Function directly
    const edgeResponse = await fetch(`${request.nextUrl.origin}/.netlify/edge-functions/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })

    console.log('Edge Function response status:', edgeResponse.status)
    
    const result = await edgeResponse.text()
    console.log('Edge Function response:', result)
    
    return NextResponse.json({ 
      success: true,
      edgeStatus: edgeResponse.status,
      edgeResponse: result,
      testData
    })
  } catch (error) {
    console.error('Test push error:', error)
    return NextResponse.json(
      { error: 'Test failed', details: String(error) },
      { status: 500 }
    )
  }
}