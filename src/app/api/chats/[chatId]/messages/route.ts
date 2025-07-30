import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase'

interface MessageResponse {
  id: string
  chat_id: string
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  message_type: 'text' | 'nft' | 'sticker' | 'voice' | 'image'
  nft_mint_address?: string
  nft_image_url?: string
  nft_metadata_url?: string
  transaction_signature?: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
  created_at: string
  metadata?: Record<string, unknown>
  encrypted: boolean
}

/**
 * Retrieve messages for a specific chat
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

    // Extract query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    console.log(`Retrieving messages for chat ${chatId}, user: ${walletAddress.slice(0, 8)}...`)

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

    // Fetch messages with pagination
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 })
    }

    // Process messages
    const processedMessages: MessageResponse[] = (messages || []).map(message => ({
      id: message.id,
      chat_id: message.chat_id,
      sender_wallet: message.sender_wallet,
      recipient_wallet: message.recipient_wallet,
      message_content: message.encrypted_content,
      message_type: message.message_type,
      nft_mint_address: message.nft_mint_address,
      nft_image_url: message.nft_image_url,
      nft_metadata_url: message.nft_metadata_url,
      transaction_signature: message.transaction_signature,
      // Include voice message fields
      file_url: message.file_url,
      file_name: message.file_name,
      file_size: message.file_size,
      file_type: message.file_type,
      created_at: message.created_at,
      metadata: message.metadata,
      encrypted: message.metadata?.encrypted === true
    }))

    // Get total count for pagination info
    const { count: totalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('chat_id', chatId)

    const responseData = {
      messages: processedMessages,
      pagination: {
        limit,
        offset,
        total: totalCount || 0,
        hasNext: (offset + limit) < (totalCount || 0),
        hasPrev: offset > 0
      },
      chat: {
        id: chat.id,
        sender_wallet: chat.sender_wallet,
        recipient_wallet: chat.recipient_wallet,
        created_at: chat.created_at
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Messages retrieval error:', error)
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 })
  }
}

/**
 * Create a new message in the chat
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
    
    console.log(`Creating message for chat ${chatId}, sender: ${walletAddress.slice(0, 8)}...`)

    // Get request body
    const body = await request.json()
    
    // Debug image message data
    if (body.message_type === 'image' || body.file_url || body.file_name) {
      console.log('📋 Image message API debug:', {
        message_type: body.message_type,
        file_url: body.file_url,
        file_name: body.file_name,
        file_size: body.file_size,
        file_type: body.file_type,
        hasMetadata: !!body.metadata,
        fullBody: body
      })
    }
    
    if (!body.message_content && body.message_type !== 'voice' && body.message_type !== 'image') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Validate recipient wallet if provided
    if (body.recipient_wallet && !body.recipient_wallet.match(/^[A-Za-z0-9]{32,44}$/)) {
      return NextResponse.json({ error: 'Invalid recipient wallet address' }, { status: 400 })
    }

    // Create message record (RLS will handle access control)
    const messageData = {
      chat_id: chatId,
      sender_wallet: walletAddress,
      recipient_wallet: body.recipient_wallet,
      encrypted_content: body.message_content,
      message_type: body.message_type || 'text',
      encryption_method: body.encrypt ? 'aes-gcm-browser' : 'none',
      nft_mint_address: body.nft_mint_address,
      nft_image_url: body.nft_image_url,
      nft_metadata_url: body.nft_metadata_url,
      transaction_signature: body.transaction_signature,
      // Voice message fields (using existing columns)
      file_url: body.file_url,
      file_name: body.file_name,
      file_size: body.file_size,
      file_type: body.file_type,
      // Metadata includes voice-specific data like duration and expires_at, plus optimistic_id for message matching
      metadata: {
        ...body.metadata,
        ...(body.optimistic_id ? { optimistic_id: body.optimistic_id } : {})
      }
    }

    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()

    if (messageError) {
      console.error('Message creation error:', messageError)
      console.error('Message data:', messageData)
      return NextResponse.json({ 
        error: 'Failed to create message', 
        details: messageError.message || 'Unknown database error',
        code: messageError.code || 'UNKNOWN'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { message: newMessage }
    })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}