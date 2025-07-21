import { PublicKey } from '@solana/web3.js'
import { Metaplex } from '@metaplex-foundation/js'
import { connection, companyWalletPublicKey } from './company-wallet'
import { supabase } from './supabase'
import type { MessageNFTMetadata } from '@/types/nft'

// Metaplex instance for NFT operations
const metaplex = Metaplex.make(connection)

export interface NFTVerificationResult {
  isValid: boolean
  owner?: string
  metadata?: any
  onChainData?: any
  error?: string
}

export interface MessageNFTInfo {
  mintAddress: string
  owner: string
  metadata: MessageNFTMetadata
  imageUrl: string
  metadataUrl: string
  createdAt: string
  messageContent: string
  senderWallet: string
  recipientWallet: string
}

/**
 * NFT utility functions for verification, management, and queries
 */
export class NFTUtils {
  /**
   * Verify NFT exists and get its current owner
   */
  static async verifyNFT(mintAddress: string): Promise<NFTVerificationResult> {
    try {
      const mintPublicKey = new PublicKey(mintAddress)
      
      // Get NFT data from blockchain
      const nft = await metaplex.nfts().findByMint({ 
        mintAddress: mintPublicKey 
      })
      
      if (!nft) {
        return {
          isValid: false,
          error: 'NFT not found on blockchain'
        }
      }
      
      return {
        isValid: true,
        owner: (nft as any).ownerAddress?.toBase58() || (nft as any).token?.ownerAddress?.toBase58() || 'Unknown',
        metadata: nft.json,
        onChainData: {
          name: nft.name,
          symbol: nft.symbol,
          uri: nft.uri,
          sellerFeeBasisPoints: nft.sellerFeeBasisPoints,
          creators: nft.creators?.map(creator => ({
            address: creator.address.toBase58(),
            verified: creator.verified,
            share: creator.share
          }))
        }
      }
    } catch (error) {
      console.error('NFT verification error:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error'
      }
    }
  }

  /**
   * Check if a specific wallet owns an NFT
   */
  static async checkNFTOwnership(walletAddress: string, mintAddress: string): Promise<boolean> {
    try {
      const verification = await this.verifyNFT(mintAddress)
      
      if (!verification.isValid || !verification.owner) {
        return false
      }
      
      return verification.owner === walletAddress
    } catch (error) {
      console.error('NFT ownership check error:', error)
      return false
    }
  }

  /**
   * Get all NFTs owned by a wallet (filtered for Stork messages)
   */
  static async getWalletNFTs(walletAddress: string): Promise<MessageNFTInfo[]> {
    try {
      const walletPublicKey = new PublicKey(walletAddress)
      
      // Get all NFTs owned by the wallet
      const nfts = await metaplex.nfts().findAllByOwner({ 
        owner: walletPublicKey 
      })
      
      const storkNFTs: MessageNFTInfo[] = []
      
      for (const nft of nfts) {
        try {
          // Check if this is a Stork message NFT
          const metadata = nft.json as any
          if (metadata?.properties?.category === 'image' && 
              metadata?.message?.content &&
              metadata?.message?.sender &&
              metadata?.message?.recipient) {
            
            storkNFTs.push({
              mintAddress: nft.address.toBase58(),
              owner: walletAddress,
              metadata: metadata as MessageNFTMetadata,
              imageUrl: metadata.image,
              metadataUrl: nft.uri,
              createdAt: metadata.message.timestamp,
              messageContent: metadata.message.content,
              senderWallet: metadata.message.sender,
              recipientWallet: metadata.message.recipient
            })
          }
        } catch (metadataError) {
          console.warn('Error processing NFT metadata:', metadataError)
          // Skip NFTs with invalid metadata
          continue
        }
      }
      
      // Sort by creation date (newest first)
      return storkNFTs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
    } catch (error) {
      console.error('Error getting wallet NFTs:', error)
      return []
    }
  }

  /**
   * Get message history between two wallets (NFT messages only)
   */
  static async getMessageHistory(
    wallet1: string, 
    wallet2: string,
    limit: number = 50
  ): Promise<MessageNFTInfo[]> {
    try {
      // Get all NFTs for both wallets
      const wallet1NFTs = await this.getWalletNFTs(wallet1)
      const wallet2NFTs = await this.getWalletNFTs(wallet2)
      
      // Combine and filter for messages between these two wallets
      const allNFTs = [...wallet1NFTs, ...wallet2NFTs]
      const conversationNFTs = allNFTs.filter(nft => 
        (nft.senderWallet === wallet1 && nft.recipientWallet === wallet2) ||
        (nft.senderWallet === wallet2 && nft.recipientWallet === wallet1)
      )
      
      // Remove duplicates (same NFT might be owned by either party)
      const uniqueNFTs = conversationNFTs.reduce((unique, nft) => {
        const exists = unique.find(existing => existing.mintAddress === nft.mintAddress)
        if (!exists) {
          unique.push(nft)
        }
        return unique
      }, [] as MessageNFTInfo[])
      
      // Sort by creation date and limit results
      return uniqueNFTs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
        
    } catch (error) {
      console.error('Error getting message history:', error)
      return []
    }
  }

  /**
   * Validate NFT metadata structure
   */
  static validateNFTMetadata(metadata: any): boolean {
    try {
      // Check required fields for Stork message NFTs
      return !!(
        metadata &&
        metadata.name &&
        metadata.description &&
        metadata.image &&
        metadata.attributes &&
        Array.isArray(metadata.attributes) &&
        metadata.properties &&
        metadata.properties.category === 'image' &&
        metadata.message &&
        metadata.message.content &&
        metadata.message.sender &&
        metadata.message.recipient &&
        metadata.message.timestamp
      )
    } catch {
      return false
    }
  }

  /**
   * Get NFT statistics for analytics
   */
  static async getNFTStats(walletAddress?: string) {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'nft')
      
      if (walletAddress) {
        query = query.or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
      }
      
      const { data: nftMessages, error } = await query
      
      if (error) {
        throw error
      }
      
      // Calculate statistics
      const totalNFTs = nftMessages.length
      const uniqueSenders = new Set(nftMessages.map(msg => msg.sender_wallet)).size
      const uniqueRecipients = new Set(nftMessages.map(msg => msg.recipient_wallet)).size
      const totalUniqueUsers = new Set([
        ...nftMessages.map(msg => msg.sender_wallet),
        ...nftMessages.map(msg => msg.recipient_wallet)
      ]).size
      
      // Get theme distribution
      const themeDistribution: Record<string, number> = {}
      nftMessages.forEach(msg => {
        const theme = msg.metadata?.theme || 'default'
        themeDistribution[theme] = (themeDistribution[theme] || 0) + 1
      })
      
      // Get creation timeline (by month)
      const creationTimeline: Record<string, number> = {}
      nftMessages.forEach(msg => {
        const month = new Date(msg.created_at).toISOString().substring(0, 7) // YYYY-MM
        creationTimeline[month] = (creationTimeline[month] || 0) + 1
      })
      
      return {
        totalNFTs,
        uniqueSenders,
        uniqueRecipients,
        totalUniqueUsers,
        themeDistribution,
        creationTimeline,
        averageMessageLength: nftMessages.reduce((sum, msg) => 
          sum + msg.message_content.length, 0
        ) / totalNFTs || 0
      }
      
    } catch (error) {
      console.error('Error getting NFT stats:', error)
      throw error
    }
  }

  /**
   * Search NFTs by content or metadata
   */
  static async searchNFTs(
    searchTerm: string,
    walletAddress?: string,
    limit: number = 20
  ): Promise<MessageNFTInfo[]> {
    try {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'nft')
        .ilike('message_content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (walletAddress) {
        query = query.or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
      }
      
      const { data: messages, error } = await query
      
      if (error) {
        throw error
      }
      
      // Convert database records to MessageNFTInfo format
      const nftInfos: MessageNFTInfo[] = []
      
      for (const message of messages) {
        if (message.nft_mint_address) {
          // Verify NFT still exists and get current owner
          const verification = await this.verifyNFT(message.nft_mint_address)
          
          if (verification.isValid && verification.owner) {
            nftInfos.push({
              mintAddress: message.nft_mint_address,
              owner: verification.owner,
              metadata: verification.metadata as MessageNFTMetadata,
              imageUrl: message.nft_image_url,
              metadataUrl: message.nft_metadata_url,
              createdAt: message.created_at,
              messageContent: message.message_content,
              senderWallet: message.sender_wallet,
              recipientWallet: message.recipient_wallet
            })
          }
        }
      }
      
      return nftInfos
      
    } catch (error) {
      console.error('Error searching NFTs:', error)
      return []
    }
  }

  /**
   * Transfer NFT to another wallet (requires signing)
   */
  static async createTransferTransaction(
    mintAddress: string,
    fromWallet: string,
    toWallet: string
  ) {
    try {
      const mintPublicKey = new PublicKey(mintAddress)
      const fromPublicKey = new PublicKey(fromWallet)
      const toPublicKey = new PublicKey(toWallet)
      
      // Get NFT data
      const nft = await metaplex.nfts().findByMint({ 
        mintAddress: mintPublicKey 
      })
      
      if (!nft) {
        throw new Error('NFT not found')
      }
      
      // Verify current owner
      const nftAny = nft as any
      const currentOwner = nftAny.ownerAddress || nftAny.token?.ownerAddress
      if (!currentOwner || !currentOwner.equals(fromPublicKey)) {
        throw new Error('Sender does not own this NFT')
      }
      
      // Create transfer instruction (would need to be signed by frontend)
      const transferBuilder = metaplex.nfts().builders().transfer({
        nftOrSft: nft,
        fromOwner: fromPublicKey,
        toOwner: toPublicKey
      })
      
      // Get recent blockhash for transaction
      const { blockhash, lastValidBlockHeight } = await metaplex.connection.getLatestBlockhash()
      const transaction = await transferBuilder.toTransaction({ blockhash, lastValidBlockHeight })
      
      return {
        transaction,
        nft,
        message: 'Transfer transaction created. Please sign with your wallet.'
      }
      
    } catch (error) {
      console.error('Error creating transfer transaction:', error)
      throw error
    }
  }
}

/**
 * Helper function to format NFT data for display
 */
export function formatNFTForDisplay(nft: MessageNFTInfo) {
  return {
    id: nft.mintAddress,
    title: `Message from ${nft.senderWallet.substring(0, 8)}...`,
    content: nft.messageContent,
    image: nft.imageUrl,
    sender: nft.senderWallet,
    recipient: nft.recipientWallet,
    owner: nft.owner,
    createdAt: new Date(nft.createdAt).toLocaleDateString(),
    theme: nft.metadata?.attributes?.find(attr => attr.trait_type === 'Theme')?.value || 'default',
    sentiment: nft.metadata?.attributes?.find(attr => attr.trait_type === 'Sentiment')?.value || 'neutral'
  }
}

/**
 * Helper function to generate NFT sharing URL
 */
export function generateNFTShareURL(mintAddress: string, baseUrl: string = 'https://stork-sms.app') {
  return `${baseUrl}/nft/${mintAddress}`
}

/**
 * Helper function to get marketplace URL for NFT
 */
export function getMarketplaceURL(mintAddress: string, marketplace: 'magiceden' | 'solanart' | 'opensea' = 'magiceden') {
  const marketplaceUrls = {
    magiceden: `https://magiceden.io/item-details/${mintAddress}`,
    solanart: `https://solanart.io/search/?token=${mintAddress}`,
    opensea: `https://opensea.io/assets/solana/${mintAddress}`
  }
  
  return marketplaceUrls[marketplace]
}