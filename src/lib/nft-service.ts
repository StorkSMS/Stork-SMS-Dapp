import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js'
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
  CREATION_COST_SOL: 0.01,
  FEE_PERCENTAGE: 0.1,
  ROYALTY_BASIS_POINTS: 500, // 5%
  COLLECTION_NAME: 'Stork Messages',
  COLLECTION_FAMILY: 'Stork SMS'
} as const

// Initialize Metaplex instance
const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(companyWallet))

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
      external_url: `https://stork-sms.app/message/${messageId}`,
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
   * Calculate fee amount in SOL
   */
  static calculateFee(baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL): number {
    return baseAmountSOL * NFT_CONFIG.FEE_PERCENTAGE
  }

  /**
   * Calculate fee amount for dual NFT creation (sender + recipient)
   */
  static calculateDualNFTFee(baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL): number {
    const dualNFTCost = baseAmountSOL * 2 // Cost for both NFTs
    return dualNFTCost * NFT_CONFIG.FEE_PERCENTAGE
  }

  /**
   * Calculate total cost including fees for dual NFT creation
   */
  static calculateTotalDualNFTCost(baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL): {
    baseCost: number
    feeAmount: number
    totalCost: number
  } {
    const baseCost = baseAmountSOL * 2 // Two NFTs
    const feeAmount = this.calculateDualNFTFee(baseAmountSOL)
    const totalCost = baseCost + feeAmount
    
    return {
      baseCost,
      feeAmount,
      totalCost
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
   * Create fee collection transaction for dual NFT creation
   */
  static createDualNFTFeeTransaction(
    userWallet: string,
    baseAmountSOL: number = NFT_CONFIG.CREATION_COST_SOL
  ): Transaction {
    const feeAmount = this.calculateDualNFTFee(baseAmountSOL)
    return this.createFeeTransaction(userWallet, feeAmount)
  }

  /**
   * Create NFT on Solana blockchain
   */
  static async createNFT(
    metadata: MessageNFTMetadata,
    recipientWallet: string
  ): Promise<{ mintAddress: string; transactionSignature: string; metadataUri: string }> {
    try {
      // Convert metadata to Metaplex format
      const metaplexMetadata = {
        ...metadata,
        attributes: metadata.attributes.map(attr => ({
          trait_type: attr.trait_type,
          value: typeof attr.value === 'string' ? attr.value : String(attr.value)
        }))
      }
      
      // Upload metadata to Metaplex/Arweave
      const { uri: metadataUri } = await metaplex.nfts().uploadMetadata(metaplexMetadata)
      
      // Create NFT
      const { nft, response } = await metaplex.nfts().create({
        uri: metadataUri,
        name: metadata.name,
        sellerFeeBasisPoints: NFT_CONFIG.ROYALTY_BASIS_POINTS,
        creators: [
          {
            address: companyWalletPublicKey,
            share: 100
          }
        ],
      })
      
      // Transfer NFT to recipient if different from company wallet
      if (recipientWallet !== companyWallet.publicKey.toBase58()) {
        const recipientPublicKey = new PublicKey(recipientWallet)
        
        await metaplex.nfts().transfer({
          nftOrSft: nft,
          toOwner: recipientPublicKey,
          fromOwner: companyWalletPublicKey
        })
      }
      
      return {
        mintAddress: nft.address.toBase58(),
        transactionSignature: response.signature,
        metadataUri
      }
      
    } catch (error) {
      console.error('NFT creation error:', error)
      throw new NFTCreationError(
        'Failed to create NFT on blockchain',
        'MINT_FAILED',
        error instanceof Error ? error : new Error('Unknown NFT creation error')
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
   * Get NFT information by mint address
   */
  static async getNFTInfo(mintAddress: string) {
    try {
      const mintPublicKey = new PublicKey(mintAddress)
      const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey })
      return nft
    } catch (error) {
      console.error('Error fetching NFT info:', error)
      throw new NFTCreationError(
        'Failed to fetch NFT information',
        'INVALID_INPUT',
        error instanceof Error ? error : new Error('Unknown error')
      )
    }
  }

  /**
   * Check if wallet owns specific NFT
   */
  static async verifyNFTOwnership(walletAddress: string, mintAddress: string): Promise<boolean> {
    try {
      const walletPublicKey = new PublicKey(walletAddress)
      const mintPublicKey = new PublicKey(mintAddress)
      
      const nft = await metaplex.nfts().findByMint({ mintAddress: mintPublicKey })
      
      // Check if it's an NFT with owner information
      // Use type assertion to handle Metaplex type variations
      const nftAny = nft as any
      
      if (nftAny.ownerAddress && typeof nftAny.ownerAddress.equals === 'function') {
        return nftAny.ownerAddress.equals(walletPublicKey)
      } else if (nftAny.token && nftAny.token.ownerAddress && typeof nftAny.token.ownerAddress.equals === 'function') {
        // For SftWithToken or NftWithToken, check the token owner
        return nftAny.token.ownerAddress.equals(walletPublicKey)
      }
      return false
    } catch (error) {
      console.error('Error verifying NFT ownership:', error)
      return false
    }
  }
}