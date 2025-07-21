// Debug utilities for testing authentication and database access
import { getAuthenticatedClient, getCurrentWalletAddress } from '@/lib/supabase'

export const testDatabaseAccess = async () => {
  console.log('🔍 Testing database access...')
  
  try {
    // Get current wallet
    const walletAddress = getCurrentWalletAddress()
    if (!walletAddress) {
      console.error('❌ No authenticated wallet found')
      return false
    }
    
    console.log('👛 Testing with wallet:', walletAddress.slice(0, 8) + '...')
    
    // Get authenticated client
    const client = getAuthenticatedClient()
    console.log('🔐 Got authenticated client')
    
    // Test 1: Simple count query
    console.log('📊 Testing count query...')
    const { count, error: countError } = await client
      .from('chats')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Count query failed:', countError)
      return false
    }
    
    console.log('✅ Count query succeeded, total chats:', count)
    
    // Test 2: Filtered query for current wallet
    console.log('🔍 Testing filtered query...')
    const { data: chats, error: queryError } = await client
      .from('chats')
      .select('id, sender_wallet, recipient_wallet, created_at')
      .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
      .limit(5)
    
    if (queryError) {
      console.error('❌ Filtered query failed:', queryError)
      console.error('Query error details:', {
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint,
        code: queryError.code
      })
      return false
    }
    
    console.log('✅ Filtered query succeeded, found chats:', chats?.length || 0)
    
    if (chats && chats.length > 0) {
      console.log('📋 Sample chat:', {
        id: chats[0].id,
        sender: chats[0].sender_wallet.slice(0, 8) + '...',
        recipient: chats[0].recipient_wallet.slice(0, 8) + '...',
        created: chats[0].created_at
      })
    }
    
    // Test 3: Try to create a test chat (this will fail if policies are wrong)
    console.log('🧪 Testing chat creation (will rollback)...')
    const testChatId = 'test-' + Date.now()
    
    try {
      const { data: newChat, error: createError } = await client
        .from('chats')
        .insert({
          id: testChatId,
          sender_wallet: walletAddress,
          recipient_wallet: walletAddress, // Self-chat for testing
          sender_nft_mint: 'test_mint_' + Date.now(),
          recipient_nft_mint: 'test_mint_' + Date.now(),
          chat_title: 'Test Chat - Will Be Deleted'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Chat creation failed:', createError)
        console.error('Creation error details:', {
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          code: createError.code
        })
      } else {
        console.log('✅ Chat creation succeeded:', newChat?.id)
        
        // Clean up - delete the test chat
        const { error: deleteError } = await client
          .from('chats')
          .delete()
          .eq('id', testChatId)
        
        if (deleteError) {
          console.warn('⚠️ Could not clean up test chat:', deleteError.message)
        } else {
          console.log('🧹 Test chat cleaned up')
        }
      }
    } catch (createError) {
      console.error('❌ Chat creation test failed with exception:', createError)
    }
    
    console.log('✅ Database access test completed')
    return true
    
  } catch (error) {
    console.error('❌ Database access test failed:', error)
    return false
  }
}

export const debugAuthState = () => {
  console.log('🔍 Debugging authentication state...')
  
  if (typeof window === 'undefined') {
    console.log('❌ Running on server side')
    return
  }
  
  // Check localStorage for auth tokens
  const authKeys = Object.keys(localStorage).filter(key => key.startsWith('auth_token_'))
  console.log('🔑 Found auth tokens:', authKeys.length)
  
  authKeys.forEach(key => {
    const walletAddress = key.replace('auth_token_', '')
    const stored = localStorage.getItem(key)
    
    if (stored) {
      try {
        const authData = JSON.parse(stored)
        const isExpired = Date.now() > authData.expires_at
        
        console.log(`👛 Wallet: ${walletAddress.slice(0, 8)}...`, {
          hasToken: !!authData.token,
          tokenLength: authData.token?.length || 0,
          isExpired,
          expiresIn: isExpired ? 'expired' : Math.round((authData.expires_at - Date.now()) / 60000) + ' minutes',
          createdAt: authData.created_at ? new Date(authData.created_at).toISOString() : 'unknown'
        })
      } catch (error) {
        console.error(`❌ Invalid auth data for ${walletAddress.slice(0, 8)}...`, error)
      }
    }
  })
}

// Export a function that can be called from browser console
declare global {
  interface Window {
    debugStorkAuth: () => void
    testStorkDB: () => Promise<boolean>
  }
}

if (typeof window !== 'undefined') {
  window.debugStorkAuth = debugAuthState
  window.testStorkDB = testDatabaseAccess
}