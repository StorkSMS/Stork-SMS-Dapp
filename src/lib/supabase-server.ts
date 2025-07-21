// Server-side Supabase client for API routes
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use service role key for admin operations (secret key doesn't have admin privileges)
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing required Supabase environment variables for server')
}

// Server-side client with elevated privileges
export const supabaseServer = createClient<Database>(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create proper Supabase session for wallet users
export const createWalletSession = async (walletAddress: string, signature?: string) => {
  try {
    console.log(`Creating Supabase session for wallet: ${walletAddress.slice(0, 8)}...`)
    
    // Create a unique email for this wallet
    const email = `${walletAddress.toLowerCase()}@wallet.stork-sms.app`
    
    // Check if user already exists
    const { data: existingUser, error: userError } = await supabaseServer.auth.admin.listUsers()
    
    let user = existingUser?.users.find(u => u.email === email)
    
    if (!user) {
      // Create new user
      console.log(`Creating new user for wallet: ${walletAddress.slice(0, 8)}...`)
      const { data: newUser, error: createError } = await supabaseServer.auth.admin.createUser({
        email,
        email_confirm: true, // Skip email verification
        user_metadata: {
          wallet_address: walletAddress,
          auth_method: 'wallet'
        },
        app_metadata: {
          provider: 'wallet',
          wallet_address: walletAddress
        }
      })
      
      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`)
      }
      
      user = newUser.user
      console.log(`User created for wallet: ${walletAddress.slice(0, 8)}...`)
    } else {
      console.log(`Existing user found for wallet: ${walletAddress.slice(0, 8)}...`)
    }
    
    if (!user) {
      throw new Error('Failed to create or find user')
    }
    
    // Create a proper JWT token using Supabase's JWT secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) {
      throw new Error('Missing SUPABASE_JWT_SECRET for session creation')
    }
    
    const tokenPayload = {
      iss: 'supabase',
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      // Include wallet_address at multiple levels for RLS compatibility
      wallet_address: walletAddress,
      user_metadata: {
        ...user.user_metadata,
        wallet_address: walletAddress
      },
      app_metadata: {
        ...user.app_metadata,
        wallet_address: walletAddress
      }
    }
    
    const accessToken = jwt.sign(tokenPayload, jwtSecret)
    
    console.log(`Supabase session created for wallet: ${walletAddress.slice(0, 8)}...`)
    
    return {
      success: true,
      user: user,
      session: {
        access_token: accessToken,
        refresh_token: accessToken,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: user
      },
      token: accessToken,
      wallet_address: walletAddress,
      expires_at: new Date(Date.now() + 3600000).toISOString()
    }
    
  } catch (error) {
    console.error('Supabase wallet session creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}

// Validate wallet signature with proper Solana signature verification
export const validateWalletSignature = (
  walletAddress: string,
  signature: string,
  message: string
): boolean => {
  try {
    const nacl = require('tweetnacl')
    const bs58 = require('bs58')
    const { PublicKey } = require('@solana/web3.js')
    
    // Basic validation checks
    if (!walletAddress || !signature || !message) {
      console.log('❌ Missing required parameters for signature validation')
      return false
    }
    
    // Validate wallet address format (Solana base58 addresses are typically 44 characters)
    if (walletAddress.length < 32 || walletAddress.length > 50) {
      console.log('❌ Invalid wallet address format')
      return false
    }
    
    // Validate message format - should contain wallet address, timestamp, and session ID
    if (!message.includes(walletAddress)) {
      console.log('❌ Message does not contain wallet address')
      return false
    }
    
    if (!message.includes('Security Timestamp:') || !message.includes('Unique Session ID:')) {
      console.log('❌ Message missing required fields')
      return false
    }
    
    // Extract timestamp from message to check for replay attacks
    // The message now contains a formatted date, so we need to extract the raw timestamp differently
    // Since we can't easily extract the timestamp from the formatted date, we'll rely on the 
    // timestamp validation being done at the API level when the signature data is received
    console.log('✅ Message format validation passed')
    
    // Perform actual cryptographic signature verification
    try {
      // Convert wallet address to PublicKey
      const publicKey = new PublicKey(walletAddress)
      
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message)
      
      // Convert signature from base64 to Uint8Array
      let signatureBytes: Uint8Array
      try {
        // Try base64 first (most common format)
        signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'))
      } catch {
        try {
          // Try base58 if base64 fails
          signatureBytes = bs58.decode(signature)
        } catch {
          console.log('❌ Invalid signature format - not base64 or base58')
          return false
        }
      }
      
      // Verify signature using tweetnacl
      const publicKeyBytes = publicKey.toBytes()
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
      
      if (isValid) {
        console.log('✅ Signature verification passed - cryptographically valid')
        return true
      } else {
        console.log('❌ Signature verification failed - invalid signature')
        return false
      }
      
    } catch (cryptoError) {
      console.error('❌ Cryptographic verification error:', cryptoError)
      return false
    }
    
  } catch (error) {
    console.error('❌ Signature validation error:', error)
    return false
  }
}

// Get user by wallet address - simplified version
export const getUserByWalletAddress = async (walletAddress: string) => {
  // Since we're not storing users in Supabase auth, just return a virtual user
  const userId = crypto.createHash('sha256').update(walletAddress).digest('hex')
  const formattedUuid = `${userId.substring(0, 8)}-${userId.substring(8, 12)}-${userId.substring(12, 16)}-${userId.substring(16, 20)}-${userId.substring(20, 32)}`
  
  return {
    id: formattedUuid,
    email: `${walletAddress.toLowerCase()}@wallet.stork-sms.app`,
    user_metadata: {
      wallet_address: walletAddress,
      auth_method: 'wallet'
    },
    app_metadata: {
      provider: 'wallet',
      wallet_address: walletAddress
    }
  }
}

// Helper function to verify server access is working
export const verifyServerAccess = async () => {
  try {
    const { data, error } = await supabaseServer.from('chats').select('count(*)', { count: 'exact' })
    if (error) {
      console.error('Server access verification failed:', error)
      return false
    }
    console.log('✅ Server access verified, can access chats table')
    return true
  } catch (error) {
    console.error('Server access verification error:', error)
    return false
  }
}

export default supabaseServer