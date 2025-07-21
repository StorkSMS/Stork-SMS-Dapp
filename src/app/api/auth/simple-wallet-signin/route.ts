import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

interface WalletSignInRequest {
  wallet_address: string
  signature?: string
  message?: string
}

interface WalletSignInResponse {
  success: boolean
  token: string
  wallet_address: string
  expires_at: string
  message?: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'stork-jwt-secret-change-in-production'

export async function POST(request: NextRequest) {
  try {
    console.log('Processing simple wallet sign-in request')

    const body = await request.json()
    const signInData: WalletSignInRequest = body

    // Basic validation
    if (!signInData.wallet_address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Basic wallet address format validation (Solana addresses are ~44 characters)
    if (signInData.wallet_address.length < 32 || signInData.wallet_address.length > 50) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    console.log(`Processing sign-in for wallet: ${signInData.wallet_address.slice(0, 8)}...`)

    // Generate JWT token
    const tokenPayload = {
      wallet_address: signInData.wallet_address,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    console.log(`Simple wallet sign-in successful for: ${signInData.wallet_address.slice(0, 8)}...`)

    const responseData: WalletSignInResponse = {
      success: true,
      token,
      wallet_address: signInData.wallet_address,
      expires_at: expiresAt.toISOString(),
      message: 'Authentication successful'
    }

    return NextResponse.json(responseData, { status: 200 })

  } catch (error) {
    console.error('Simple wallet sign-in error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Simple wallet auth endpoint is working',
    timestamp: new Date().toISOString()
  })
}