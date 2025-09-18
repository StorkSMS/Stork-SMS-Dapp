import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TrophyResponse, TrophyStats } from '@/types/trophies'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 }, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format (basic check)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return NextResponse.json(
        { success: false, stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 }, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    console.log(`🏆 Fetching trophy stats for wallet: ${walletAddress.slice(0, 8)}...`)

    // Query for Early Adopter trophy: NFT chats STARTED by user before Sept 18, 2025
    const earlyAdopterCutoff = '2025-09-18T00:00:00Z'

    const { data: earlyAdopterChats, error: earlyAdopterError } = await supabase
      .from('chats')
      .select('id, created_at, sender_wallet')
      .eq('sender_wallet', walletAddress)
      .lt('created_at', earlyAdopterCutoff)
      .eq('is_active', true)

    if (earlyAdopterError) {
      console.error('❌ Error fetching early adopter chats:', earlyAdopterError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const earlyAdopterCount = earlyAdopterChats?.length || 0

    // Query for Chatter Box trophy: Total chats started by user (all time)
    const { data: chatterBoxChats, error: chatterBoxError } = await supabase
      .from('chats')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .eq('is_active', true)

    if (chatterBoxError) {
      console.error('❌ Error fetching chatter box chats:', chatterBoxError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const chatterBoxCount = chatterBoxChats?.length || 0

    // Query for Fledgling trophy: Has user started at least 1 chat?
    const fledglingCount = chatterBoxCount >= 1 ? 1 : 0

    // Query for Tweeter trophy: Chats started with over 280 characters
    const { data: tweeterChats, error: tweeterError } = await supabase
      .from('chats')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .gt('initial_message_length', 280)
      .eq('is_active', true)

    if (tweeterError) {
      console.error('❌ Error fetching tweeter chats:', tweeterError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const tweeterCount = tweeterChats?.length || 0

    // Query for Sticker Collector trophy: Messages with sticker type
    const { data: stickerMessages, error: stickerError } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .eq('message_type', 'sticker')

    if (stickerError) {
      console.error('❌ Error fetching sticker messages:', stickerError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const stickerCollectorCount = stickerMessages?.length || 0

    // Query for Can you hear me trophy: Messages with voice type
    const { data: voiceMessages, error: voiceError } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .eq('message_type', 'voice')

    if (voiceError) {
      console.error('❌ Error fetching voice messages:', voiceError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const canYouHearMeCount = voiceMessages?.length || 0

    // Query for Look at this trophy: Messages with image type
    const { data: imageMessages, error: imageError } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .eq('message_type', 'image')

    if (imageError) {
      console.error('❌ Error fetching image messages:', imageError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const lookAtThisCount = imageMessages?.length || 0

    // Query for Future Millionaire trophy: Chats paid for with STORK tokens
    const { data: storkChats, error: storkError } = await supabase
      .from('chats')
      .select('id')
      .eq('sender_wallet', walletAddress)
      .eq('payment_method', 'STORK')
      .eq('is_active', true)

    if (storkError) {
      console.error('❌ Error fetching STORK payment chats:', storkError)
      return NextResponse.json(
        {
          success: false,
          stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
          error: 'Failed to fetch trophy data'
        },
        { status: 500 }
      )
    }

    const futureMillionaireCount = storkChats?.length || 0

    // Query for Onboarder trophy: Users who were contacted by this wallet first, then started their own chats
    // TODO: Implement onboarder trophy logic properly - for now setting to 0 to avoid errors
    const onboarderCount = 0

    console.log(`🏆 Trophy stats for ${walletAddress.slice(0, 8)}...:`, {
      earlyAdopterCount,
      earlyAdopterCutoff,
      chatterBoxCount,
      fledglingCount,
      tweeterCount,
      stickerCollectorCount,
      canYouHearMeCount,
      lookAtThisCount,
      futureMillionaireCount,
      onboarderCount
    })

    const stats: TrophyStats = {
      earlyAdopterCount,
      onboarderCount,
      chatterBoxCount,
      fledglingCount,
      tweeterCount,
      stickerCollectorCount,
      canYouHearMeCount,
      lookAtThisCount,
      futureMillionaireCount
    }

    const response: TrophyResponse = {
      success: true,
      stats
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Unexpected error in trophies API:', error)
    return NextResponse.json(
      {
        success: false,
        stats: { earlyAdopterCount: 0, onboarderCount: 0, chatterBoxCount: 0, fledglingCount: 0, tweeterCount: 0, stickerCollectorCount: 0, canYouHearMeCount: 0, lookAtThisCount: 0, futureMillionaireCount: 0 },
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}