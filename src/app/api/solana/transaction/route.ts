import { NextRequest, NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'

export async function POST(request: NextRequest) {
  try {
    const { action, signature } = await request.json()
    
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    if (action === 'confirm') {
      if (!signature) {
        return NextResponse.json({ error: 'Signature is required for confirmation' }, { status: 400 })
      }

      await connection.confirmTransaction(signature, 'confirmed')
      return NextResponse.json({ confirmed: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in transaction API:', error)
    return NextResponse.json(
      { error: 'Transaction operation failed' },
      { status: 500 }
    )
  }
}