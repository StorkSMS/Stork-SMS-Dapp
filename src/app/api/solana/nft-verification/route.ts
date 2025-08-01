import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

export async function POST(request: NextRequest) {
  try {
    const { publicKey } = await request.json()
    
    if (!publicKey) {
      return NextResponse.json({ error: 'Public key is required' }, { status: 400 })
    }

    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    )

    const walletPublicKey = new PublicKey(publicKey)

    // Get all token accounts for the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    })

    // Filter for NFTs (tokens with amount 1 and 0 decimals)
    const nfts = tokenAccounts.value.filter(account => {
      const tokenInfo = account.account.data.parsed.info
      return tokenInfo.tokenAmount.amount === '1' && tokenInfo.tokenAmount.decimals === 0
    })

    const nftAddresses = nfts.map(nft => ({
      mint: nft.account.data.parsed.info.mint,
      tokenAccount: nft.pubkey.toString()
    }))

    return NextResponse.json({ nfts: nftAddresses })
  } catch (error) {
    console.error('Error verifying NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to verify NFTs' },
      { status: 500 }
    )
  }
}