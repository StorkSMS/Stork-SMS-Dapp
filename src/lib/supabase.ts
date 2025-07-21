// Simplified Supabase client with wallet-based authentication
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Client cache to prevent multiple GoTrueClient instances
const clientCache = new Map<string, SupabaseClient<Database>>()

// Validate required environment variables
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing required Supabase environment variables')
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid Supabase URL format')
}

// Create authenticated Supabase client with wallet context (cached)
export const createAuthenticatedSupabaseClient = (walletAddress: string, authToken?: string) => {
  const cacheKey = `${walletAddress}:${authToken || 'no-token'}`
  
  // Return cached client if exists
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }
  
  const headers: Record<string, string> = {
    'X-Wallet-Address': walletAddress
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  console.log('🔧 Creating Supabase client with headers:', {
    walletAddress: walletAddress.slice(0, 8) + '...',
    hasAuthToken: !!authToken,
    headers: Object.keys(headers)
  })
  
  const client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers
    },
    realtime: {
      headers,
      params: {
        eventsPerSecond: 20,
        timeout: 60000, // Increased from 30s to 60s for better stability
        heartbeatIntervalMs: 10000, // Reduced from 15s to 10s (well below 30s requirement)
        reconnectIntervalMs: 1000, // Start with 1s, will use exponential backoff
        reconnectAfterMs: (attempts: number) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, then cap at 60s
          return Math.min(1000 * Math.pow(2, attempts), 60000)
        },
        // Add retry configuration
        maxReconnectAttempts: 10,
        // Enable connection state monitoring
        logLevel: 'info'
      }
    }
  })
  
  // Cache the client
  clientCache.set(cacheKey, client)
  
  return client
}

// Cache management functions
export const clearClientCache = (walletAddress?: string) => {
  if (walletAddress) {
    // Clear all clients for specific wallet
    for (const [key] of clientCache) {
      if (key.startsWith(walletAddress + ':')) {
        clientCache.delete(key)
      }
    }
  } else {
    // Clear all cached clients
    clientCache.clear()
  }
  console.log('🧹 Supabase client cache cleared', walletAddress ? `for wallet ${walletAddress}` : '')
}

export const getCacheSize = () => clientCache.size

// Health check for Supabase clients
export const checkClientHealth = async (client: SupabaseClient<Database>): Promise<boolean> => {
  try {
    // Try a simple query to check if the client is healthy
    const { error } = await client
      .from('chats')
      .select('id')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('Client health check failed:', error)
    return false
  }
}

// Clear stale or errored clients
export const clearStaleClients = async () => {
  console.log('🧹 Checking for stale Supabase clients...')
  const staleClients: string[] = []
  
  for (const [key, client] of clientCache) {
    const isHealthy = await checkClientHealth(client)
    if (!isHealthy) {
      staleClients.push(key)
      console.log(`❌ Found stale client: ${key}`)
    }
  }
  
  // Clear stale clients
  staleClients.forEach(key => {
    clientCache.delete(key)
    console.log(`🗑️ Removed stale client: ${key}`)
  })
  
  console.log(`✅ Cleared ${staleClients.length} stale clients`)
  return staleClients.length
}

// Force refresh a client
export const refreshClient = (walletAddress: string, authToken?: string): SupabaseClient<Database> => {
  const cacheKey = `${walletAddress}:${authToken || 'no-token'}`
  
  // Remove existing client
  if (clientCache.has(cacheKey)) {
    console.log(`🔄 Refreshing client for ${walletAddress.slice(0, 8)}...`)
    clientCache.delete(cacheKey)
  }
  
  // Create new client
  return createAuthenticatedSupabaseClient(walletAddress, authToken)
}

// Basic Supabase client for unauthenticated operations
export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
      timeout: 60000, // Increased from 30s to 60s for better stability
      heartbeatIntervalMs: 10000, // Reduced from 15s to 10s (well below 30s requirement)
      reconnectIntervalMs: 1000, // Start with 1s, will use exponential backoff
      reconnectAfterMs: (attempts: number) => {
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, then cap at 60s
        return Math.min(1000 * Math.pow(2, attempts), 60000)
      },
      // Add retry configuration
      maxReconnectAttempts: 10,
      // Enable connection state monitoring
      logLevel: 'info'
    }
  }
})

// Get authenticated Supabase client for current user
export const getAuthenticatedClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('getAuthenticatedClient can only be called on the client side')
  }
  
  // Try to get wallet address from stored auth data
  const wallets = Object.keys(localStorage).filter(key => key.startsWith('auth_token_'))
  if (wallets.length === 0) {
    throw new Error('No authenticated wallet found')
  }
  
  const latestWallet = wallets[0]
  const walletAddress = latestWallet.replace('auth_token_', '')
  const storedData = localStorage.getItem(latestWallet)
  
  if (!storedData) {
    throw new Error('No auth data found for wallet')
  }
  
  try {
    const authData = JSON.parse(storedData)
    if (Date.now() > authData.expires_at) {
      throw new Error('Auth token expired')
    }
    
    console.log('🔐 Creating authenticated Supabase client for:', walletAddress.slice(0, 8) + '...', {
      hasToken: !!authData.token,
      tokenLength: authData.token?.length || 0,
      expiresAt: new Date(authData.expires_at).toISOString()
    })
    
    return createAuthenticatedSupabaseClient(walletAddress, authData.token)
  } catch (error) {
    console.error('❌ Failed to create authenticated client:', error)
    throw new Error('Invalid auth data')
  }
}

// Get current wallet address from stored auth
export const getCurrentWalletAddress = () => {
  if (typeof window === 'undefined') return null
  
  const wallets = Object.keys(localStorage).filter(key => key.startsWith('auth_token_'))
  if (wallets.length === 0) return null
  
  const latestWallet = wallets[0]
  return latestWallet.replace('auth_token_', '')
}


// Simplified realtime subscription helpers with authentication
export const subscribeToMessages = (
  chatId: string,
  callback: (payload: any) => void,
  onStatusChange?: (status: string) => void
) => {
  try {
    const client = getAuthenticatedClient()
    const channel = client
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        callback
      )
      .subscribe((status, err) => {
        const timestamp = new Date().toISOString()
        console.log(`[${timestamp}] Messages subscription status:`, status, {
          chatId,
          error: err,
          channel: channel.topic
        })
        
        if (err) {
          console.error(`[${timestamp}] Messages subscription error:`, {
            error: err,
            chatId,
            channel: channel.topic,
            errorType: err.constructor.name,
            errorMessage: err.message
          })
        }
        
        if (status === 'CHANNEL_ERROR') {
          console.error(`[${timestamp}] 🚨 CHANNEL_ERROR detected for messages:${chatId}`)
        }
        
        onStatusChange?.(status)
      })
    
    return channel
  } catch (error) {
    console.error('Failed to create authenticated subscription:', error)
    throw error
  }
}

export const subscribeToChats = (
  callback: (payload: any) => void,
  onStatusChange?: (status: string) => void
) => {
  try {
    const client = getAuthenticatedClient()
    const walletAddress = getCurrentWalletAddress()
    
    if (!walletAddress) {
      throw new Error('No wallet address found for subscription')
    }
    
    const channel = client
      .channel(`chats:${walletAddress}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        (payload) => {
          // Filter events to only include chats where user is sender or recipient
          if (payload.new && 
              ((payload.new as any).sender_wallet === walletAddress || 
               (payload.new as any).recipient_wallet === walletAddress)) {
            console.log(`📨 Chat event for ${walletAddress.slice(0, 8)}...:`, {
              eventType: payload.eventType,
              chatId: (payload.new as any).id,
              sender: (payload.new as any).sender_wallet?.slice(0, 8) + '...',
              recipient: (payload.new as any).recipient_wallet?.slice(0, 8) + '...',
              isRelevant: true
            })
            callback(payload)
          } else {
            console.log(`🚫 Filtered out irrelevant chat event for ${walletAddress.slice(0, 8)}...`)
          }
        }
      )
      .subscribe((status, err) => {
        const timestamp = new Date().toISOString()
        console.log(`[${timestamp}] 🔔 Chats subscription status for ${walletAddress.slice(0, 8)}...:`, status, {
          error: err,
          channel: channel.topic
        })
        
        if (err) {
          console.error(`[${timestamp}] ❌ Chats subscription error:`, {
            error: err,
            wallet: walletAddress.slice(0, 8) + '...',
            channel: channel.topic,
            errorType: err.constructor.name,
            errorMessage: err.message
          })
        } else if (status === 'SUBSCRIBED') {
          console.log(`[${timestamp}] ✅ Successfully subscribed to chats for wallet ${walletAddress.slice(0, 8)}...`)
          console.log('📡 Real-time filters active:', [
            `sender_wallet=eq.${walletAddress}`,
            `recipient_wallet=eq.${walletAddress}`
          ])
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[${timestamp}] 🚨 CHANNEL_ERROR detected for chats:${walletAddress.slice(0, 8)}...`)
        }
        
        onStatusChange?.(status)
      })
    
    return channel
  } catch (error) {
    console.error('Failed to create authenticated chat subscription:', error)
    throw error
  }
}

export const subscribeToReadReceipts = (
  chatId: string,
  callback: (payload: any) => void,
  onStatusChange?: (status: string) => void
) => {
  try {
    const client = getAuthenticatedClient()
    const walletAddress = getCurrentWalletAddress()
    
    if (!walletAddress) {
      throw new Error('No wallet address found for read receipts subscription')
    }

    console.log(`🔔 Setting up read receipts subscription for chat: ${chatId}`)
    
    const channel = client
      .channel(`read_receipts:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newData = payload.new as { wallet_address?: string; last_read_message_id?: string; chat_id?: string } | null
          
          console.log('🔔 Read receipt update received:', {
            eventType: payload.eventType,
            walletAddress: newData?.wallet_address?.slice(0, 8) + '...',
            lastReadMessageId: newData?.last_read_message_id,
            chatId: newData?.chat_id,
            isFromSelf: newData?.wallet_address === walletAddress
          })
          
          // Only process updates from other participants (not self)
          if (newData?.wallet_address && newData.wallet_address !== walletAddress) {
            console.log('✅ Processing read receipt from other participant')
            callback(payload)
          } else {
            console.log('🚫 Ignoring read receipt from self')
          }
        }
      )
      .subscribe((status, err) => {
        const timestamp = new Date().toISOString()
        console.log(`[${timestamp}] 🔔 Read receipts subscription status for ${chatId}:`, status, {
          error: err,
          channel: channel.topic
        })
        
        if (err) {
          console.error(`[${timestamp}] ❌ Read receipts subscription error:`, {
            error: err,
            chatId,
            channel: channel.topic,
            errorType: err.constructor.name,
            errorMessage: err.message
          })
        } else if (status === 'SUBSCRIBED') {
          console.log(`[${timestamp}] ✅ Successfully subscribed to read receipts for chat ${chatId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[${timestamp}] 🚨 CHANNEL_ERROR detected for read_receipts:${chatId}`)
        }
        
        onStatusChange?.(status)
      })
    
    return channel
  } catch (error) {
    console.error('Failed to create read receipts subscription:', error)
    throw error
  }
}

// Unified Real-time Subscription System
// Combines chats, messages, and read receipts into a single multiplexed channel
export const createUnifiedSubscription = (
  chatId: string | null, // null for global chat updates only
  callbacks: {
    onChatsUpdate?: (payload: any) => void
    onMessagesUpdate?: (payload: any) => void 
    onReadReceiptsUpdate?: (payload: any) => void
  },
  onStatusChange?: (status: string) => void
) => {
  try {
    const client = getAuthenticatedClient()
    const walletAddress = getCurrentWalletAddress()
    
    if (!walletAddress) {
      throw new Error('No wallet address found for unified subscription')
    }

    // Create single multiplexed channel - much more efficient than 3 separate channels
    const channelName = chatId ? `unified:${walletAddress}:${chatId}` : `unified:${walletAddress}:global`
    console.log(`🔀 Creating unified subscription channel: ${channelName}`)
    
    const channel = client.channel(channelName)

    // Subscribe to chat updates (always active)
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chats'
      },
      (payload) => {
        // Filter to only relevant chats for this wallet
        const newData = payload.new as any
        if (newData && 
            (newData.sender_wallet === walletAddress || newData.recipient_wallet === walletAddress)) {
          console.log(`📨 Unified chat update:`, {
            eventType: payload.eventType,
            chatId: newData.id,
            channel: channelName
          })
          callbacks.onChatsUpdate?.(payload)
        }
      }
    )

    // Subscribe to message updates (only for specific chat)
    if (chatId && callbacks.onMessagesUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log(`📬 Unified message update for chat ${chatId}:`, {
            eventType: payload.eventType,
            messageId: (payload.new as any)?.id,
            channel: channelName
          })
          callbacks.onMessagesUpdate?.(payload)
        }
      )
    }

    // Subscribe to read receipt updates (only for specific chat)
    if (chatId && callbacks.onReadReceiptsUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newData = payload.new as { wallet_address?: string; last_read_message_id?: string } | null
          // Only process updates from other participants
          if (newData?.wallet_address && newData.wallet_address !== walletAddress) {
            console.log(`👁️ Unified read receipt update for chat ${chatId}:`, {
              eventType: payload.eventType,
              walletAddress: newData.wallet_address.slice(0, 8) + '...',
              channel: channelName
            })
            callbacks.onReadReceiptsUpdate?.(payload)
          }
        }
      )
    }

    // Single subscription with unified status monitoring
    channel.subscribe((status, err) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] 🔀 Unified subscription status (${channelName}):`, status, {
        error: err,
        chatId,
        hasChatsCallback: !!callbacks.onChatsUpdate,
        hasMessagesCallback: !!callbacks.onMessagesUpdate,
        hasReadReceiptsCallback: !!callbacks.onReadReceiptsUpdate
      })
      
      if (err) {
        console.error(`[${timestamp}] ❌ Unified subscription error:`, {
          error: err,
          channel: channelName,
          errorType: err.constructor.name,
          errorMessage: err.message
        })
      } else if (status === 'SUBSCRIBED') {
        console.log(`[${timestamp}] ✅ Unified subscription active for ${channelName}`)
        console.log('📡 Monitoring events:', {
          chats: !!callbacks.onChatsUpdate,
          messages: !!callbacks.onMessagesUpdate,
          readReceipts: !!callbacks.onReadReceiptsUpdate
        })
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[${timestamp}] 🚨 CHANNEL_ERROR in unified subscription: ${channelName}`)
      }
      
      onStatusChange?.(status)
    })
    
    return channel
  } catch (error) {
    console.error('Failed to create unified subscription:', error)
    throw error
  }
}

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false
  
  const wallets = Object.keys(localStorage).filter(key => key.startsWith('auth_token_'))
  if (wallets.length === 0) return false
  
  try {
    const authData = JSON.parse(localStorage.getItem(wallets[0]) || '{}')
    return Date.now() < authData.expires_at
  } catch {
    return false
  }
}

// Export the main client as default
export default supabase