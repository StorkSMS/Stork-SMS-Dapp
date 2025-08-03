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

    // Call the Supabase Edge Function directly
    const edgeResponse = await fetch(`https://wicadttatwpzzzfefvsw.supabase.co/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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