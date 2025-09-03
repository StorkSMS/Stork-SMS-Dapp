import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'
import { getMainnetConnection } from '@/lib/solana-connection'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const publicKey = searchParams.get('publicKey')
    
    if (!publicKey) {
      return NextResponse.json({ error: 'Public key is required' }, { status: 400 })
    }

    const connection = getMainnetConnection()

    const pubkey = new PublicKey(publicKey)
    const balance = await connection.getBalance(pubkey)

    return NextResponse.json({ balance })
  } catch (error) {
    console.error('Error getting balance:', error)
    return NextResponse.json(
      { error: 'Failed to get balance' },
      { status: 500 }
    )
  }
}