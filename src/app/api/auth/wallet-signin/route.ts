import { NextRequest, NextResponse } from 'next/server'
import { createWalletSession, validateWalletSignature } from '@/lib/supabase-server'
import crypto from 'crypto'

// Global request deduplication map
const activeRequests = new Map<string, Promise<NextResponse>>()

// Cleanup old requests after 30 seconds
setInterval(() => {
  const now = Date.now()
  for (const [key, promise] of activeRequests.entries()) {
    // Remove promises older than 30 seconds (they should have resolved by now)
    const [, timestamp] = key.split(':')
    if (now - parseInt(timestamp) > 30000) {
      activeRequests.delete(key)
    }
  }
}, 30000)

interface WalletSignInRequest {
  wallet_address: string
  signature?: string
  message?: string
  timestamp?: number
  nonce?: string
}

interface SigningMessageResponse {
  message: string
  timestamp: number
  nonce: string
}

// Generate secure nonce
function generateSecureNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

// Generate signing message for wallet signature verification
function generateSigningMessage(walletAddress: string, timestamp: number, nonce: string): string {
  return `Welcome to Stork SMS! 🔐

To securely connect your wallet and protect your account, please sign this authentication message. This proves you own this wallet without sharing your private keys.

Wallet Address: ${walletAddress}
Security Timestamp: ${new Date(timestamp).toLocaleString()}
Unique Session ID: ${nonce}

✓ Your private keys stay safe in your wallet
✓ This signature expires when you sign out
✓ No tokens or funds will be accessed

By signing, you authorize secure access to Stork SMS messaging features.`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet_address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'wallet_address parameter is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (walletAddress.length < 32 || walletAddress.length > 50) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const nonce = generateSecureNonce()
    const message = generateSigningMessage(walletAddress, timestamp, nonce)

    const responseData: SigningMessageResponse = {
      message,
      timestamp,
      nonce
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Failed to generate signing message:', error)
    return NextResponse.json(
      { error: 'Failed to generate signing message' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const signInData: WalletSignInRequest = body

    // Validate required fields
    if (!signInData.wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format (Solana addresses are base58, ~44 characters)
    if (signInData.wallet_address.length < 32 || signInData.wallet_address.length > 50) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Request deduplication for signature verification
    const requestKey = `${signInData.wallet_address}:${Date.now()}`
    const existingRequest = activeRequests.get(signInData.wallet_address)
    
    if (existingRequest) {
      console.log(`🔄 Deduplicating request for: ${signInData.wallet_address.slice(0, 8)}...`)
      try {
        return await existingRequest
      } catch (error) {
        // If existing request failed, continue with new one
        activeRequests.delete(signInData.wallet_address)
      }
    }

    // Create and store the authentication promise
    const authPromise = (async (): Promise<NextResponse> => {
      console.log(`Processing wallet authentication for: ${signInData.wallet_address.slice(0, 8)}...`)

      // Check if signature authentication is being used
      const isSignatureAuth = signInData.signature && signInData.message

    if (isSignatureAuth) {
      // Validate all signature fields are present
      if (!signInData.timestamp || !signInData.nonce) {
        return NextResponse.json(
          { error: 'Missing signature validation fields (timestamp, nonce)' },
          { status: 400 }
        )
      }

      // Validate timestamp to prevent replay attacks
      const currentTime = Date.now()
      const timeDiff = currentTime - signInData.timestamp
      const maxAge = 10 * 60 * 1000 // 10 minutes in milliseconds
      
      if (timeDiff > maxAge) {
        console.log(`❌ Signature too old for: ${signInData.wallet_address.slice(0, 8)}... (age: ${Math.round(timeDiff / 1000)}s)`)
        return NextResponse.json(
          { error: 'Signature expired, please try again' },
          { status: 401 }
        )
      }
      
      if (timeDiff < -60000) { // 1 minute tolerance for future timestamps
        console.log(`❌ Signature from future for: ${signInData.wallet_address.slice(0, 8)}...`)
        return NextResponse.json(
          { error: 'Invalid timestamp, please try again' },
          { status: 401 }
        )
      }

      // Validate signature with enhanced security checks
      console.log(`Validating signature for: ${signInData.wallet_address.slice(0, 8)}...`)
      
      const isValidSignature = validateWalletSignature(
        signInData.wallet_address, 
        signInData.signature!, 
        signInData.message!
      )
      
      if (!isValidSignature) {
        console.log(`❌ Signature validation failed for: ${signInData.wallet_address.slice(0, 8)}...`)
        return NextResponse.json(
          { error: 'Invalid signature or signature verification failed' },
          { status: 401 }
        )
      }
      
      console.log(`✅ Signature validation passed for: ${signInData.wallet_address.slice(0, 8)}...`)
    }

    // Create or get user session
    console.log(`Creating session for: ${signInData.wallet_address.slice(0, 8)}...`)
    
    const sessionResult = await createWalletSession(
      signInData.wallet_address,
      signInData.signature
    )

    if (!sessionResult.success) {
      console.log(`❌ Session creation failed for: ${signInData.wallet_address.slice(0, 8)}...`, sessionResult.error)
      
      // Provide more specific error messages
      let errorMessage = 'Authentication failed'
      if (sessionResult.error?.includes('JWT')) {
        errorMessage = 'Session token creation failed'
      } else if (sessionResult.error?.includes('user')) {
        errorMessage = 'User account creation failed'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: sessionResult.error },
        { status: 500 }
      )
    }

    console.log(`✅ Wallet authentication successful for: ${signInData.wallet_address.slice(0, 8)}...`)

    const responseData = {
      success: true,
      token: sessionResult.token || '',
      session: sessionResult.session || null,
      user: sessionResult.user || null,
      wallet_address: sessionResult.wallet_address || signInData.wallet_address,
      expires_at: sessionResult.expires_at || new Date(Date.now() + 3600000).toISOString(),
      message: `Authentication successful (${isSignatureAuth ? 'signature' : 'basic'})`
    }

    const response = NextResponse.json(responseData)

    // Set secure HTTP-only cookie for session
    if (responseData.token) {
      response.cookies.set('sb-access-token', responseData.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600, // 1 hour
        path: '/'
      })
    }

      return response
    })()

    // Store the promise for deduplication
    activeRequests.set(signInData.wallet_address, authPromise)

    try {
      const result = await authPromise
      return result
    } finally {
      // Clean up after request completes
      activeRequests.delete(signInData.wallet_address)
    }

  } catch (error) {
    console.error('Wallet authentication error:', error)
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Authentication failed'
    let statusCode = 500
    
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid request format'
      statusCode = 400
    } else if (error instanceof Error) {
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error during authentication'
        statusCode = 503
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Authentication request timed out'
        statusCode = 408
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many authentication attempts, please try again later'
        statusCode = 429
      }
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: statusCode }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Processing wallet sign-out request')

    const response = NextResponse.json({
      success: true,
      message: 'Sign-out successful'
    })

    // Clear the session cookie
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Wallet sign-out error:', error)
    return NextResponse.json(
      { error: 'Sign-out failed' },
      { status: 500 }
    )
  }
}