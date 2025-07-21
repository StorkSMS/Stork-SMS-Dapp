import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase'

/**
 * Mark messages as read in a chat by updating the participant's last_read_message_id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
): Promise<NextResponse> {
  try {
    const { chatId } = await params
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
    }

    // Get wallet address and auth token from headers
    const walletAddress = request.headers.get('X-Wallet-Address')
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!walletAddress || !authToken) {
      return NextResponse.json({ error: 'Missing authentication headers' }, { status: 401 })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(walletAddress, authToken)

    // Get request body
    const body = await request.json()
    const { lastMessageId } = body
    
    if (!lastMessageId) {
      return NextResponse.json({ error: 'Last message ID is required' }, { status: 400 })
    }

    console.log(`Marking messages as read for chat ${chatId}, user: ${walletAddress.slice(0, 8)}..., up to message: ${lastMessageId}`)

    // Verify user has access to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const isParticipant = chat.sender_wallet === walletAddress || chat.recipient_wallet === walletAddress

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Verify the message exists and belongs to this chat
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, chat_id, created_at')
      .eq('id', lastMessageId)
      .eq('chat_id', chatId)
      .single()

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found in this chat' }, { status: 404 })
    }

    // Update or insert chat participant record with last read message
    const { data: participantData, error: participantError } = await supabase
      .from('chat_participants')
      .upsert({
        chat_id: chatId,
        wallet_address: walletAddress,
        nft_mint_address: walletAddress === chat.sender_wallet ? chat.sender_nft_mint : chat.recipient_nft_mint,
        last_read_message_id: lastMessageId,
        last_activity: new Date().toISOString(),
        nft_ownership_verified: true, // Assume verified for active participants
        is_active: true
      }, {
        onConflict: 'chat_id,wallet_address'
      })
      .select()

    if (participantError) {
      console.error('Chat participant update error:', participantError)
      return NextResponse.json({ 
        error: 'Failed to update read status', 
        details: participantError.message 
      }, { status: 500 })
    }

    // Broadcast read receipt event via real-time (this will trigger subscriptions)
    // The real-time subscription will pick up the change automatically

    return NextResponse.json({
      success: true,
      data: { 
        chatId,
        lastReadMessageId: lastMessageId,
        readAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
  }
}

/**
 * Get read receipt status for messages in a chat
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
): Promise<NextResponse> {
  try {
    const { chatId } = await params
    
    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
    }

    // Get wallet address and auth token from headers
    const walletAddress = request.headers.get('X-Wallet-Address')
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!walletAddress || !authToken) {
      return NextResponse.json({ error: 'Missing authentication headers' }, { status: 401 })
    }

    // Create authenticated Supabase client
    const supabase = createAuthenticatedSupabaseClient(walletAddress, authToken)

    console.log(`Getting read status for chat ${chatId}, user: ${walletAddress.slice(0, 8)}...`)

    // Verify user has access to this chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const isParticipant = chat.sender_wallet === walletAddress || chat.recipient_wallet === walletAddress

    if (!isParticipant) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Get all participants' read status
    const { data: participants, error: participantsError } = await supabase
      .from('chat_participants')
      .select(`
        wallet_address,
        last_read_message_id,
        last_activity
      `)
      .eq('chat_id', chatId)

    if (participantsError) {
      console.error('Participants fetch error:', participantsError)
      return NextResponse.json({ error: 'Failed to get read status' }, { status: 500 })
    }

    // Get the timestamps for last read messages
    const participantsWithTimestamps = await Promise.all(
      (participants || []).map(async (participant) => {
        let lastReadAt = null
        
        if (participant.last_read_message_id) {
          const { data: message } = await supabase
            .from('messages')
            .select('created_at')
            .eq('id', participant.last_read_message_id)
            .single()
          
          if (message) {
            lastReadAt = message.created_at
          }
        }
        
        return {
          walletAddress: participant.wallet_address,
          lastReadMessageId: participant.last_read_message_id,
          lastReadAt,
          lastActivity: participant.last_activity
        }
      })
    )

    // Format response
    const readStatus = participantsWithTimestamps

    return NextResponse.json({
      success: true,
      data: { readStatus }
    })

  } catch (error) {
    console.error('Get read status error:', error)
    return NextResponse.json({ error: 'Failed to get read status' }, { status: 500 })
  }
}