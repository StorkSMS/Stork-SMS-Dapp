import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    console.log('🧹 Cleaning up push subscriptions for wallet:', walletAddress)

    // Delete all existing subscriptions for this wallet
    const { error, count } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('wallet_address', walletAddress)

    if (error) {
      console.error('Error cleaning up push subscriptions:', error)
      return NextResponse.json(
        { error: 'Failed to cleanup subscriptions' },
        { status: 500 }
      )
    }

    console.log(`✅ Cleaned up ${count || 0} existing subscriptions for wallet:`, walletAddress)

    return NextResponse.json({ 
      success: true, 
      cleaned: count || 0,
      message: `Cleaned up ${count || 0} existing subscriptions`
    })
  } catch (error) {
    console.error('Push subscription cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}