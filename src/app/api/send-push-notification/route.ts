import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { recipientWallet, senderWallet, messagePreview, chatId } = await request.json()

    if (!recipientWallet) {
      return NextResponse.json(
        { error: 'Recipient wallet required' },
        { status: 400 }
      )
    }

    // Get all push subscriptions for the recipient
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('wallet_address', recipientWallet)

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No push subscriptions found' },
        { status: 200 }
      )
    }

    // Forward to Supabase Edge Function which handles Firebase credentials
    const edgeResponse = await fetch(`https://wicadttatwpzzzfefvsw.supabase.co/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
      },
      body: JSON.stringify({ recipientWallet, senderWallet, messagePreview, chatId })
    })

    const result = await edgeResponse.json()
    
    return NextResponse.json(result, { status: edgeResponse.status })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}