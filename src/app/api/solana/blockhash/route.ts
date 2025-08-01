import { NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'

export async function GET() {
  try {
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    const { blockhash } = await connection.getLatestBlockhash()

    return NextResponse.json({ blockhash })
  } catch (error) {
    console.error('Error getting latest blockhash:', error)
    return NextResponse.json(
      { error: 'Failed to get latest blockhash' },
      { status: 500 }
    )
  }
}