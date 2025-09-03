import { NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'
import { getMainnetConnection } from '@/lib/solana-connection'

export async function GET() {
  try {
    const connection = getMainnetConnection()

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