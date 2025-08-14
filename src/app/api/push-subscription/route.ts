import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables:', {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, subscription } = await request.json()

    if (!walletAddress || !subscription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Extract subscription data
    const { endpoint, keys } = subscription
    const userAgent = request.headers.get('user-agent') || ''

    // Upsert subscription (update if exists, insert if not)
    // Since endpoint has a unique constraint, we need to handle the case where
    // the same device (endpoint) is used by different wallets
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        wallet_address: walletAddress,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'  // Changed to match the unique constraint
      })

    if (error) {
      console.error('Supabase error saving push subscription:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        walletAddress,
        endpoint
      })
      return NextResponse.json(
        { error: 'Failed to save subscription', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { walletAddress, endpoint } = await request.json()

    if (!walletAddress || !endpoint) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Delete subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .match({ 
        wallet_address: walletAddress,
        endpoint 
      })

    if (error) {
      console.error('Error deleting push subscription:', error)
      return NextResponse.json(
        { error: 'Failed to delete subscription' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Push subscription delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}