// This file has been simplified for cNFT compatibility
// Many functions are deprecated as cNFTs work differently from traditional NFTs

import { PublicKey } from '@solana/web3.js'
import { connection } from './company-wallet'
import { supabase } from './supabase'
import type { MessageNFTMetadata } from '@/types/nft'

export interface NFTVerificationResult {
  isValid: boolean
  owner?: string
  metadata?: any
  onChainData?: any
  error?: string
}

export interface MessageNFTInfo {
  mintAddress: string // For cNFTs, this is the asset ID
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
 * Simplified NFT utility functions for cNFT compatibility
 */
export class NFTUtils {
  /**
   * DEPRECATED: Use database-based verification instead
   * cNFT verification requires DAS API integration
   */
  static async verifyNFT(assetId: string): Promise<NFTVerificationResult> {
    console.warn('NFTUtils.verifyNFT is deprecated for cNFTs. Use database lookup instead.')
    
    try {
      // For cNFTs, we rely on database records instead of on-chain verification
      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('nft_mint_address', assetId)
        .single()
      
      if (error || !message) {
        return {
          isValid: false,
          error: 'cNFT record not found in database'
        }
      }
      
      return {
        isValid: true,
        owner: 'Unknown', // Would require DAS API for cNFTs
        metadata: {
          name: `Stork Message #${assetId.substring(0, 8)}`,
          description: message.message_content,
          image: message.nft_image_url
        },
        onChainData: {
          assetId,
          messageContent: message.message_content,
          senderWallet: message.sender_wallet,
          recipientWallet: message.recipient_wallet
        }
      }
    } catch (error) {
      console.error('cNFT verification error:', error)
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error'
      }
    }
  }

  /**
   * SIMPLIFIED: Check ownership via database records
   * For cNFTs, real ownership verification requires DAS API
   */
  static async checkNFTOwnership(walletAddress: string, assetId: string): Promise<boolean> {
    console.log('Checking cNFT ownership via database records')
    
    try {
      // Check database for NFT record
      const { data: message, error } = await supabase
        .from('messages')
        .select('*')
        .eq('nft_mint_address', assetId)
        .single()
      
      if (error || !message) {
        return false
      }
      
      // For now, assume sender or recipient owns the cNFT
      return message.sender_wallet === walletAddress || 
             message.recipient_wallet === walletAddress
    } catch (error) {
      console.error('cNFT ownership check error:', error)
      return false
    }
  }

  /**
   * Get message NFTs from database (works for both traditional NFTs and cNFTs)
   */
  static async getWalletNFTs(walletAddress: string): Promise<MessageNFTInfo[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'nft')
        .or(`sender_wallet.eq.${walletAddress},recipient_wallet.eq.${walletAddress}`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw error
      }
      
      return messages.map(msg => ({
        mintAddress: msg.nft_mint_address,
        owner: walletAddress, // Simplified ownership
        metadata: {
          name: `Stork Message #${msg.nft_mint_address.substring(0, 8)}`,
          description: msg.message_content,
          image: msg.nft_image_url,
          attributes: [],
          properties: { 
            files: [{ uri: msg.nft_image_url, type: 'image/png' }],
            category: 'image' 
          },
          collection: { name: 'Stork SMS Messages', family: 'Stork SMS' },
          message: {
            content: msg.message_content,
            sender: msg.sender_wallet,
            recipient: msg.recipient_wallet,
            timestamp: msg.created_at,
            encrypted: false
          }
        } as MessageNFTMetadata,
        imageUrl: msg.nft_image_url,
        metadataUrl: msg.nft_metadata_url,
        createdAt: msg.created_at,
        messageContent: msg.message_content,
        senderWallet: msg.sender_wallet,
        recipientWallet: msg.recipient_wallet
      }))
      
    } catch (error) {
      console.error('Error getting wallet NFTs:', error)
      return []
    }
  }

  /**
   * Get message history between two wallets
   */
  static async getMessageHistory(
    wallet1: string, 
    wallet2: string,
    limit: number = 50
  ): Promise<MessageNFTInfo[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('message_type', 'nft')
        .or(
          `and(sender_wallet.eq.${wallet1},recipient_wallet.eq.${wallet2}),` +
          `and(sender_wallet.eq.${wallet2},recipient_wallet.eq.${wallet1})`
        )
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        throw error
      }
      
      return messages.map(msg => ({
        mintAddress: msg.nft_mint_address,
        owner: 'Unknown', // Would require DAS API
        metadata: {
          name: `Stork Message #${msg.nft_mint_address.substring(0, 8)}`,
          description: msg.message_content,
          image: msg.nft_image_url,
          attributes: [],
          properties: { 
            files: [{ uri: msg.nft_image_url, type: 'image/png' }],
            category: 'image' 
          },
          collection: { name: 'Stork SMS Messages', family: 'Stork SMS' },
          message: {
            content: msg.message_content,
            sender: msg.sender_wallet,
            recipient: msg.recipient_wallet,
            timestamp: msg.created_at,
            encrypted: false
          }
        } as MessageNFTMetadata,
        imageUrl: msg.nft_image_url,
        metadataUrl: msg.nft_metadata_url,
        createdAt: msg.created_at,
        messageContent: msg.message_content,
        senderWallet: msg.sender_wallet,
        recipientWallet: msg.recipient_wallet
      }))
      
    } catch (error) {
      console.error('Error getting message history:', error)
      return []
    }
  }

  /**
   * Validate NFT metadata structure (works for both formats)
   */
  static validateNFTMetadata(metadata: any): boolean {
    try {
      return !!(
        metadata &&
        metadata.name &&
        metadata.description &&
        metadata.image &&
        metadata.message &&
        metadata.message.content &&
        metadata.message.sender &&
        metadata.message.recipient
      )
    } catch {
      return false
    }
  }

  /**
   * Get NFT statistics from database
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
      
      const totalNFTs = nftMessages.length
      const uniqueSenders = new Set(nftMessages.map(msg => msg.sender_wallet)).size
      const uniqueRecipients = new Set(nftMessages.map(msg => msg.recipient_wallet)).size
      const totalUniqueUsers = new Set([
        ...nftMessages.map(msg => msg.sender_wallet),
        ...nftMessages.map(msg => msg.recipient_wallet)
      ]).size
      
      return {
        totalNFTs,
        uniqueSenders,
        uniqueRecipients,
        totalUniqueUsers,
        averageMessageLength: nftMessages.reduce((sum, msg) => 
          sum + (msg.message_content?.length || 0), 0
        ) / totalNFTs || 0
      }
      
    } catch (error) {
      console.error('Error getting NFT stats:', error)
      throw error
    }
  }

  /**
   * Search NFTs by content (database-based)
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
      
      return messages.map(msg => ({
        mintAddress: msg.nft_mint_address,
        owner: 'Unknown',
        metadata: {
          name: `Stork Message #${msg.nft_mint_address.substring(0, 8)}`,
          description: msg.message_content,
          image: msg.nft_image_url,
          attributes: [],
          properties: { 
            files: [{ uri: msg.nft_image_url, type: 'image/png' }],
            category: 'image' 
          },
          collection: { name: 'Stork SMS Messages', family: 'Stork SMS' },
          message: {
            content: msg.message_content,
            sender: msg.sender_wallet,
            recipient: msg.recipient_wallet,
            timestamp: msg.created_at,
            encrypted: false
          }
        } as MessageNFTMetadata,
        imageUrl: msg.nft_image_url,
        metadataUrl: msg.nft_metadata_url,
        createdAt: msg.created_at,
        messageContent: msg.message_content,
        senderWallet: msg.sender_wallet,
        recipientWallet: msg.recipient_wallet
      }))
      
    } catch (error) {
      console.error('Error searching NFTs:', error)
      return []
    }
  }
}

/**
 * Helper functions (unchanged for cNFTs)
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
    theme: 'default',
    sentiment: 'neutral'
  }
}

export function generateNFTShareURL(assetId: string, baseUrl: string = 'https://app.stork-sms.net') {
  return `${baseUrl}/nft/${assetId}`
}

// Note: Marketplace URLs don't work for cNFTs as they're not tradeable on traditional NFT marketplaces
export function getMarketplaceURL(assetId: string) {
  console.warn('cNFTs are not tradeable on traditional NFT marketplaces')
  return `https://app.stork-sms.net/nft/${assetId}` // Link to your own viewer instead
}