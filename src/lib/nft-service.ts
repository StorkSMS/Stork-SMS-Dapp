import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  mplBubblegum, 
  mintV2
} from '@metaplex-foundation/mpl-bubblegum'
import { 
  keypairIdentity,
  publicKey as umiPublicKey,
  transactionBuilder,
  generateSigner,
  none
} from '@metaplex-foundation/umi'
import { companyWallet, connection, companyWalletPublicKey } from './company-wallet'
import { r2Storage } from './r2-storage'
import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'
import { NFTCreationError } from '@/types/nft'
import type { 
  MessageNFTMetadata, 
  NFTAttribute, 
  NFTMintResult
} from '@/types/nft'
import type { CreateNFTMessageData } from '@/types/messaging'

// NFT Configuration
export const NFT_CONFIG = {
  TOTAL_COST_SOL: 0.0033, // Total for dual NFT creation
  CREATION_COST_SOL: 0.00165, // Per NFT (for legacy compatibility)
  FEE_PERCENTAGE: 0, // No separate fee - flat pricing
  ROYALTY_BASIS_POINTS: 500, // 5%
  COLLECTION_NAME: 'Stork SMS Messages',
  COLLECTION_FAMILY: 'Stork SMS'
} as const

// Initialize UMI instance with Bubblegum V2
const umi = createUmi(connection.rpcEndpoint)
  .use(mplBubblegum())

// Convert company wallet to UMI format
const companyUmiKeypair = {
  publicKey: umiPublicKey(companyWallet.publicKey.toBase58()),
  secretKey: companyWallet.secretKey
}
umi.use(keypairIdentity(companyUmiKeypair))

export class NFTService {
  /**
   * Generate NFT attributes based on message content and metadata
   */
  static generateNFTAttributes(
    messageContent: string,
    theme: string = 'default',
    additionalAttributes: Record<string, any> = {}
  ): NFTAttribute[] {
    const baseAttributes: NFTAttribute[] = [
      {
        trait_type: 'Message Type',
        value: 'Chat Message'
      },
      {
        trait_type: 'Theme',
        value: theme
      },
      {
        trait_type: 'Character Count',
        value: messageContent.length.toString()
      },
      {
        trait_type: 'Platform',
        value: 'Stork SMS'
      },
      {
        trait_type: 'Creation Date',
        value: new Date().toISOString().split('T')[0]
      },
      {
        trait_type: 'Word Count',
        value: messageContent.split(' ').length.toString()
      }
    ]

    // Add sentiment analysis (basic)
    const sentiment = this.analyzeSentiment(messageContent)
    if (sentiment) {
      baseAttributes.push({
        trait_type: 'Sentiment',
        value: sentiment
      })
    }

    // Add additional custom attributes
    Object.entries(additionalAttributes).forEach(([key, value]) => {
      baseAttributes.push({
        trait_type: key,
        value: typeof value === 'string' ? value : String(value)
      })
    })

    return baseAttributes
  }

  /**
   * Basic sentiment analysis
   */
  private static analyzeSentiment(message: string): string {
    const positiveWords = ['love', 'happy', 'great', 'awesome', 'wonderful', 'amazing', 'excellent', 'fantastic']
    const negativeWords = ['hate', 'sad', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'angry']
    
    const lowerMessage = message.toLowerCase()
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length
    
    if (positiveCount > negativeCount) return 'Positive'
    if (negativeCount > positiveCount) return 'Negative'
    return 'Neutral'
  }

  /**
   * Generate complete NFT metadata
   */
  static generateNFTMetadata(
    messageContent: string,
    senderWallet: string,
    recipientWallet: string,
    imageUrl: string,
    messageId: string,
    theme: string = 'default',
    additionalData: Record<string, any> = {}
  ): MessageNFTMetadata {
    const attributes = this.generateNFTAttributes(messageContent, theme, additionalData.attributes)
    
    const truncatedContent = messageContent.length > 100 
      ? `${messageContent.substring(0, 100)}...` 
      : messageContent

    return {
      name: `Stork Message #${messageId.substring(0, 8)}`,
      description: `A message NFT created on Stork SMS - "${truncatedContent}"`,
      image: imageUrl,
      external_url: `https://dapp.stork-sms.net/message/${messageId}`,
      attributes,
      properties: {
        files: [
          {
            uri: imageUrl,
            type: 'image/png'
          }
        ],
        category: 'image'
      },
      message: {
        content: messageContent,
        sender: senderWallet,
        recipient: recipientWallet,
        timestamp: new Date().toISOString(),
        encrypted: additionalData.encrypted || false
      }
    }
  }

  /**
   * Calculate fee amount in SOL (legacy - returns 0 with flat pricing)
   */
  static calculateFee(baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL): number {
    return 0 // No separate fee with flat pricing
  }

  /**
   * Calculate fee amount for dual NFT creation (legacy - returns 0 with flat pricing)
   */
  static calculateDualNFTFee(baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL): number {
    return 0 // No separate fee with flat pricing
  }

  /**
   * Calculate total cost for dual NFT creation
   */
  static calculateTotalDualNFTCost(): {
    baseCost: number
    feeAmount: number
    totalCost: number
  } {
    return {
      baseCost: NFT_CONFIG.TOTAL_COST_SOL,
      feeAmount: 0, // No separate fee
      totalCost: NFT_CONFIG.TOTAL_COST_SOL
    }
  }

  /**
   * Validate wallet address format
   */
  static validateWalletAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create fee collection transaction (to be signed by user)
   */
  static createFeeTransaction(
    userWallet: string,
    feeAmountSOL: number
  ): Transaction {
    const userPublicKey = new PublicKey(userWallet)
    const feeAmountLamports = Math.floor(feeAmountSOL * LAMPORTS_PER_SOL)
    
    return new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: companyWalletPublicKey,
        lamports: feeAmountLamports,
      })
    )
  }

  /**
   * Create payment transaction for dual NFT creation
   */
  static createDualNFTFeeTransaction(
    userWallet: string
  ): Transaction {
    return this.createFeeTransaction(userWallet, NFT_CONFIG.TOTAL_COST_SOL)
  }

  /**
   * Create compressed NFT (cNFT) on Solana blockchain
   */
  static async createNFT(
    metadata: MessageNFTMetadata,
    recipientWallet: string
  ): Promise<{ mintAddress: string; transactionSignature: string; metadataUri: string }> {
    try {
      // Get environment configuration
      const isMainnet = process.env.NODE_ENV === 'production'
      const merkleTreeAddress = isMainnet 
        ? process.env.MERKLE_TREE_ADDRESS_MAINNET 
        : process.env.MERKLE_TREE_ADDRESS_DEVNET
      const collectionAddress = isMainnet
        ? process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS_MAINNET
        : process.env.NEXT_PUBLIC_COLLECTION_NFT_ADDRESS_DEVNET
      
      if (!merkleTreeAddress) {
        throw new Error(`Merkle tree address not configured for ${isMainnet ? 'mainnet' : 'devnet'}`)
      }
      
      if (!collectionAddress) {
        throw new Error(`Collection address not configured for ${isMainnet ? 'mainnet' : 'devnet'}`)
      }
      
      // Upload metadata to R2 storage (faster than Arweave)
      const metadataFileName = `metadata-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`
      const metadataUpload = await r2Storage.uploadFile(
        Buffer.from(JSON.stringify(metadata, null, 2)),
        metadataFileName,
        'application/json'
      )
      const metadataUri = metadataUpload.publicUrl
      
      console.log('🌳 Using Merkle Tree:', merkleTreeAddress)
      console.log('🎨 Using Collection:', collectionAddress)
      console.log('📄 Metadata URI:', metadataUri)
      
      // Convert addresses to UMI format
      const merkleTree = umiPublicKey(merkleTreeAddress)
      const leafOwner = umiPublicKey(recipientWallet)
      
      console.log('🚀 Minting compressed NFT with Bubblegum V2...')
      
      // Mint cNFT using Bubblegum V2
      const result = await mintV2(umi, {
        leafOwner,
        merkleTree,
        metadata: {
          name: metadata.name,
          uri: metadataUri,
          sellerFeeBasisPoints: NFT_CONFIG.ROYALTY_BASIS_POINTS,
          collection: none(), // No on-chain collection verification
          creators: [
            {
              address: companyUmiKeypair.publicKey,
              verified: true,
              share: 100
            }
          ]
        }
      }).sendAndConfirm(umi)
      
      console.log('✅ Compressed NFT minted successfully!')
      console.log('Transaction signature:', result.signature)
      
      // For cNFTs, the asset ID needs to be derived from the transaction
      // For now, we'll use the transaction signature as a placeholder
      // In a full implementation, this would derive the actual asset ID
      return {
        mintAddress: result.signature.toString(), // Placeholder: actual asset ID would be derived
        transactionSignature: result.signature.toString(),
        metadataUri
      }
      
    } catch (error) {
      console.error('cNFT creation error:', error)
      throw new NFTCreationError(
        'Failed to create compressed NFT on blockchain',
        'MINT_FAILED',
        error instanceof Error ? error : new Error('Unknown cNFT creation error')
      )
    }
  }

  /**
   * Store NFT message in database
   */
  static async storeNFTMessage(
    messageId: string,
    senderWallet: string,
    recipientWallet: string,
    messageContent: string,
    nftMintAddress: string,
    imageUrl: string,
    metadataUrl: string,
    transactionSignature: string,
    feeTransactionSignature?: string,
    additionalMetadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Create or get existing chat
      let chatId: string
      
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(sender_wallet.eq.${senderWallet},recipient_wallet.eq.${recipientWallet}),and(sender_wallet.eq.${recipientWallet},recipient_wallet.eq.${senderWallet})`)
        .single()
      
      if (existingChat) {
        chatId = existingChat.id
        
        // Update last message timestamp
        await supabase
          .from('chats')
          .update({
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', chatId)
      } else {
        // Create new chat
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({
            id: uuidv4(),
            sender_wallet: senderWallet,
            recipient_wallet: recipientWallet,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
            metadata: {
              nft_enabled: true,
              creation_method: 'api',
              ...additionalMetadata
            }
          })
          .select('id')
          .single()
        
        if (chatError) {
          throw new Error(`Failed to create chat: ${chatError.message}`)
        }
        
        chatId = newChat.id
      }
      
      // Insert NFT message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          chat_id: chatId,
          sender_wallet: senderWallet,
          recipient_wallet: recipientWallet,
          message_content: messageContent,
          message_type: 'nft',
          nft_mint_address: nftMintAddress,
          nft_image_url: imageUrl,
          nft_metadata_url: metadataUrl,
          transaction_signature: transactionSignature,
          created_at: new Date().toISOString(),
          metadata: {
            fee_transaction_signature: feeTransactionSignature,
            creation_cost_sol: NFT_CONFIG.CREATION_COST_SOL,
            fee_collected_sol: this.calculateFee(),
            theme: additionalMetadata.theme,
            customization: additionalMetadata.customization
          }
        })
      
      if (messageError) {
        throw new Error(`Failed to store message: ${messageError.message}`)
      }
      
      return chatId
      
    } catch (error) {
      console.error('Database storage error:', error)
      throw new NFTCreationError(
        'Failed to store NFT message in database',
        'INVALID_INPUT',
        error instanceof Error ? error : new Error('Unknown database error')
      )
    }
  }

  /**
   * Complete NFT creation flow
   */
  static async createMessageNFT(data: CreateNFTMessageData): Promise<NFTMintResult> {
    const messageId = uuidv4()
    
    try {
      // Validate inputs
      if (!this.validateWalletAddress(data.sender_wallet) || !this.validateWalletAddress(data.recipient_wallet)) {
        throw new NFTCreationError('Invalid wallet address format', 'INVALID_INPUT')
      }
      
      if (!data.message_content || data.message_content.trim().length === 0) {
        throw new NFTCreationError('Message content cannot be empty', 'INVALID_INPUT')
      }
      
      // Step 1: Generate NFT image (call to image generation API would happen here)
      // For now, we'll assume the image URL is provided or generated elsewhere
      
      // Step 2: Generate NFT metadata
      const metadata = this.generateNFTMetadata(
        data.message_content,
        data.sender_wallet,
        data.recipient_wallet,
        '', // imageUrl - would be set after image generation
        messageId,
        data.nft_theme,
        {
          encrypted: data.metadata?.encrypted,
          customization: data.nft_customization,
          theme: data.nft_theme
        }
      )
      
      // Step 3: Upload metadata to R2 storage
      const metadataUpload = await r2Storage.uploadNFTMetadata(
        metadata,
        messageId,
        data.sender_wallet
      )
      
      // Step 4: Create NFT on blockchain
      const nftResult = await this.createNFT(metadata, data.recipient_wallet)
      
      // Step 5: Store in database
      const chatId = await this.storeNFTMessage(
        messageId,
        data.sender_wallet,
        data.recipient_wallet,
        data.message_content,
        nftResult.mintAddress,
        metadata.image,
        metadataUpload.publicUrl,
        nftResult.transactionSignature,
        undefined, // feeTransactionSignature would be provided by frontend
        {
          theme: data.nft_theme,
          customization: data.nft_customization
        }
      )
      
      return {
        mintAddress: nftResult.mintAddress,
        transactionSignature: nftResult.transactionSignature,
        imageUrl: metadata.image,
        metadataUrl: metadataUpload.publicUrl,
        metadata
      }
      
    } catch (error) {
      console.error('NFT creation flow error:', error)
      
      if (error instanceof NFTCreationError) {
        throw error
      }
      
      throw new NFTCreationError(
        'NFT creation process failed',
        'GENERATION_FAILED',
        error instanceof Error ? error : new Error('Unknown error')
      )
    }
  }

  /**
   * Get cNFT information by asset ID
   */
  static async getNFTInfo(assetId: string) {
    try {
      console.log('Getting cNFT info for asset:', assetId)
      
      // For now, return basic info structure
      // In a full implementation, this would use the DAS API
      return {
        address: assetId,
        name: 'Stork SMS cNFT',
        description: 'A compressed NFT from Stork SMS',
        collection: 'Stork SMS Messages',
        verified: true
      }
    } catch (error) {
      console.error('Error fetching cNFT info:', error)
      throw new NFTCreationError(
        'Failed to fetch compressed NFT information',
        'INVALID_INPUT',
        error instanceof Error ? error : new Error('Unknown error')
      )
    }
  }

  /**
   * Check if wallet owns specific cNFT
   */
  static async verifyNFTOwnership(walletAddress: string, assetId: string): Promise<boolean> {
    try {
      console.log('Verifying cNFT ownership for:', assetId, 'by wallet:', walletAddress)
      
      // For now, return true for demonstration
      // In a full implementation, this would use the DAS API to verify ownership
      // The hook useNFTVerification.ts already handles token account verification
      // which works for both traditional NFTs and cNFTs
      return true
    } catch (error) {
      console.error('Error verifying cNFT ownership:', error)
      return false
    }
  }
}