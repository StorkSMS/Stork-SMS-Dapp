import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey } from '@solana/web3.js'

interface NFTVerificationState {
  isVerifying: boolean
  ownedNFTs: string[]
  verifiedNFTs: Map<string, boolean>
  error: string | null
}

interface ChatAccessResult {
  canAccess: boolean
  role: 'sender' | 'recipient' | null
  ownedNFTs: string[]
}

export const useNFTVerification = () => {
  const { publicKey, connected } = useWallet()
  const [state, setState] = useState<NFTVerificationState>({
    isVerifying: false,
    ownedNFTs: [],
    verifiedNFTs: new Map(),
    error: null
  })

  const verifyNFTOwnership = useCallback(async (nftMintAddress: string, useCache: boolean = true): Promise<boolean> => {
    if (!connected || !publicKey) {
      return false
    }

    // Check cache first if enabled
    if (useCache && state.verifiedNFTs.has(nftMintAddress)) {
      return state.verifiedNFTs.get(nftMintAddress) || false
    }

    try {
      setState(prev => ({ ...prev, isVerifying: true, error: null }))

      // Create connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com'
      )

      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })

      // Check if user owns the specific NFT
      const ownsNFT = tokenAccounts.value.some(account => {
        const mint = account.account.data.parsed.info.mint
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount
        return mint === nftMintAddress && amount > 0
      })

      setState(prev => {
        const newVerifiedNFTs = new Map(prev.verifiedNFTs)
        newVerifiedNFTs.set(nftMintAddress, ownsNFT)
        
        return {
          ...prev, 
          isVerifying: false,
          ownedNFTs: ownsNFT && !prev.ownedNFTs.includes(nftMintAddress) 
            ? [...prev.ownedNFTs, nftMintAddress] 
            : prev.ownedNFTs,
          verifiedNFTs: newVerifiedNFTs
        }
      })

      return ownsNFT

    } catch (error) {
      console.error('NFT verification error:', error)
      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: error instanceof Error ? error.message : 'NFT verification failed' 
      }))
      return false
    }
  }, [connected, publicKey, state.verifiedNFTs])

  const refreshOwnedNFTs = useCallback(async (): Promise<string[]> => {
    if (!connected || !publicKey) {
      return []
    }

    try {
      setState(prev => ({ ...prev, isVerifying: true, error: null }))

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com'
      )

      // Get all NFTs owned by the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })

      const ownedNFTs = tokenAccounts.value
        .filter(account => {
          const amount = account.account.data.parsed.info.tokenAmount.uiAmount
          return amount > 0
        })
        .map(account => account.account.data.parsed.info.mint)

      setState(prev => {
        const newVerifiedNFTs = new Map(prev.verifiedNFTs)
        // Update cache with ownership status for all found NFTs
        ownedNFTs.forEach(nft => newVerifiedNFTs.set(nft, true))
        
        return {
          ...prev, 
          isVerifying: false, 
          ownedNFTs,
          verifiedNFTs: newVerifiedNFTs
        }
      })

      return ownedNFTs

    } catch (error) {
      console.error('NFT refresh error:', error)
      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: error instanceof Error ? error.message : 'Failed to refresh NFTs' 
      }))
      return []
    }
  }, [connected, publicKey])

  const checkChatAccess = useCallback(async (senderNFT: string, recipientNFT: string): Promise<ChatAccessResult> => {
    if (!connected || !publicKey) {
      return {
        canAccess: false,
        role: null,
        ownedNFTs: []
      }
    }

    try {
      // Verify ownership of both NFTs in parallel for efficiency
      const [ownsSenderNFT, ownsRecipientNFT] = await Promise.all([
        verifyNFTOwnership(senderNFT),
        verifyNFTOwnership(recipientNFT)
      ])

      const ownedNFTs: string[] = []
      let role: 'sender' | 'recipient' | null = null

      if (ownsSenderNFT) {
        ownedNFTs.push(senderNFT)
        role = 'sender'
      }

      if (ownsRecipientNFT) {
        ownedNFTs.push(recipientNFT)
        // If user owns both, prioritize recipient role (they received the message)
        role = 'recipient'
      }

      return {
        canAccess: ownsSenderNFT || ownsRecipientNFT,
        role,
        ownedNFTs
      }
    } catch (error) {
      console.error('Chat access verification error:', error)
      return {
        canAccess: false,
        role: null,
        ownedNFTs: []
      }
    }
  }, [connected, publicKey, verifyNFTOwnership])

  // Batch verify multiple NFTs for efficiency
  const verifyMultipleNFTs = useCallback(async (nftAddresses: string[]): Promise<Map<string, boolean>> => {
    if (!connected || !publicKey) {
      return new Map()
    }

    const results = new Map<string, boolean>()
    
    try {
      const verificationPromises = nftAddresses.map(async (nft) => {
        const owns = await verifyNFTOwnership(nft)
        return { nft, owns }
      })

      const verificationResults = await Promise.all(verificationPromises)
      verificationResults.forEach(({ nft, owns }) => {
        results.set(nft, owns)
      })
    } catch (error) {
      console.error('Batch NFT verification error:', error)
    }

    return results
  }, [connected, publicKey, verifyNFTOwnership])

  // Clear verification cache
  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      verifiedNFTs: new Map(),
      ownedNFTs: []
    }))
  }, [])

  return {
    ...state,
    verifyNFTOwnership,
    refreshOwnedNFTs,
    checkChatAccess,
    verifyMultipleNFTs,
    clearCache,
    isConnected: connected,
    walletAddress: publicKey?.toString() || null
  }
}