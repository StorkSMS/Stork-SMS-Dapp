import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json({ 
        error: 'Wallet address is required' 
      }, { status: 400 })
    }

    console.log(`🎉 API: Checking promotional participation for wallet: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`)

    const { data, error } = await supabaseServer
      .from('promotional_participants')
      .select('wallet_address, first_chat_created_at, chat_count')
      .eq('wallet_address', walletAddress)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - wallet did not participate
        console.log('📝 API: Wallet did not participate in promotional campaign')
        return NextResponse.json({
          isParticipant: false
        })
      }
      
      console.error('❌ API: Error checking promotional participation:', error)
      return NextResponse.json({
        isParticipant: false,
        error: 'Database error'
      })
    }

    if (data) {
      console.log('✅ API: Found promotional participant:', {
        firstChatAt: data.first_chat_created_at,
        chatCount: data.chat_count
      })
      
      return NextResponse.json({
        isParticipant: true,
        firstChatAt: data.first_chat_created_at,
        chatCount: data.chat_count
      })
    }

    return NextResponse.json({
      isParticipant: false
    })

  } catch (error) {
    console.error('❌ API: Error in promotional participant check:', error)
    return NextResponse.json({
      isParticipant: false,
      error: 'Server error'
    }, { status: 500 })
  }
}