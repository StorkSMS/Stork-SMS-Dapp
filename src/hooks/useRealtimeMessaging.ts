import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { getAuthenticatedClient, subscribeToMessages, subscribeToChats, subscribeToReadReceipts } from '@/lib/supabase'
import { useMessageEncryption } from '@/lib/message-encryption'
import { useAuth } from '@/contexts/AuthContext'
import type { Message, Conversation } from '@/types/messaging'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeMessagingState {
  conversations: Conversation[]
  currentChatMessages: Message[]
  isLoadingConversations: boolean
  isLoadingMessages: boolean
  error: string | null
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  readReceipts: Record<string, string> // messageId -> lastReadByWallet
  unreadThreads: Set<string> // chatIds with unread messages
}

interface SendMessageParams {
  chatId: string
  content: string
  recipientWallet: string
  encrypt?: boolean
  messageType?: 'text' | 'image' | 'file' | 'system' | 'nft' | 'sticker' | 'voice'
  metadata?: Record<string, any>
  // Voice message file fields
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
}

export const useRealtimeMessaging = () => {
  const { publicKey, connected } = useWallet()
  const { isAuthenticated } = useAuth()
  const { decryptFromChat, checkIfEncrypted, encryptForChat } = useMessageEncryption()
  
  const [state, setState] = useState<RealtimeMessagingState>({
    conversations: [],
    currentChatMessages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,
    error: null,
    connectionStatus: 'disconnected',
    readReceipts: {},
    unreadThreads: new Set<string>()
  })

  const conversationsChannelRef = useRef<RealtimeChannel | null>(null)
  const messagesChannelRef = useRef<RealtimeChannel | null>(null)
  const readReceiptsChannelRef = useRef<RealtimeChannel | null>(null)
  const currentChatIdRef = useRef<string | null>(null)
  const messageCallbackRef = useRef<((message: Message, isFromCurrentUser: boolean) => void) | null>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  
  // Subscription state management
  const [subscriptionState, setSubscriptionState] = useState({
    conversations: 'disconnected',
    messages: 'disconnected',
    lastConnected: null as Date | null,
    retryCount: 0
  })
  
  // Stable authentication state with ref-based auth check to prevent over-reactivity
  const authStateRef = useRef({ connected: false, publicKey: null as typeof publicKey, isAuthenticated: false })
  authStateRef.current = { connected, publicKey, isAuthenticated }
  
  const isReadyForSubscription = useMemo(() => {
    return connected && publicKey && isAuthenticated
  }, [connected, publicKey, isAuthenticated])

  // We'll define the connection health monitoring after all the callback definitions

  // Helper to process and decrypt messages - stabilized to prevent recreation
  const processMessage = useCallback(async (rawMessage: any, participants: string[]): Promise<Message> => {
    let messageContent = rawMessage.encrypted_content
    let isEncrypted = false

    // Early return for unencrypted messages to avoid unnecessary processing
    if (!rawMessage.metadata?.encrypted && !checkIfEncrypted(rawMessage.encrypted_content)) {
      // Message is not encrypted, return as-is
      const baseMessage = {
        id: rawMessage.id,
        chat_id: rawMessage.chat_id,
        sender_wallet: rawMessage.sender_wallet,
        recipient_wallet: rawMessage.recipient_wallet,
        message_content: messageContent,
        encrypted: false,
        created_at: rawMessage.created_at,
        updated_at: rawMessage.created_at
      }

      if (rawMessage.message_type === 'nft') {
        return {
          ...baseMessage,
          type: 'nft' as const,
          nft_mint_address: rawMessage.nft_mint_address || '',
          nft_image_url: rawMessage.nft_image_url || '',
          nft_metadata_url: rawMessage.nft_metadata_url || '',
          transaction_signature: rawMessage.transaction_signature || ''
        }
      }
      
      if (rawMessage.message_type === 'sticker') {
        return {
          ...baseMessage,
          type: 'sticker' as const,
          sticker_name: rawMessage.metadata?.sticker_name || rawMessage.sticker_metadata?.sticker_name || 'unknown-sticker',
          sticker_url: rawMessage.metadata?.sticker_url || rawMessage.sticker_metadata?.sticker_url,
          sticker_metadata: rawMessage.sticker_metadata
        }
      }

      if (rawMessage.message_type === 'voice') {
        return {
          ...baseMessage,
          type: 'voice' as const,
          file_url: rawMessage.file_url || '',
          file_name: rawMessage.file_name || 'voice_message.mp4',
          file_size: rawMessage.file_size || 0,
          file_type: rawMessage.file_type || 'audio/mp4',
          duration: rawMessage.metadata?.duration || 0,
          expires_at: rawMessage.metadata?.expires_at || ''
        }
      }
      
      return {
        ...baseMessage,
        type: rawMessage.message_type as 'text' | 'image' | 'file' | 'system'
      }
    }

    // Message is encrypted, process decryption
    isEncrypted = true
    
    try {
      const decryptResult = await decryptFromChat(
        rawMessage.encrypted_content,
        rawMessage.chat_id,
        participants
      )
      
      if (decryptResult.success) {
        messageContent = decryptResult.decryptedContent
      } else {
        messageContent = '[Encrypted Message]'
      }
    } catch (error) {
      console.error('Decryption failed for message:', rawMessage.id, error)
      messageContent = '[Decryption Failed]'
    }

    // Return the processed message
    const baseMessage = {
      id: rawMessage.id,
      chat_id: rawMessage.chat_id,
      sender_wallet: rawMessage.sender_wallet,
      recipient_wallet: rawMessage.recipient_wallet,
      message_content: messageContent,
      encrypted: isEncrypted,
      created_at: rawMessage.created_at,
      updated_at: rawMessage.created_at
    }

    if (rawMessage.message_type === 'nft') {
      return {
        ...baseMessage,
        type: 'nft' as const,
        nft_mint_address: rawMessage.nft_mint_address || '',
        nft_image_url: rawMessage.nft_image_url || '',
        nft_metadata_url: rawMessage.nft_metadata_url || '',
        transaction_signature: rawMessage.transaction_signature || ''
      }
    }
    
    if (rawMessage.message_type === 'sticker') {
      return {
        ...baseMessage,
        type: 'sticker' as const,
        sticker_name: rawMessage.metadata?.sticker_name || rawMessage.sticker_metadata?.sticker_name || 'unknown-sticker',
        sticker_url: rawMessage.metadata?.sticker_url || rawMessage.sticker_metadata?.sticker_url,
        sticker_metadata: rawMessage.sticker_metadata
      }
    }

    if (rawMessage.message_type === 'voice') {
      return {
        ...baseMessage,
        type: 'voice' as const,
        file_url: rawMessage.file_url || '',
        file_name: rawMessage.file_name || 'voice_message.mp4',
        file_size: rawMessage.file_size || 0,
        file_type: rawMessage.file_type || 'audio/mp4',
        duration: rawMessage.metadata?.duration || 0,
        expires_at: rawMessage.metadata?.expires_at || ''
      }
    }
    
    return {
      ...baseMessage,
      type: rawMessage.message_type as 'text' | 'image' | 'file' | 'system'
    }
  }, [decryptFromChat, checkIfEncrypted]) // Include encryption hook dependencies for proper functionality

  // Load user's conversations with retry mechanism - stabilized to prevent infinite re-creation
  const loadConversations = useCallback(async (retryCount = 0) => {
    // Use current auth state to prevent stale closure dependencies
    const currentAuth = authStateRef.current
    if (!currentAuth.connected || !currentAuth.publicKey || !currentAuth.isAuthenticated) {
      console.log('🚫 loadConversations blocked - Missing requirements:', {
        connected: currentAuth.connected,
        hasPublicKey: !!currentAuth.publicKey,
        isAuthenticated: currentAuth.isAuthenticated,
        timestamp: new Date().toISOString()
      })
      setState(prev => ({ 
        ...prev, 
        error: 'Please connect and authenticate your wallet to load chats',
        isLoadingConversations: false 
      }))
      return
    }

    console.log('✅ loadConversations - All authentication requirements met:', {
      connected: currentAuth.connected,
      hasPublicKey: !!currentAuth.publicKey,
      isAuthenticated: currentAuth.isAuthenticated,
      timestamp: new Date().toISOString()
    })

    setState(prev => ({ ...prev, isLoadingConversations: true, error: null }))

    try {
      const walletAddress = currentAuth.publicKey.toString()
      console.log('🔍 Loading conversations for wallet:', walletAddress.slice(0, 8) + '...')
      
      // Debug localStorage state
      const storedAuthData = localStorage.getItem(`auth_token_${walletAddress}`)
      console.log('💾 localStorage auth check:', {
        hasStoredData: !!storedAuthData,
        storageKeys: Object.keys(localStorage).filter(k => k.startsWith('auth_token_')),
        walletAddress: walletAddress.slice(0, 8) + '...'
      })
      
      if (!storedAuthData) {
        throw new Error(`No auth token found in localStorage for wallet ${walletAddress.slice(0, 8)}...`)
      }
      
      // Get authenticated client
      console.log('🔐 Creating authenticated Supabase client...')
      const supabaseClient = getAuthenticatedClient()
      console.log('✅ Authenticated Supabase client created successfully')
      
      // Use authenticated Supabase client with optimized parallel queries
      console.log('📊 Executing optimized parallel queries...')
      const startTime = performance.now()
      
      // Parallel query execution - much faster than nested selects
      const [chatsResult, latestMessagesResult] = await Promise.all([
        // Query 1: Get chats (lightweight)
        supabaseClient
          .from('chats')
          .select('id, sender_wallet, recipient_wallet, created_at')
          .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
          .order('created_at', { ascending: false }),
        
        // Query 2: Get latest message per chat using a subquery approach
        supabaseClient
          .from('messages')
          .select(`
            chat_id,
            id,
            encrypted_content,
            message_type,
            created_at,
            sender_wallet,
            nft_mint_address,
            nft_image_url,
            nft_metadata_url,
            transaction_signature,
            recipient_wallet
          `)
          .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
          .order('created_at', { ascending: false })
      ])
      
      const queryTime = performance.now() - startTime
      console.log(`⚡ Parallel queries completed in ${queryTime.toFixed(2)}ms`)

      const { data: chats, error: chatsError } = chatsResult
      const { data: allMessages, error: messagesError } = latestMessagesResult

      if (chatsError) throw chatsError
      if (messagesError) throw messagesError

      console.log('📋 Parallel query results:', { 
        chatCount: chats?.length || 0, 
        messageCount: allMessages?.length || 0,
        queryTime: `${queryTime.toFixed(2)}ms`,
        walletAddress: walletAddress.slice(0, 8) + '...',
        timestamp: new Date().toISOString()
      })

      // Create efficient mapping of latest message per chat
      console.log('🔄 Creating message mapping and transforming conversations...')
      const latestMessagesByChat = new Map<string, any>()
      
      // Group messages by chat and find the latest one for each
      if (allMessages) {
        const messagesByChat = allMessages.reduce((acc, message) => {
          if (!acc[message.chat_id]) {
            acc[message.chat_id] = []
          }
          acc[message.chat_id].push(message)
          return acc
        }, {} as Record<string, any[]>)
        
        // Get the latest message for each chat
        Object.entries(messagesByChat).forEach(([chatId, messages]) => {
          const sortedMessages = messages.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          if (sortedMessages.length > 0) {
            latestMessagesByChat.set(chatId, sortedMessages[0])
          }
        })
      }

      // Transform to conversations format with optimized lookup
      const conversations: Conversation[] = (chats || []).map(chat => {
        const participants = [chat.sender_wallet, chat.recipient_wallet]
        const latestMsg = latestMessagesByChat.get(chat.id)
        
        // Create Message object from latest message (much more efficient than nested queries)
        const lastMessage = latestMsg ? (() => {
          const baseMessage = {
            id: latestMsg.id,
            chat_id: chat.id,
            sender_wallet: latestMsg.sender_wallet,
            recipient_wallet: latestMsg.recipient_wallet || participants.find(p => p !== latestMsg.sender_wallet) || '',
            message_content: latestMsg.encrypted_content,
            encrypted: false,
            created_at: latestMsg.created_at,
            updated_at: latestMsg.created_at
          }

          if (latestMsg.message_type === 'nft') {
            return {
              ...baseMessage,
              type: 'nft' as const,
              nft_mint_address: latestMsg.nft_mint_address || '',
              nft_image_url: latestMsg.nft_image_url || '',
              nft_metadata_url: latestMsg.nft_metadata_url || '',
              transaction_signature: latestMsg.transaction_signature || ''
            };
          }
          
          return {
            ...baseMessage,
            type: latestMsg.message_type as 'text' | 'image' | 'file' | 'system' | 'sticker' | 'voice'
          };
        })() as Message : undefined

        return {
          id: chat.id,
          participants,
          last_message: lastMessage,
          last_activity: lastMessage?.created_at || chat.created_at,
          message_count: 1, // We only have latest message, could be optimized with a count query if needed
          metadata: {}
        }
      })

      console.log('✅ Conversations transformed:', { 
        conversationCount: conversations.length,
        conversations: conversations.map(c => ({
          id: c.id,
          participants: c.participants.map(p => p.slice(0, 8) + '...'),
          messageCount: c.message_count,
          hasLastMessage: !!c.last_message
        }))
      })

      // Load unread counts for all conversations in parallel
      console.log('🔢 Loading unread counts for', conversations.length, 'conversations')
      let unreadChatIds = new Set<string>()
      
      if (conversations.length > 0) {
        try {
          const unreadCountPromises = conversations.map(async (conv) => {
            try {
              const { data: unreadCount, error } = await supabaseClient
                .rpc('get_unread_count', {
                  p_chat_id: conv.id,
                  p_wallet_address: walletAddress
                })

              if (error) {
                console.error(`Failed to get unread count for chat ${conv.id}:`, error)
                return { chatId: conv.id, count: 0 }
              }

              return { chatId: conv.id, count: unreadCount || 0 }
            } catch (error) {
              console.error(`Error checking unread count for chat ${conv.id}:`, error)
              return { chatId: conv.id, count: 0 }
            }
          })

          const unreadResults = await Promise.all(unreadCountPromises)
          
          unreadResults.forEach(result => {
            if (result.count > 0) {
              unreadChatIds.add(result.chatId)
              console.log(`📨 Chat ${result.chatId} has ${result.count} unread messages`)
            }
          })

          console.log('✅ Loaded unread counts:', {
            totalChats: conversations.length,
            unreadChats: unreadChatIds.size,
            unreadChatIds: Array.from(unreadChatIds)
          })
        } catch (error) {
          console.error('❌ Failed to load unread counts, proceeding with empty set:', error)
        }
      }

      setState(prev => ({
        ...prev,
        conversations,
        unreadThreads: unreadChatIds,
        isLoadingConversations: false
      }))

      console.log('💾 Conversations and unread counts saved to state atomically')

    } catch (error) {
      console.error(`❌ Failed to load conversations (attempt ${retryCount + 1}):`, error)
      
      // Add more detailed error information
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          cause: (error as any).cause,
          retryCount
        })
      }
      
      // Retry logic: retry up to 2 times with exponential backoff
      const maxRetries = 2
      if (retryCount < maxRetries) {
        const retryDelay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`🔄 Retrying conversation loading in ${retryDelay}ms... (${retryCount + 1}/${maxRetries})`)
        
        setState(prev => ({
          ...prev,
          isLoadingConversations: false,
          error: `Loading failed, retrying in ${retryDelay / 1000}s... (${retryCount + 1}/${maxRetries})`
        }))
        
        setTimeout(() => {
          // Only retry if still authenticated using ref to avoid stale closure
          const currentAuth = authStateRef.current
          if (currentAuth.connected && currentAuth.publicKey && currentAuth.isAuthenticated) {
            loadConversations(retryCount + 1)
          }
        }, retryDelay)
      } else {
        // Final failure after all retries
        setState(prev => ({
          ...prev,
          isLoadingConversations: false,
          error: error instanceof Error ? 
            `Failed to load conversations after ${maxRetries + 1} attempts: ${error.message}` : 
            `Failed to load conversations after ${maxRetries + 1} attempts`
        }))
      }
    }
  }, [processMessage]) // Include processMessage dependency for proper message processing

  // Load unread counts for all conversations
  const loadUnreadCounts = useCallback(async () => {
    const currentAuth = authStateRef.current
    if (!currentAuth.connected || !currentAuth.publicKey || !currentAuth.isAuthenticated) {
      console.log('🚫 loadUnreadCounts blocked - Missing requirements:', {
        connected: currentAuth.connected,
        hasPublicKey: !!currentAuth.publicKey,
        isAuthenticated: currentAuth.isAuthenticated
      })
      return new Set<string>()
    }

    try {
      const walletAddress = currentAuth.publicKey.toString()
      console.log('🔢 Loading unread counts for wallet:', walletAddress.slice(0, 8) + '...')
      
      const supabaseClient = getAuthenticatedClient()
      
      // Get all chats for this user first
      const { data: chats, error: chatsError } = await supabaseClient
        .from('chats')
        .select('id')
        .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)

      if (chatsError) throw chatsError

      if (!chats || chats.length === 0) {
        console.log('📋 No chats found for unread count check')
        return new Set<string>()
      }

      // Get unread counts for each chat using the database function
      const unreadChatIds = new Set<string>()
      
      await Promise.all(
        chats.map(async (chat) => {
          try {
            const { data: unreadCount, error } = await supabaseClient
              .rpc('get_unread_count', {
                p_chat_id: chat.id,
                p_wallet_address: walletAddress
              })

            if (error) {
              console.error(`Failed to get unread count for chat ${chat.id}:`, error)
              return
            }

            if (unreadCount && unreadCount > 0) {
              unreadChatIds.add(chat.id)
              console.log(`📨 Chat ${chat.id} has ${unreadCount} unread messages`)
            }
          } catch (error) {
            console.error(`Error checking unread count for chat ${chat.id}:`, error)
          }
        })
      )

      console.log('✅ Loaded unread counts:', {
        totalChats: chats.length,
        unreadChats: unreadChatIds.size,
        unreadChatIds: Array.from(unreadChatIds)
      })

      return unreadChatIds

    } catch (error) {
      console.error('❌ Failed to load unread counts:', error)
      return new Set<string>()
    }
  }, [])

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (chatId: string, lastMessageId: string) => {
    if (!connected || !publicKey || !isAuthenticated) {
      console.log('🚫 Cannot mark messages as read - not authenticated')
      return
    }

    try {
      const walletAddress = publicKey.toString()
      const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
      
      if (!storedData) {
        console.error('No authentication token available for marking messages as read')
        return
      }
      
      const authData = JSON.parse(storedData)
      const authToken = authData.token

      if (!authToken) {
        console.error('No authentication token available for marking messages as read')
        return
      }

      console.log('📖 Marking messages as read:', { chatId, lastMessageId })

      const response = await fetch(`/api/chats/${chatId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          lastMessageId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('❌ Mark as read API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        return
      }

      const result = await response.json()
      console.log('✅ Messages marked as read:', result.data)

    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }, [connected, publicKey, isAuthenticated])

  // Load existing read receipts for a chat
  const loadReadReceipts = useCallback(async (chatId: string, messages: any[]) => {
    try {
      const supabaseClient = getAuthenticatedClient()
      
      // Get all participants and their read status for this chat
      const { data: participants, error } = await supabaseClient
        .from('chat_participants')
        .select('wallet_address, last_read_message_id')
        .eq('chat_id', chatId)
        .not('last_read_message_id', 'is', null)
      
      if (error) {
        console.error('Failed to load read receipts:', error)
        return {}
      }
      
      console.log(`📖 Loaded ${participants?.length || 0} read receipts for chat`)
      
      // Build read receipts map: for each participant, mark all messages up to their last read as read
      const readReceipts: Record<string, string> = {}
      
      participants?.forEach(participant => {
        if (participant.last_read_message_id) {
          // Find the index of the last read message
          const lastReadIndex = messages.findIndex(msg => msg.id === participant.last_read_message_id)
          
          if (lastReadIndex !== -1) {
            // Mark all messages up to and including the last read message as read by this wallet
            for (let i = 0; i <= lastReadIndex; i++) {
              const messageId = messages[i].id
              readReceipts[messageId] = participant.wallet_address
            }
          }
        }
      })
      
      console.log(`✅ Processed read receipts for ${Object.keys(readReceipts).length} messages`)
      return readReceipts
      
    } catch (error) {
      console.error('Failed to load read receipts:', error)
      return {}
    }
  }, [])

  // Load messages for a specific chat
  const loadChatMessages = useCallback(async (chatId: string) => {
    // Use current auth state to prevent stale closure dependencies
    const currentAuth = authStateRef.current
    if (!currentAuth.connected || !currentAuth.publicKey || !currentAuth.isAuthenticated) {
      console.log('🚫 loadChatMessages blocked - Missing requirements:', {
        connected: currentAuth.connected,
        hasPublicKey: !!currentAuth.publicKey,
        isAuthenticated: currentAuth.isAuthenticated,
        chatId,
        timestamp: new Date().toISOString()
      })
      return
    }

    console.log(`🔄 Loading messages for chat: ${chatId}`)
    setState(prev => ({ ...prev, isLoadingMessages: true, error: null }))
    currentChatIdRef.current = chatId

    try {
      // Use authenticated Supabase client
      const supabaseClient = getAuthenticatedClient()
      const { data: messages, error } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error

      console.log(`📥 Loaded ${messages?.length || 0} messages from database`)

      // Get chat participants for message decryption
      const chatParticipants = [
        state.conversations.find(c => c.id === chatId)?.participants || []
      ].flat()
      
      // Transform and decrypt messages in parallel for better performance
      const messagePromises = (messages || []).map(async (msg) => {
        try {
          return await processMessage(msg, chatParticipants)
        } catch (error) {
          console.error('Failed to process message:', msg.id, error)
          // Return fallback message on processing failure
          const fallbackMessage: Message = {
            id: msg.id,
            chat_id: msg.chat_id,
            sender_wallet: msg.sender_wallet,
            recipient_wallet: msg.recipient_wallet,
            message_content: '[Processing Failed]',
            encrypted: true,
            created_at: msg.created_at,
            updated_at: msg.created_at,
            type: msg.message_type as any
          }
          
          // Add NFT-specific fields if needed
          if (msg.message_type === 'nft') {
            return {
              ...fallbackMessage,
              type: 'nft' as const,
              nft_mint_address: msg.nft_mint_address || '',
              nft_image_url: msg.nft_image_url || '',
              nft_metadata_url: msg.nft_metadata_url || '',
              transaction_signature: msg.transaction_signature || ''
            }
          }
          
          return fallbackMessage
        }
      })

      // Process all messages in parallel
      console.log('🔐 Processing messages in parallel...')
      const startTime = performance.now()
      const formattedMessages = await Promise.all(messagePromises)
      const endTime = performance.now()
      console.log(`✅ Processed ${formattedMessages.length} messages in ${(endTime - startTime).toFixed(2)}ms`)

      // Load existing read receipts for this chat
      const existingReadReceipts = await loadReadReceipts(chatId, formattedMessages)

      setState(prev => ({
        ...prev,
        currentChatMessages: formattedMessages,
        readReceipts: existingReadReceipts,
        isLoadingMessages: false
      }))

      // Auto-mark messages as read when loading chat
      if (formattedMessages.length > 0) {
        const lastMessage = formattedMessages[formattedMessages.length - 1]
        const currentWallet = currentAuth.publicKey?.toString()
        
        // Only mark as read if the last message is not from the current user
        if (lastMessage.sender_wallet !== currentWallet) {
          console.log('📖 Auto-marking messages as read after loading chat')
          markMessagesAsRead(chatId, lastMessage.id).catch(error => {
            console.error('Failed to auto-mark messages as read:', error)
          })
        }
      }

    } catch (error) {
      console.error('Failed to load chat messages:', error)
      setState(prev => ({
        ...prev,
        isLoadingMessages: false,
        error: error instanceof Error ? error.message : 'Failed to load messages'
      }))
    }
  }, [processMessage, markMessagesAsRead, loadReadReceipts]) // Include dependencies for proper functionality

  // Send a new message with optimistic updates
  const sendMessage = useCallback(async (params: SendMessageParams) => {
    if (!connected || !publicKey || !isAuthenticated) {
      throw new Error('Wallet not connected or not authenticated')
    }

    const walletAddress = publicKey.toString()
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create optimistic message immediately
    const optimisticMessage: Message = {
      id: optimisticId,
      chat_id: params.chatId,
      sender_wallet: walletAddress,
      recipient_wallet: params.recipientWallet,
      message_content: params.content, // Use original content for display
      encrypted: params.encrypt || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      optimistic: true,
      optimistic_id: optimisticId,
      type: params.messageType || 'text',
      metadata: params.metadata
    } as Message

    // Add optimistic message to state immediately for instant UI feedback
    setState(prev => {
      console.log('➕ Adding optimistic message to state:', {
        optimisticId,
        content: optimisticMessage.message_content.slice(0, 30) + '...',
        currentMessageCount: prev.currentChatMessages.length
      })
      return {
        ...prev,
        currentChatMessages: [...prev.currentChatMessages, optimisticMessage]
      }
    })

    try {
      let messageContent = params.content
      let shouldEncrypt = params.encrypt || false

      // If encryption is requested, encrypt the message content
      if (shouldEncrypt) {
        const participants = [publicKey.toString(), params.recipientWallet]
        const encryptResult = await encryptForChat(params.content, params.chatId, participants)
        messageContent = encryptResult.encryptedContent
      }

      // Get auth token from local storage
      const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
      
      if (!storedData) {
        throw new Error('No authentication token available')
      }
      
      const authData = JSON.parse(storedData)
      const authToken = authData.token

      if (!authToken) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/chats/${params.chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Wallet-Address': walletAddress
        },
        body: JSON.stringify({
          message_content: messageContent,
          recipient_wallet: params.recipientWallet,
          message_type: params.messageType || 'text',
          encrypt: shouldEncrypt,
          // Include file fields for voice/file messages
          file_url: params.file_url,
          file_name: params.file_name,
          file_size: params.file_size,
          file_type: params.file_type,
          metadata: shouldEncrypt ? { 
            encrypted: true,
            encryption_method: 'aes-gcm-browser',
            ...params.metadata
          } : params.metadata
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        console.error('❌ Send message API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        // Mark optimistic message as failed
        setState(prev => ({
          ...prev,
          currentChatMessages: prev.currentChatMessages.map(msg => 
            msg.optimistic_id === optimisticId 
              ? { ...msg, optimistic: false, metadata: { ...msg.metadata, failed: true } }
              : msg
          )
        }))
        
        throw new Error(errorData.message || 'Failed to send message')
      }

      const result = await response.json()
      const confirmedMessage = result.data.message

      // Don't replace optimistic message here - let the real-time subscription handle it
      // This prevents double updates and ensures consistent behavior
      console.log('✅ Message sent successfully, waiting for real-time confirmation:', {
        optimisticId,
        confirmedId: confirmedMessage.id,
        content: confirmedMessage.encrypted_content?.slice(0, 30) + '...'
      })

      return confirmedMessage

    } catch (error) {
      console.error('Failed to send message:', error)
      
      // On error, mark the optimistic message as failed
      setState(prev => ({
        ...prev,
        currentChatMessages: prev.currentChatMessages.map(msg => 
          msg.optimistic_id === optimisticId 
            ? { ...msg, optimistic: false, metadata: { ...msg.metadata, failed: true } }
            : msg
        )
      }))
      
      throw error
    }
  }, [connected, publicKey, isAuthenticated, encryptForChat])

  // Retry failed message
  const retryMessage = useCallback(async (failedMessage: Message) => {
    if (!connected || !publicKey || !isAuthenticated) {
      throw new Error('Wallet not connected or not authenticated')
    }

    // Find the failed message and mark it as pending retry
    setState(prev => ({
      ...prev,
      currentChatMessages: prev.currentChatMessages.map(msg => 
        msg.id === failedMessage.id 
          ? { ...msg, metadata: { ...msg.metadata, failed: false, retrying: true } }
          : msg
      )
    }))

    try {
      // Find conversation for recipient info
      const conversation = state.conversations.find(c => c.id === failedMessage.chat_id)
      const recipientWallet = conversation?.participants.find(p => p !== publicKey.toString())
      
      if (!recipientWallet) {
        throw new Error('Recipient not found')
      }

      // Retry the send operation
      await sendMessage({
        chatId: failedMessage.chat_id,
        content: failedMessage.message_content,
        recipientWallet,
        messageType: failedMessage.type,
        metadata: failedMessage.metadata
      })

      // Remove the failed message from state (sendMessage will create a new optimistic one)
      setState(prev => ({
        ...prev,
        currentChatMessages: prev.currentChatMessages.filter(msg => msg.id !== failedMessage.id)
      }))

    } catch (error) {
      console.error('Failed to retry message:', error)
      
      // Mark message as failed again
      setState(prev => ({
        ...prev,
        currentChatMessages: prev.currentChatMessages.map(msg => 
          msg.id === failedMessage.id 
            ? { ...msg, metadata: { ...msg.metadata, failed: true, retrying: false } }
            : msg
        )
      }))
      
      throw error
    }
  }, [connected, publicKey, isAuthenticated, sendMessage, state.conversations])

  // Subscribe to real-time updates for conversations
  const subscribeToConversationUpdates = useCallback(async () => {
    if (!connected || !publicKey || !isAuthenticated) {
      console.log('🚫 Chat subscription blocked: wallet not connected or not authenticated')
      return
    }

    if (conversationsChannelRef.current) {
      console.log('🔄 Chat subscription already exists, skipping...')
      return
    }

    const walletAddress = publicKey.toString()
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }))

    console.log(`🔔 Establishing conversation subscription for wallet: ${walletAddress.slice(0, 8)}...`)
    console.log(`🔐 Authentication confirmed: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`)

    try {
      conversationsChannelRef.current = subscribeToChats(
        (payload) => {
          const walletAddress = publicKey.toString()
          console.log('🔔 Chat update received:', {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new ? {
              id: payload.new.id,
              sender: payload.new.sender_wallet?.slice(0, 8) + '...',
              recipient: payload.new.recipient_wallet?.slice(0, 8) + '...',
              currentWallet: walletAddress.slice(0, 8) + '...',
              isForCurrentUser: payload.new.sender_wallet === walletAddress || payload.new.recipient_wallet === walletAddress
            } : null
          })

          if (payload.eventType === 'INSERT') {
            // New chat created - fetch its first message for proper preview
            const newChat = payload.new
            console.log('🆕 New chat created, fetching first message...')
            
            // Fetch the first message for this chat
            ;(async () => {
              try {
                const supabaseClient = getAuthenticatedClient()
                const { data: messages, error } = await supabaseClient
                  .from('messages')
                  .select('*')
                  .eq('chat_id', newChat.id)
                  .order('created_at', { ascending: true })
                  .limit(1)
                
                if (error) {
                  console.error('Failed to fetch first message for new chat:', error)
                  return
                }

                let lastMessage: Message | undefined
                
                if (messages && messages.length > 0) {
                  const msg = messages[0]
                  const participants = [newChat.sender_wallet, newChat.recipient_wallet]
                  
                  try {
                    lastMessage = await processMessage(msg, participants)
                    console.log('✅ First message processed for new chat:', lastMessage.message_content.slice(0, 50) + '...')
                  } catch (error) {
                    console.error('Failed to process first message:', error)
                    // Fallback to basic message structure
                    lastMessage = {
                      id: msg.id,
                      chat_id: newChat.id,
                      sender_wallet: msg.sender_wallet,
                      recipient_wallet: msg.recipient_wallet,
                      message_content: msg.encrypted_content || '[Message]',
                      encrypted: false,
                      created_at: msg.created_at,
                      updated_at: msg.created_at,
                      type: msg.message_type as any
                    }
                  }
                }

                const newConversation: Conversation = {
                  id: newChat.id,
                  participants: [newChat.sender_wallet, newChat.recipient_wallet],
                  last_message: lastMessage,
                  last_activity: lastMessage?.created_at || newChat.created_at,
                  message_count: messages?.length || 0,
                  metadata: {}
                }

                setState(prev => ({
                  ...prev,
                  conversations: [newConversation, ...prev.conversations]
                }))
              } catch (error) {
                console.error('Failed to fetch new chat details:', error)
              }
            })()
          } else if (payload.eventType === 'UPDATE') {
            // Chat updated (likely new message) - fetch latest message for preview
            const updatedChat = payload.new
            console.log('🔄 Chat updated, fetching latest message...')
            
            // Fetch the latest message for this chat
            ;(async () => {
              try {
                const supabaseClient = getAuthenticatedClient()
                const { data: messages, error } = await supabaseClient
                  .from('messages')
                  .select('*')
                  .eq('chat_id', updatedChat.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                
                if (error) {
                  console.error('Failed to fetch latest message for updated chat:', error)
                  // Fallback to basic update
                  setState(prev => {
                    const updatedConversations = prev.conversations.map(conv =>
                      conv.id === updatedChat.id
                        ? { ...conv, last_activity: updatedChat.updated_at }
                        : conv
                    )
                    
                    const targetConv = updatedConversations.find(conv => conv.id === updatedChat.id)
                    if (targetConv) {
                      const otherConversations = updatedConversations.filter(conv => conv.id !== updatedChat.id)
                      return {
                        ...prev,
                        conversations: [targetConv, ...otherConversations]
                      }
                    }
                    
                    return { ...prev, conversations: updatedConversations }
                  })
                  return
                }

                let lastMessage: Message | undefined
                
                if (messages && messages.length > 0) {
                  const msg = messages[0]
                  const participants = [updatedChat.sender_wallet, updatedChat.recipient_wallet]
                  
                  try {
                    lastMessage = await processMessage(msg, participants)
                    console.log('✅ Latest message processed for updated chat:', lastMessage.message_content.slice(0, 50) + '...')
                    
                    // NOTIFICATION FIX: Call notification callback for sidebar updates too!
                    if (messageCallbackRef.current) {
                      // Check if we already processed this message to prevent duplicates
                      if (processedMessageIds.current.has(lastMessage.id)) {
                        console.log('🔄 Skipping duplicate notification for message:', lastMessage.id)
                        return
                      }
                      
                      processedMessageIds.current.add(lastMessage.id)
                      
                      // Clean up old message IDs to prevent memory leak (keep last 100)
                      if (processedMessageIds.current.size > 100) {
                        const idsArray = Array.from(processedMessageIds.current)
                        const toRemove = idsArray.slice(0, idsArray.length - 100)
                        toRemove.forEach(id => processedMessageIds.current.delete(id))
                      }
                      
                      // Determine if message is from current user with fresh wallet state
                      const currentWallet = publicKey?.toString()
                      const isFromCurrentUser = !!(currentWallet && lastMessage.sender_wallet === currentWallet)
                      
                      console.log('🔔 Calling onNewMessage callback from conversation update with:', {
                        messageId: lastMessage.id,
                        chatId: lastMessage.chat_id,
                        content: lastMessage.message_content.slice(0, 30) + '...',
                        senderWallet: lastMessage.sender_wallet,
                        currentWallet,
                        isFromCurrentUser,
                        walletComparison: {
                          hasCurrent: !!currentWallet,
                          hasSender: !!lastMessage.sender_wallet,
                          exactMatch: currentWallet === lastMessage.sender_wallet
                        }
                      })
                      
                      messageCallbackRef.current(lastMessage, isFromCurrentUser)
                    } else {
                      console.log('⚠️ No onNewMessage callback registered for conversation update!')
                    }
                  } catch (error) {
                    console.error('Failed to process latest message:', error)
                    // Fallback to basic message structure
                    lastMessage = {
                      id: msg.id,
                      chat_id: updatedChat.id,
                      sender_wallet: msg.sender_wallet,
                      recipient_wallet: msg.recipient_wallet,
                      message_content: msg.encrypted_content || '[Message]',
                      encrypted: false,
                      created_at: msg.created_at,
                      updated_at: msg.created_at,
                      type: msg.message_type as any
                    }
                  }
                }

                setState(prev => {
                  const updatedConversations = prev.conversations.map(conv =>
                    conv.id === updatedChat.id
                      ? { 
                          ...conv, 
                          last_message: lastMessage,
                          last_activity: lastMessage?.created_at || updatedChat.updated_at,
                          message_count: Math.max(conv.message_count || 0, messages?.length || 0)
                        }
                      : conv
                  )
                  
                  // Move the updated conversation to the top
                  const targetConv = updatedConversations.find(conv => conv.id === updatedChat.id)
                  if (targetConv) {
                    const otherConversations = updatedConversations.filter(conv => conv.id !== updatedChat.id)
                    return {
                      ...prev,
                      conversations: [targetConv, ...otherConversations]
                    }
                  }
                  
                  return {
                    ...prev,
                    conversations: updatedConversations
                  }
                })
              } catch (error) {
                console.error('Failed to fetch updated chat details:', error)
              }
            })()
          }
        },
        (status) => {
          console.log(`🔔 Chats subscription status changed: ${status}`)
          setSubscriptionState(prev => ({ 
            ...prev, 
            conversations: status.toLowerCase(),
            lastConnected: status === 'SUBSCRIBED' ? new Date() : prev.lastConnected
          }))
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Chat real-time subscription active!')
            setState(prev => ({ ...prev, connectionStatus: 'connected' }))
            // Reset retry count on successful connection
            setSubscriptionState(prev => ({ ...prev, retryCount: 0 }))
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, conversations: 'healthy' as const }
            }))
          } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.log(`❌ Chat real-time subscription error: ${status}`)
            setState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, conversations: 'unhealthy' as const }
            }))
            
            // Handle different error types
            if (status === 'CHANNEL_ERROR') {
              console.error('🚨 CHANNEL_ERROR detected - clearing stale client and reconnecting...')
              // Clear the stale client first
              import('@/lib/supabase').then(({ clearStaleClients, refreshClient, getCurrentWalletAddress }) => {
                clearStaleClients().then(() => {
                  const walletAddress = getCurrentWalletAddress()
                  if (walletAddress) {
                    refreshClient(walletAddress)
                  }
                })
              })
            }
            
            // Attempt to reconnect with exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, subscriptionState.retryCount), 30000)
            console.log(`🔄 Will attempt reconnection in ${retryDelay}ms (attempt ${subscriptionState.retryCount + 1})`)
            
            setTimeout(() => {
              if (subscriptionState.retryCount < 5) { // Increased from 3 to 5
                reconnectSubscription()
              } else {
                console.error('❌ Max reconnection attempts reached. Please refresh the page.')
                setState(prev => ({ 
                  ...prev, 
                  connectionStatus: 'error',
                  error: 'Connection lost. Please refresh the page to reconnect.'
                }))
              }
            }, retryDelay)
          }
        }
      )
    } catch (error) {
      console.error('❌ Failed to create conversation subscription:', error)
      setState(prev => ({ ...prev, connectionStatus: 'error' }))
    }
  }, [connected, publicKey, isAuthenticated, processMessage])

  // Subscribe to real-time updates for current chat messages
  const subscribeToMessageUpdates = useCallback(async (chatId: string) => {
    console.log('🔍 subscribeToMessageUpdates called for chat:', chatId, {
      connected,
      hasPublicKey: !!publicKey,
      isAuthenticated,
      hasExistingChannel: !!messagesChannelRef.current
    })
    
    if (!connected || !publicKey || !isAuthenticated || messagesChannelRef.current) {
      console.log('🚫 Message subscription blocked:', {
        connected,
        hasPublicKey: !!publicKey,
        isAuthenticated,
        hasExistingChannel: !!messagesChannelRef.current,
        reason: !connected ? 'not connected' : 
                !publicKey ? 'no public key' :
                !isAuthenticated ? 'not authenticated' :
                'existing channel'
      })
      return
    }

    const walletAddress = publicKey.toString()

    console.log(`Establishing message subscription for chat: ${chatId}`)

    try {
      messagesChannelRef.current = subscribeToMessages(
        chatId,
        (payload) => {
          console.log('Message update received:', payload)

          if (payload.eventType === 'INSERT') {
            // New message received - process it properly like other subscriptions
            const newMessage = payload.new
            
            // Process the message with proper decryption and formatting
            ;(async () => {
              try {
                // Get conversation participants for proper message processing
                const conversation = state.conversations.find(c => c.id === chatId)
                const participants = conversation?.participants || []
                
                const formattedMessage = await processMessage(newMessage, participants)
                console.log('✅ Real-time message processed:', formattedMessage.message_content.slice(0, 50) + '...')
                
                // Add message to current chat messages if viewing this chat
                if (currentChatIdRef.current === chatId) {
                  const currentWallet = publicKey?.toString()
                  const isFromCurrentUser = !!(currentWallet && formattedMessage.sender_wallet === currentWallet)
                  
                  setState(prev => {
                    // Check if this message should replace an optimistic message
                    
                    // Check if this exact message already exists (prevent duplicates from multiple sources)
                    const existingMessageIndex = prev.currentChatMessages.findIndex(msg => msg.id === formattedMessage.id)
                    if (existingMessageIndex !== -1) {
                      console.log('🔄 Message already exists, skipping duplicate:', formattedMessage.id)
                      return prev
                    }
                    
                    if (isFromCurrentUser) {
                      // For messages from current user, check if we have a matching optimistic message
                      const optimisticIndex = prev.currentChatMessages.findIndex(msg => 
                        msg.optimistic && 
                        msg.message_content === formattedMessage.message_content &&
                        msg.sender_wallet === formattedMessage.sender_wallet &&
                        Math.abs(new Date(msg.created_at).getTime() - new Date(formattedMessage.created_at).getTime()) < 30000 // Within 30 seconds
                      )
                      
                      if (optimisticIndex !== -1) {
                        // Replace optimistic message with real message
                        console.log('🔄 Replacing optimistic message with confirmed message:', {
                          optimisticId: prev.currentChatMessages[optimisticIndex].id,
                          realId: formattedMessage.id,
                          content: formattedMessage.message_content.slice(0, 30) + '...'
                        })
                        const updatedMessages = [...prev.currentChatMessages]
                        updatedMessages[optimisticIndex] = formattedMessage
                        return {
                          ...prev,
                          currentChatMessages: updatedMessages
                        }
                      }
                    }
                    
                    // No optimistic message found or this is from someone else - add normally
                    console.log('📨 Adding new message to chat:', {
                      id: formattedMessage.id,
                      isFromCurrentUser,
                      content: formattedMessage.message_content.slice(0, 30) + '...'
                    })
                    return {
                      ...prev,
                      currentChatMessages: [...prev.currentChatMessages, formattedMessage]
                    }
                  })

                  // Auto-mark incoming messages as read when viewing this chat
                  if (!isFromCurrentUser) {
                    console.log('📖 Auto-marking incoming message as read')
                    markMessagesAsRead(chatId, formattedMessage.id).catch(error => {
                      console.error('Failed to auto-mark incoming message as read:', error)
                    })
                  }
                }

                // Notify callback about new message with sender detection
                if (messageCallbackRef.current) {
                  // Check if we already processed this message to prevent duplicates
                  if (processedMessageIds.current.has(formattedMessage.id)) {
                    console.log('🔄 Skipping duplicate notification for message:', formattedMessage.id)
                    return
                  }
                  
                  processedMessageIds.current.add(formattedMessage.id)
                  
                  // Determine if message is from current user with fresh wallet state
                  const currentWallet = publicKey?.toString()
                  const isFromCurrentUser = !!(currentWallet && formattedMessage.sender_wallet === currentWallet)
                  
                  console.log('🔔 Calling onNewMessage callback with:', {
                    messageId: formattedMessage.id,
                    chatId: formattedMessage.chat_id,
                    content: formattedMessage.message_content.slice(0, 30) + '...',
                    senderWallet: formattedMessage.sender_wallet,
                    currentWallet,
                    isFromCurrentUser,
                    walletComparison: {
                      hasCurrent: !!currentWallet,
                      hasSender: !!formattedMessage.sender_wallet,
                      exactMatch: currentWallet === formattedMessage.sender_wallet
                    }
                  })
                  
                  messageCallbackRef.current(formattedMessage, isFromCurrentUser)
                } else {
                  console.log('⚠️ No onNewMessage callback registered!')
                }

                // Also update the conversation list with this new message as last_message
                setState(prev => {
                  const updatedConversations = prev.conversations.map(conv => {
                    if (conv.id === chatId) {
                      return {
                        ...conv,
                        last_message: formattedMessage,
                        last_activity: formattedMessage.created_at,
                        message_count: (conv.message_count || 0) + 1
                      }
                    }
                    return conv
                  })

                  // Move the updated conversation to the top
                  const targetConv = updatedConversations.find(conv => conv.id === chatId)
                  if (targetConv) {
                    const otherConversations = updatedConversations.filter(conv => conv.id !== chatId)
                    return {
                      ...prev,
                      conversations: [targetConv, ...otherConversations]
                    }
                  }

                  return {
                    ...prev,
                    conversations: updatedConversations
                  }
                })
              } catch (error) {
                console.error('Failed to process real-time message:', error)
                
                // Fallback: create basic message structure
                const fallbackMessage: Message = {
                  id: newMessage.id,
                  chat_id: newMessage.chat_id,
                  sender_wallet: newMessage.sender_wallet,
                  recipient_wallet: newMessage.recipient_wallet,
                  message_content: newMessage.encrypted_content || '[Message Processing Failed]',
                  encrypted: newMessage.metadata?.encrypted || false,
                  created_at: newMessage.created_at,
                  updated_at: newMessage.created_at,
                  type: newMessage.message_type as any
                }
                
                // Add NFT-specific fields if needed  
                if (newMessage.message_type === 'nft') {
                  // Create proper NFT message type
                  const nftFallbackMessage = {
                    ...fallbackMessage,
                    type: 'nft' as const,
                    nft_mint_address: newMessage.nft_mint_address || '',
                    nft_image_url: newMessage.nft_image_url || '',
                    nft_metadata_url: newMessage.nft_metadata_url || '',
                    transaction_signature: newMessage.transaction_signature || ''
                  }
                  
                  // Add NFT fallback message to current chat messages if viewing this chat
                  if (currentChatIdRef.current === chatId) {
                    setState(prev => ({
                      ...prev,
                      currentChatMessages: [...prev.currentChatMessages, nftFallbackMessage]
                    }))
                  }
                } else {
                  // Add regular fallback message to current chat messages if viewing this chat
                  if (currentChatIdRef.current === chatId) {
                    setState(prev => ({
                      ...prev,
                      currentChatMessages: [...prev.currentChatMessages, fallbackMessage]
                    }))
                  }
                }
              }
            })()
          }
        },
        (status) => {
          console.log('Messages subscription status:', status)
          setSubscriptionState(prev => ({ 
            ...prev, 
            messages: status.toLowerCase(),
            lastConnected: status === 'SUBSCRIBED' ? new Date() : prev.lastConnected
          }))
          
          if (status === 'SUBSCRIBED') {
            setState(prev => ({ ...prev, connectionStatus: 'connected' }))
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, messages: 'healthy' as const }
            }))
          } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.log(`❌ Messages subscription error: ${status}`)
            setState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, messages: 'unhealthy' as const }
            }))
            
            // Handle CHANNEL_ERROR specifically
            if (status === 'CHANNEL_ERROR') {
              console.error('🚨 Messages CHANNEL_ERROR detected - will recreate subscription...')
              // Clear the current channel
              if (messagesChannelRef.current) {
                messagesChannelRef.current.unsubscribe()
                messagesChannelRef.current = null
              }
              
              // Attempt to resubscribe after a short delay
              setTimeout(() => {
                if (currentChatIdRef.current && isReadyForSubscription) {
                  console.log('🔄 Recreating messages subscription...')
                  subscribeToMessageUpdates(currentChatIdRef.current)
                }
              }, 2000)
            }
          }
        }
      )
    } catch (error) {
      console.error('Failed to create message subscription:', error)
      setState(prev => ({ ...prev, connectionStatus: 'error' }))
    }
  }, [connected, publicKey, isAuthenticated, processMessage, markMessagesAsRead]) // Added dependencies

  // Subscribe to read receipts for current chat
  const subscribeToReadReceiptsUpdates = useCallback(async (chatId: string) => {
    console.log(`🔔 Attempting read receipts subscription for chat: ${chatId}`, {
      connected,
      hasPublicKey: !!publicKey,
      isAuthenticated,
      hasExistingChannel: !!readReceiptsChannelRef.current,
      currentUser: publicKey?.toString().slice(0, 8) + '...'
    })
    
    if (!connected || !publicKey || !isAuthenticated || readReceiptsChannelRef.current) {
      console.log('🚫 Read receipts subscription blocked:', {
        connected,
        hasPublicKey: !!publicKey,
        isAuthenticated,
        hasExistingChannel: !!readReceiptsChannelRef.current,
        chatId
      })
      return
    }

    console.log(`🔔 Setting up read receipts subscription for chat: ${chatId}`)

    try {
      readReceiptsChannelRef.current = subscribeToReadReceipts(
        chatId,
        (payload) => {
          console.log('🔔 Read receipt update received:', payload)
          
          const updatedParticipant = payload.new
          if (updatedParticipant?.last_read_message_id && updatedParticipant?.wallet_address) {
            setState(prev => {
              // Find the index of the last read message
              const lastReadIndex = prev.currentChatMessages.findIndex(
                msg => msg.id === updatedParticipant.last_read_message_id
              )
              
              if (lastReadIndex !== -1) {
                // Mark all messages up to and including the last read message as read by this wallet
                const newReadReceipts = { ...prev.readReceipts }
                
                for (let i = 0; i <= lastReadIndex; i++) {
                  const messageId = prev.currentChatMessages[i].id
                  newReadReceipts[messageId] = updatedParticipant.wallet_address
                }
                
                console.log('✅ Updated read receipts:', {
                  wallet: updatedParticipant.wallet_address.slice(0, 8) + '...',
                  lastReadId: updatedParticipant.last_read_message_id,
                  totalMessagesMarked: lastReadIndex + 1
                })
                
                return {
                  ...prev,
                  readReceipts: newReadReceipts
                }
              }
              
              return prev
            })
          }
        },
        (status) => {
          console.log(`🔔 Read receipts subscription status for ${chatId}:`, status)
          
          if (status === 'SUBSCRIBED') {
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, readReceipts: 'healthy' as const }
            }))
          } else if (status === 'CHANNEL_ERROR') {
            console.error('🚨 Read receipts CHANNEL_ERROR detected - will recreate subscription...')
            // Update connection health
            setConnectionHealthState(prev => ({
              ...prev,
              channels: { ...prev.channels, readReceipts: 'unhealthy' as const }
            }))
            // Clear the current channel
            if (readReceiptsChannelRef.current) {
              readReceiptsChannelRef.current.unsubscribe()
              readReceiptsChannelRef.current = null
            }
            
            // Attempt to resubscribe after a short delay
            setTimeout(() => {
              if (currentChatIdRef.current === chatId && isReadyForSubscription) {
                console.log('🔄 Recreating read receipts subscription...')
                subscribeToReadReceiptsUpdates(chatId)
              }
            }, 2000)
          }
        }
      )
      
      console.log(`✅ Read receipts subscription created successfully for chat: ${chatId}`)
    } catch (error) {
      console.error('Failed to create read receipts subscription:', error)
    }
  }, [connected, publicKey, isAuthenticated])

  // Connection recovery callback
  const reconnectSubscription = useCallback(async () => {
    console.log('🔄 Attempting to reconnect subscription...')
    
    // Clean up existing channels
    if (conversationsChannelRef.current) {
      conversationsChannelRef.current.unsubscribe()
      conversationsChannelRef.current = null
    }
    
    if (messagesChannelRef.current) {
      messagesChannelRef.current.unsubscribe()
      messagesChannelRef.current = null
    }
    
    if (readReceiptsChannelRef.current) {
      readReceiptsChannelRef.current.unsubscribe()
      readReceiptsChannelRef.current = null
    }
    
    // Increment retry count
    setSubscriptionState(prev => ({ 
      ...prev, 
      conversations: 'disconnected',
      messages: 'disconnected',
      retryCount: prev.retryCount + 1 
    }))
    
    // Clear stale clients before reconnecting
    try {
      const { clearStaleClients, refreshClient, getCurrentWalletAddress } = await import('@/lib/supabase')
      await clearStaleClients()
      
      const walletAddress = getCurrentWalletAddress()
      if (walletAddress) {
        const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
        if (storedData) {
          const authData = JSON.parse(storedData)
          refreshClient(walletAddress, authData.token)
        }
      }
    } catch (error) {
      console.error('Failed to clear stale clients:', error)
    }
    
    // Retry after a delay
    setTimeout(() => {
      if (isReadyForSubscription) {
        // Reconnect conversations
        subscribeToConversationUpdates().catch(error => {
          console.error('Failed to reconnect conversation subscription:', error)
        })
        
        // Reconnect messages if we have a current chat
        if (currentChatIdRef.current) {
          subscribeToMessageUpdates(currentChatIdRef.current).catch(error => {
            console.error('Failed to reconnect message subscription:', error)
          })
          
          subscribeToReadReceiptsUpdates(currentChatIdRef.current).catch(error => {
            console.error('Failed to reconnect read receipts subscription:', error)
          })
        }
      }
    }, 2000)
  }, [isReadyForSubscription, subscribeToConversationUpdates, subscribeToMessageUpdates, subscribeToReadReceiptsUpdates])

  // Cleanup subscriptions
  const unsubscribeAll = useCallback(() => {
    if (conversationsChannelRef.current) {
      conversationsChannelRef.current.unsubscribe()
      conversationsChannelRef.current = null
    }
    
    if (messagesChannelRef.current) {
      messagesChannelRef.current.unsubscribe()
      messagesChannelRef.current = null
    }

    if (readReceiptsChannelRef.current) {
      readReceiptsChannelRef.current.unsubscribe()
      readReceiptsChannelRef.current = null
    }

    setState(prev => ({ ...prev, connectionStatus: 'disconnected' }))
  }, [])

  // Silent cleanup without state updates (for unmounting)
  const silentUnsubscribeAll = useCallback(() => {
    if (conversationsChannelRef.current) {
      conversationsChannelRef.current.unsubscribe()
      conversationsChannelRef.current = null
    }
    
    if (messagesChannelRef.current) {
      messagesChannelRef.current.unsubscribe()
      messagesChannelRef.current = null
    }

    if (readReceiptsChannelRef.current) {
      readReceiptsChannelRef.current.unsubscribe()
      readReceiptsChannelRef.current = null
    }
  }, [])

  // Load conversations when ready
  useEffect(() => {
    if (isReadyForSubscription) {
      loadConversations().catch(error => {
        console.error('Failed to load conversations:', error)
      })
    }
  }, [isReadyForSubscription, loadConversations]) // Include loadConversations dependency for proper functionality

  // Set up subscriptions when ready
  useEffect(() => {
    if (isReadyForSubscription && !conversationsChannelRef.current) {
      console.log('🔄 Setting up real-time subscription...')
      subscribeToConversationUpdates().catch(error => {
        console.error('Failed to set up real-time subscription:', error)
      })
    }
  }, [isReadyForSubscription, subscribeToConversationUpdates])

  // Handle authentication state changes
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated) {
      // Wallet connected but not authenticated yet
      setState(prev => ({
        ...prev,
        conversations: [],
        currentChatMessages: [],
        unreadThreads: new Set(),
        isLoadingConversations: false,
        isLoadingMessages: false,
        error: 'Waiting for wallet authentication...',
        connectionStatus: 'disconnected'
      }))
    } else if (!connected || !publicKey) {
      // Wallet not connected, clear everything
      setState(prev => ({
        ...prev,
        conversations: [],
        currentChatMessages: [],
        unreadThreads: new Set(),
        isLoadingConversations: false,
        isLoadingMessages: false,
        error: null,
        connectionStatus: 'disconnected'
      }))
    }
  }, [connected, publicKey, isAuthenticated])

  // Cleanup effect - separate from the main effect to avoid dependency issues
  useEffect(() => {
    return () => {
      silentUnsubscribeAll()
    }
  }, [silentUnsubscribeAll])

  // Clear current chat messages when switching chats
  const clearCurrentChat = useCallback(() => {
    console.log('🧹 clearCurrentChat called, clearing messages and unsubscribing...', {
      hadMessageChannel: !!messagesChannelRef.current,
      hadReadReceiptsChannel: !!readReceiptsChannelRef.current,
      currentChatId: currentChatIdRef.current
    })
    
    setState(prev => ({ ...prev, currentChatMessages: [], readReceipts: {} }))
    currentChatIdRef.current = null
    
    if (messagesChannelRef.current) {
      console.log('🔌 Unsubscribing from existing message channel...')
      messagesChannelRef.current.unsubscribe()
      messagesChannelRef.current = null
      console.log('✅ Message channel cleared')
    }

    if (readReceiptsChannelRef.current) {
      console.log('🔌 Unsubscribing from existing read receipts channel...')
      readReceiptsChannelRef.current.unsubscribe()
      readReceiptsChannelRef.current = null
      console.log('✅ Read receipts channel cleared')
    }
  }, [])

  // onNewMessage callback setter with sender detection
  const onNewMessage = useCallback((callback: (message: Message, isFromCurrentUser: boolean) => void) => {
    messageCallbackRef.current = callback
    
    // Return cleanup function
    return () => {
      messageCallbackRef.current = null
      processedMessageIds.current.clear()
    }
  }, [])

  // Connection health monitoring - we'll handle this differently to avoid re-render loops
  const [connectionHealthState, setConnectionHealthState] = useState({
    isHealthy: true,
    channels: {
      conversations: 'disconnected' as 'healthy' | 'unhealthy' | 'disconnected',
      messages: 'disconnected' as 'healthy' | 'unhealthy' | 'disconnected',
      readReceipts: 'disconnected' as 'healthy' | 'unhealthy' | 'disconnected'
    },
    lastHeartbeat: null as Date | null,
    heartbeatsMissed: 0
  })

  // Update connection health state when status changes
  useEffect(() => {
    if (state.connectionStatus === 'connected') {
      setConnectionHealthState(prev => ({
        ...prev,
        isHealthy: true,
        lastHeartbeat: new Date(),
        heartbeatsMissed: 0
      }))
    }
  }, [state.connectionStatus])

  return {
    ...state,
    loadChatMessages,
    sendMessage,
    retryMessage,
    markMessagesAsRead,
    subscribeToMessageUpdates,
    subscribeToReadReceiptsUpdates,
    clearCurrentChat,
    refreshConversations: loadConversations,
    unsubscribeAll,
    onNewMessage,
    connectionHealth: connectionHealthState,
    // Helper functions for unread management
    clearUnreadStatus: useCallback((chatId: string) => {
      setState(prev => {
        const newUnreadThreads = new Set(prev.unreadThreads)
        newUnreadThreads.delete(chatId)
        return { ...prev, unreadThreads: newUnreadThreads }
      })
    }, []),
    addUnreadStatus: useCallback((chatId: string) => {
      setState(prev => {
        const newUnreadThreads = new Set(prev.unreadThreads)
        newUnreadThreads.add(chatId)
        return { ...prev, unreadThreads: newUnreadThreads }
      })
    }, [])
  }
}