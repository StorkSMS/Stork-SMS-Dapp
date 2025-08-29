import { NextRequest, NextResponse } from 'next/server'
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { 
  mplBubblegum, 
  mintV2,
  getAssetWithProof
} from '@metaplex-foundation/mpl-bubblegum'
import { 
  keypairIdentity,
  publicKey as umiPublicKey,
  generateSigner,
  none,
  some
} from '@metaplex-foundation/umi'
import { r2Storage } from '@/lib/r2-storage'
import { companyWallet, connection, companyWalletPublicKey } from '@/lib/company-wallet'
import { supabaseServer } from '@/lib/supabase-server'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase'
import { TokenService } from '@/lib/token-service'
import { v4 as uuidv4 } from 'uuid'
import type { MessageNFTMetadata, NFTAttribute } from '@/types/nft'

// NFT creation pricing
const TOTAL_COST_SOL = 0.001 // Total cost for dual NFT creation
const STORK_DISCOUNT = 0.2 // 20% discount for STORK payments
const NFT_CREATION_COST_SOL = 0.00165 // Per NFT (for legacy compatibility)
const FEE_PERCENTAGE = 0 // No separate fee - flat pricing

// Environment flags for NFT generation modes
// Read from environment variables with fallback defaults
const USE_PRODUCTION_NFT_FOR_RECIPIENT = process.env.USE_PRODUCTION_NFT_FOR_RECIPIENT === 'true' || true // Default to true if not set
const USE_PRODUCTION_NFT_FOR_SENDER = process.env.USE_PRODUCTION_NFT_FOR_SENDER === 'true' // Read from environment

interface CreateChatNFTRequest {
  messageContent: string
  senderWallet: string
  recipientWallet: string
  senderImageUrl: string
  recipientImageUrl: string
  messageId: string
  feeTransactionSignature?: string
  paymentMethod?: 'SOL' | 'STORK'
  theme?: string
  selectedSticker?: string
  customization?: {
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
  }
}

interface NFTCreationResult {
  success: boolean
  senderNftMintAddress?: string
  recipientNftMintAddress?: string
  senderTransactionSignature?: string
  recipientTransactionSignature?: string
  senderImageUrl?: string
  recipientImageUrl?: string
  senderMetadataUrl?: string
  recipientMetadataUrl?: string
  feeTransactionSignature?: string
  chatRecordId?: string
  error?: string
}

// Initialize UMI with Bubblegum V2 and Core
const umi = createUmi(connection.rpcEndpoint)
  .use(mplBubblegum())

// Convert company wallet to UMI format
const companyUmiKeypair = {
  publicKey: umiPublicKey(companyWallet.publicKey.toBase58()),
  secretKey: companyWallet.secretKey
}
umi.use(keypairIdentity(companyUmiKeypair))

// Collection constants
const STORK_COLLECTION_NAME = 'Stork SMS Messages'
const STORK_COLLECTION_SYMBOL = 'STORK'
const STORK_COLLECTION_DESCRIPTION = 'Verified message NFTs from Stork SMS - Secure, decentralized messaging on Solana'

function generateNFTMetadata(
  messageContent: string,
  senderWallet: string,
  recipientWallet: string,
  imageUrl: string,
  messageId: string,
  nftType: 'sender' | 'recipient',
  theme: string = 'default'
): MessageNFTMetadata {
  const isRecipientNFT = nftType === 'recipient'
  const recipientTruncated = recipientWallet.substring(0, 6) + '...' + recipientWallet.substring(recipientWallet.length - 4)
  
  console.log(`🏷️ Generating NFT metadata for ${nftType} NFT with collection:`, STORK_COLLECTION_NAME)
  
  const attributes: NFTAttribute[] = [
    {
      trait_type: 'NFT Type',
      value: nftType === 'sender' ? 'Chat Initiator' : 'Chat Message'
    },
    {
      trait_type: 'Role',
      value: nftType === 'sender' ? 'Sender' : 'Recipient'
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
    }
  ]

  const name = nftType === 'sender' 
    ? `Stork Chat Started #${messageId.substring(0, 8)}`
    : `Stork Message #${messageId.substring(0, 8)}`
    
  const description = nftType === 'sender'
    ? `Chat initiation NFT - You started a chat with ${recipientTruncated} on Stork SMS`
    : `A verified message NFT created on Stork SMS - "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`

  return {
    name,
    symbol: STORK_COLLECTION_SYMBOL,
    description,
    image: imageUrl,
    animation_url: imageUrl, // Some wallets prefer this field
    external_url: `https://dapp.stork-sms.net/message/${messageId}`,
    attributes,
    properties: {
      files: [
        {
          uri: imageUrl,
          type: 'image/png'
        }
      ],
      category: 'image',
      creators: [
        {
          address: companyWalletPublicKey.toBase58(),
          verified: true,
          share: 100
        }
      ]
    },
    collection: {
      name: STORK_COLLECTION_NAME,
      family: 'Stork SMS'
    },
    message: {
      content: messageContent,
      sender: senderWallet,
      recipient: recipientWallet,
      timestamp: new Date().toISOString(),
      encrypted: false
    }
  }
}

async function generateNFTImageWithProduction(
  messageContent: string,
  senderWallet: string,
  recipientWallet: string,
  selectedSticker?: string
): Promise<{ imageUrl: string; r2Key: string }> {
  try {
    console.log('Generating NFT image with production system...')
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-production-nft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messageContent,
        senderWallet,
        recipientWallet,
        sticker: selectedSticker
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate production NFT')
    }

    const result = await response.json()
    if (!result.success || !result.imageBuffer) {
      throw new Error(result.error || 'Production NFT generation failed')
    }

    // Upload the generated image to R2 storage
    const imageBuffer = Buffer.from(result.imageBuffer, 'base64')
    console.log('📦 Uploading to R2 - Buffer size:', imageBuffer.length, 'bytes')
    
    // Generate unique filename with timestamp and random string
    const uniqueId = `production-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    console.log('🏷️ R2 unique filename:', uniqueId)
    
    const uploadResult = await r2Storage.uploadNFTImage(
      imageBuffer,
      senderWallet,
      uniqueId,
      'image/png'
    )

    console.log('✅ Production NFT image uploaded to R2:', uploadResult.publicUrl)
    console.log('🔑 R2 key:', uploadResult.key)
    return {
      imageUrl: uploadResult.publicUrl,
      r2Key: uploadResult.key
    }
    
  } catch (error) {
    console.error('Production NFT generation error:', error)
    throw new Error(`Failed to generate production NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function generateProductionSenderNFTImage(
  messageContent: string,
  senderWallet: string,
  recipientWallet: string
): Promise<{ imageUrl: string; r2Key: string }> {
  try {
    console.log('🎯🎯🎯 PRODUCTION SENDER NFT FUNCTION CALLED! 🎯🎯🎯')
    console.log('✅ We are using the PRODUCTION system, not the simple system!')
    console.log('Generating production sender NFT image directly...')
    
    // Import the production sender NFT generation function from lib
    const { generateProductionSenderNFT } = await import('../../../lib/generate-production-sender-nft')
    
    // Create the request object
    const requestBody = {
      messageContent,
      senderWallet,
      recipientWallet
    }
    
    // Call the function directly instead of making HTTP request
    const imageBuffer = await generateProductionSenderNFT(requestBody)
    
    console.log('📦 Uploading sender NFT to R2 - Buffer size:', imageBuffer.length, 'bytes')
    
    // Generate unique filename with timestamp and random string
    const uniqueId = `production-sender-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    console.log('🏷️ R2 sender unique filename:', uniqueId)
    
    const uploadResult = await r2Storage.uploadNFTImage(
      imageBuffer,
      senderWallet,
      uniqueId,
      'image/png'
    )

    console.log('✅ Production sender NFT image uploaded to R2:', uploadResult.publicUrl)
    console.log('🔑 R2 key:', uploadResult.key)
    return {
      imageUrl: uploadResult.publicUrl,
      r2Key: uploadResult.key
    }
    
  } catch (error) {
    console.error('Production sender NFT generation error:', error)
    throw new Error(`Failed to generate production sender NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function generateNFTImageWithSimple(
  messageContent: string,
  senderWallet: string,
  recipientWallet: string,
  nftType: 'sender' | 'recipient',
  theme?: string,
  selectedSticker?: string
): Promise<{ imageUrl: string; r2Key: string }> {
  try {
    console.log(`Generating NFT image with simple system for ${nftType}...`)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-nft-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageContent,
        senderWallet,
        recipientWallet,
        nftType,
        theme,
        selectedSticker
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate simple NFT')
    }

    const result = await response.json()
    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || 'Simple NFT generation failed')
    }

    console.log('Simple NFT image generated:', result.imageUrl)
    return {
      imageUrl: result.imageUrl,
      r2Key: result.imageKey
    }
    
  } catch (error) {
    console.error('Simple NFT generation error:', error)
    throw new Error(`Failed to generate simple NFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function collectFee(
  userWallet: string,
  feeAmountSOL: number
): Promise<string> {
  try {
    // Create fee collection transaction
    const userPublicKey = new PublicKey(userWallet)
    const feeAmountLamports = Math.floor(feeAmountSOL * LAMPORTS_PER_SOL)
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userPublicKey,
        toPubkey: companyWalletPublicKey,
        lamports: feeAmountLamports,
      })
    )
    
    // Note: In a real implementation, this would need to be signed by the user's wallet
    // For now, we'll simulate this and assume the user has already authorized the fee
    console.log(`Fee collection transaction created: ${feeAmountSOL} SOL from ${userWallet}`)
    
    // Return a mock transaction signature for demonstration
    // In production, this would be handled by the frontend wallet integration
    return `fee_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
  } catch (error) {
    console.error('Fee collection error:', error)
    throw new Error(`Failed to collect fee: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function verifySTORKPayment(
  transactionSignature: string,
  expectedSenderWallet: string,
  expectedSOLAmount: number
): Promise<boolean> {
  try {
    console.log('🔍 Verifying STORK token payment...')
    console.log('Transaction signature:', transactionSignature)
    console.log('Expected sender:', expectedSenderWallet)
    console.log('Expected SOL amount equivalent:', expectedSOLAmount)

    // Get the transaction details
    const transactionResponse = await connection.getParsedTransaction(transactionSignature, {
      maxSupportedTransactionVersion: 0
    })

    if (!transactionResponse || !transactionResponse.transaction) {
      console.error('❌ Transaction not found or failed')
      return false
    }

    const transaction = transactionResponse.transaction
    const senderPublicKey = new PublicKey(expectedSenderWallet)
    const companyWalletPubkey = new PublicKey(companyWalletPublicKey)

    // Calculate expected STORK amount (already includes 20% discount)
    const { storkAmount } = await TokenService.calculateSTORKAmount(expectedSOLAmount)
    const expectedRawAmount = Math.floor(storkAmount * Math.pow(10, 6)) // PUMP_FUN_DECIMALS = 6

    console.log('Expected STORK amount:', storkAmount)
    console.log('Expected raw amount:', expectedRawAmount)

    // Verify the transaction contains the expected STORK token transfer
    let foundValidTransfer = false

    if (transaction.message && transaction.message.instructions) {
      for (const instruction of transaction.message.instructions) {
        // Check if this is a token transfer instruction
        if (instruction.programId.equals(new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'))) {
          const parsedInstruction = instruction as any
          
          if (parsedInstruction.parsed && parsedInstruction.parsed.type === 'transfer') {
            const transferInfo = parsedInstruction.parsed.info
            const transferAmount = transferInfo.amount
            const sourcePubkey = new PublicKey(transferInfo.source)
            
            // Get the associated token accounts
            const storkTokenMint = new PublicKey(process.env.NEXT_PUBLIC_STORK_TOKEN_MINT || '51Yc9NkkNKMbo31XePni6ZFKMFz4d6H273M8CRhCpump')
            const senderTokenAccount = await TokenService.getAssociatedTokenAccount(
              senderPublicKey, 
              storkTokenMint
            )
            const companyTokenAccount = await TokenService.getAssociatedTokenAccount(
              companyWalletPubkey, 
              storkTokenMint
            )

            // Verify this is the correct transfer
            if (sourcePubkey.equals(senderTokenAccount) && 
                transferInfo.destination === companyTokenAccount.toBase58() &&
                Math.abs(transferAmount - expectedRawAmount) < 1000) { // Allow for small rounding differences
              
              foundValidTransfer = true
              console.log('✅ Valid STORK token transfer found')
              console.log('Transfer amount:', transferAmount)
              console.log('Expected amount:', expectedRawAmount)
              break
            }
          }
        }
      }
    }

    if (!foundValidTransfer) {
      console.error('❌ No valid STORK token transfer found in transaction')
      return false
    }

    // Verify transaction is confirmed
    if (transactionResponse.meta?.err) {
      console.error('❌ Transaction failed with error:', transactionResponse.meta.err)
      return false
    }

    console.log('✅ STORK payment verification successful')
    return true

  } catch (error) {
    console.error('❌ STORK payment verification error:', error)
    return false
  }
}

async function createNFT(
  metadata: MessageNFTMetadata,
  ownerWallet: string,
  collectionType: 'sender' | 'recipient'
): Promise<{ mintAddress: string; transactionSignature: string }> {
  try {
    console.log('Starting cNFT creation process...')
    
    // Get environment configuration
    // Check for explicit SOLANA_NETWORK env var, otherwise check RPC URL
    const isMainnet = process.env.SOLANA_NETWORK === 'mainnet' || 
                     (process.env.SOLANA_RPC_URL && process.env.SOLANA_RPC_URL.includes('mainnet'))
    
    console.log('🔍 Network detection:', {
      NODE_ENV: process.env.NODE_ENV,
      SOLANA_NETWORK: process.env.SOLANA_NETWORK,
      RPC_URL: process.env.SOLANA_RPC_URL,
      isMainnet,
      selectedNetwork: isMainnet ? 'mainnet' : 'devnet'
    })
    
    const merkleTreeAddress = isMainnet 
      ? process.env.MERKLE_TREE_ADDRESS_MAINNET 
      : process.env.MERKLE_TREE_ADDRESS_DEVNET
    
    // Get the appropriate collection address based on type
    const collectionAddress = collectionType === 'sender'
      ? (isMainnet
          ? process.env.NEXT_PUBLIC_SENDER_COLLECTION_MAINNET
          : process.env.NEXT_PUBLIC_SENDER_COLLECTION_DEVNET)
      : (isMainnet
          ? process.env.NEXT_PUBLIC_RECIPIENT_COLLECTION_MAINNET
          : process.env.NEXT_PUBLIC_RECIPIENT_COLLECTION_DEVNET)
    
    if (!merkleTreeAddress) {
      throw new Error(`Merkle tree address not configured for ${isMainnet ? 'mainnet' : 'devnet'}`)
    }
    
    if (!collectionAddress) {
      throw new Error(`${collectionType} collection address not configured for ${isMainnet ? 'mainnet' : 'devnet'}`)
    }
    
    console.log('Using R2 storage for metadata (faster than Arweave)...')
    // Use R2 storage for metadata instead of slow Arweave uploads
    const metadataFileName = `metadata-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.json`
    const metadataUpload = await r2Storage.uploadFile(
      Buffer.from(JSON.stringify(metadata, null, 2)),
      metadataFileName,
      'application/json'
    )
    
    // Use the public R2 URL directly for metadata access
    const metadataUri = metadataUpload.publicUrl
    console.log('Metadata uploaded to public R2:', metadataUri)
    
    console.log('🌳 Using Merkle Tree:', merkleTreeAddress)
    console.log(`🎨 Using ${collectionType} Collection:`, collectionAddress)
    
    // Convert addresses to UMI format
    const merkleTree = umiPublicKey(merkleTreeAddress)
    const leafOwner = umiPublicKey(ownerWallet)
    const collection = umiPublicKey(collectionAddress)
    
    // Generate asset ID (this will be the "mint address" equivalent for cNFTs)
    const assetId = generateSigner(umi)
    
    console.log(`🚀 Minting compressed NFT with collection verification (${collectionType})...`)
    
    // Mint cNFT using Bubblegum V2 with collection verification
    const result = await mintV2(umi, {
      leafOwner,
      merkleTree,
      coreCollection: collection,
      metadata: {
        name: metadata.name,
        uri: metadataUri,
        sellerFeeBasisPoints: 500, // 5% royalty
        collection: some(collection),
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
    
    // For cNFTs, we return the asset ID as the "mint address"
    return {
      mintAddress: assetId.publicKey.toString(), // This will be the asset ID for cNFTs
      transactionSignature: result.signature.toString()
    }
    
  } catch (error) {
    console.error('cNFT creation error:', error)
    throw new Error(`Failed to create cNFT: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function createBatchNFTs(
  senderMetadata: MessageNFTMetadata,
  recipientMetadata: MessageNFTMetadata,
  senderWallet: string,
  recipientWallet: string
): Promise<{
  senderResult: { mintAddress: string; transactionSignature: string }
  recipientResult: { mintAddress: string; transactionSignature: string }
}> {
  try {
    console.log('Starting batch NFT creation process...')
    
    // Create both NFTs in parallel to optimize performance with collection verification
    const [senderResult, recipientResult] = await Promise.all([
      createNFT(senderMetadata, senderWallet, 'sender'),
      createNFT(recipientMetadata, recipientWallet, 'recipient')
    ])
    
    console.log('Batch NFT creation completed successfully')
    console.log('Sender NFT:', senderResult.mintAddress)
    console.log('Recipient NFT:', recipientResult.mintAddress)
    
    return {
      senderResult,
      recipientResult
    }
    
  } catch (error) {
    console.error('Batch NFT creation error:', error)
    throw new Error(`Failed to create batch NFTs: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function storeChatRecord(
  messageId: string,
  senderWallet: string,
  recipientWallet: string,
  messageContent: string,
  senderNftMintAddress: string,
  recipientNftMintAddress: string,
  senderImageUrl: string,
  recipientImageUrl: string,
  senderMetadataUrl: string,
  recipientMetadataUrl: string,
  senderTransactionSignature: string,
  recipientTransactionSignature: string,
  feeTransactionSignature: string,
  authenticatedSupabase: any,
  paymentMethod: 'SOL' | 'STORK' = 'SOL'
): Promise<string> {
  try {
    console.log('📝 Attempting to insert chat record...')
    const chatInsertData = {
      id: uuidv4(),
      sender_nft_mint: senderNftMintAddress,
      recipient_nft_mint: recipientNftMintAddress,
      sender_wallet: senderWallet,
      recipient_wallet: recipientWallet,
      chat_title: `Chat: ${messageContent.substring(0, 50)}...`,
      fee_amount: paymentMethod === 'SOL' ? Math.floor(TOTAL_COST_SOL * LAMPORTS_PER_SOL) : 0, // Store SOL equivalent or 0 for STORK
      payment_method: paymentMethod,
      fee_transaction_signature: feeTransactionSignature,
      fee_paid: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('Chat insert data:', JSON.stringify(chatInsertData, null, 2))
    
    // Insert chat record using authenticated client
    const { data: chatData, error: chatError } = await authenticatedSupabase
      .from('chats')
      .insert(chatInsertData)
      .select()
      .single()
    
    if (chatError) {
      console.error('❌ Chat insertion failed:', chatError)
      throw new Error(`Failed to create chat record: ${chatError.message}`)
    }
    
    console.log('✅ Chat record created successfully:', chatData.id)
    
    // Insert message record using authenticated client
    const { data: messageData, error: messageError } = await authenticatedSupabase
      .from('messages')
      .insert({
        chat_id: chatData.id,
        sender_wallet: senderWallet,
        encrypted_content: messageContent, // Store as plain text for NFT messages
        encryption_method: 'none',
        message_type: 'nft',
        nft_mint_address: recipientNftMintAddress,
        nft_image_url: recipientImageUrl,
        nft_metadata_url: recipientMetadataUrl,
        transaction_signature: recipientTransactionSignature,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (messageError) {
      throw new Error(`Failed to create message record: ${messageError.message}`)
    }
    
    return chatData.id
    
  } catch (error) {
    console.error('Database storage error:', error)
    throw new Error(`Failed to store chat record: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function createChatNFTHandler(request: NextRequest) {
  console.log('🟢🟢🟢 MAIN CREATE-CHAT-NFT ROUTE CALLED 🟢🟢🟢')
  
  try {
    // Get request body
    const requestBody = await request.json() as CreateChatNFTRequest
    console.log('Request body:', JSON.stringify(requestBody, null, 2))

    // Get wallet address and auth token from headers
    const walletAddress = request.headers.get('X-Wallet-Address')
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!walletAddress || !authToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing authentication headers' 
        },
        { status: 401 }
      )
    }

    // Create authenticated Supabase client
    const authenticatedSupabase = createAuthenticatedSupabaseClient(walletAddress, authToken)
    
    console.log('🔐 Using authenticated Supabase client with wallet headers')
    
    // Validate required fields - allow image URLs to be generated dynamically
    if (!requestBody.messageContent || !requestBody.senderWallet || !requestBody.recipientWallet || !requestBody.messageId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: messageContent, senderWallet, recipientWallet, messageId' 
        },
        { status: 400 }
      )
    }

    // Log sticker selection for debugging
    if (requestBody.selectedSticker) {
      console.log(`Sticker selected for NFT creation: ${requestBody.selectedSticker}`)
    }
    
    // Validate wallet addresses
    try {
      new PublicKey(requestBody.senderWallet)
      new PublicKey(requestBody.recipientWallet)
    } catch {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid wallet address format' 
        },
        { status: 400 }
      )
    }
    
    const result: NFTCreationResult = { success: false }
    
    try {
      // Step 1: Use provided fee transaction signature or collect fee
      let feeTransactionSignature: string
      
      if (requestBody.feeTransactionSignature) {
        // Fee already collected on frontend
        console.log(`Using provided fee transaction signature: ${requestBody.feeTransactionSignature}`)
        feeTransactionSignature = requestBody.feeTransactionSignature
      } else {
        // Fallback: collect payment on backend (legacy method)
        console.log(`Collecting payment: ${TOTAL_COST_SOL} SOL from ${requestBody.senderWallet}`)
        feeTransactionSignature = await collectFee(requestBody.senderWallet, TOTAL_COST_SOL)
      }
      
      result.feeTransactionSignature = feeTransactionSignature

      // Verify payment based on method
      if (requestBody.paymentMethod === 'STORK' && requestBody.feeTransactionSignature) {
        console.log('🔍 Verifying STORK token payment...')
        const isValidSTORKPayment = await verifySTORKPayment(
          requestBody.feeTransactionSignature,
          requestBody.senderWallet,
          TOTAL_COST_SOL
        )
        
        if (!isValidSTORKPayment) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid STORK token payment. Please ensure you have paid the correct amount.' 
            },
            { status: 400 }
          )
        }
        
        console.log('✅ STORK token payment verified successfully')
      } else if (requestBody.paymentMethod === 'SOL' || !requestBody.paymentMethod) {
        // SOL payment verification (existing logic)
        console.log('💰 SOL payment accepted (signature-based verification)')
      }
      
      // Step 2: Generate NFT images using appropriate system
      let senderImageUrl = requestBody.senderImageUrl
      let recipientImageUrl = requestBody.recipientImageUrl
      
      // Generate sender NFT image if not provided
      if (!senderImageUrl) {
        console.log('🚨🚨🚨 SENDER NFT GENERATION DEBUG 🚨🚨🚨')
        console.log('USE_PRODUCTION_NFT_FOR_SENDER value:', USE_PRODUCTION_NFT_FOR_SENDER)
        console.log('Will use:', USE_PRODUCTION_NFT_FOR_SENDER ? 'PRODUCTION SENDER SYSTEM ✅' : 'SIMPLE SYSTEM ❌')
        console.log('Environment variable type:', typeof process.env.USE_PRODUCTION_NFT_FOR_SENDER)
        console.log('Environment variable raw value:', process.env.USE_PRODUCTION_NFT_FOR_SENDER)
        console.log('🚨🚨🚨 END DEBUG 🚨🚨🚨')
        
        const senderImageData = USE_PRODUCTION_NFT_FOR_SENDER
          ? await generateProductionSenderNFTImage(
              requestBody.messageContent,
              requestBody.senderWallet,
              requestBody.recipientWallet
            )
          : await generateNFTImageWithSimple(
              requestBody.messageContent,
              requestBody.senderWallet,
              requestBody.recipientWallet,
              'sender',
              requestBody.theme,
              requestBody.selectedSticker
            )
        senderImageUrl = senderImageData.imageUrl
        console.log('Sender NFT image generated and uploaded:', senderImageUrl)
      }
      
      // Generate recipient NFT image if not provided
      if (!recipientImageUrl) {
        console.log('🚨🚨🚨 RECIPIENT NFT GENERATION DEBUG 🚨🚨🚨')
        console.log('USE_PRODUCTION_NFT_FOR_RECIPIENT value:', USE_PRODUCTION_NFT_FOR_RECIPIENT)
        console.log('Will use:', USE_PRODUCTION_NFT_FOR_RECIPIENT ? 'PRODUCTION SYSTEM ✅' : 'SIMPLE SYSTEM ❌')
        console.log('🚨🚨🚨 END DEBUG 🚨🚨🚨')
        
        const recipientImageData = USE_PRODUCTION_NFT_FOR_RECIPIENT
          ? await generateNFTImageWithProduction(
              requestBody.messageContent,
              requestBody.senderWallet,
              requestBody.recipientWallet,
              requestBody.selectedSticker
            )
          : await generateNFTImageWithSimple(
              requestBody.messageContent,
              requestBody.senderWallet,
              requestBody.recipientWallet,
              'recipient',
              requestBody.theme,
              requestBody.selectedSticker
            )
        recipientImageUrl = recipientImageData.imageUrl
        console.log('Recipient NFT image generated and uploaded:', recipientImageUrl)
      }

      // Step 3: Generate NFT metadata for both sender and recipient
      const senderMetadata = generateNFTMetadata(
        requestBody.messageContent,
        requestBody.senderWallet,
        requestBody.recipientWallet,
        senderImageUrl,
        requestBody.messageId,
        'sender',
        requestBody.theme
      )
      
      const recipientMetadata = generateNFTMetadata(
        requestBody.messageContent,
        requestBody.senderWallet,
        requestBody.recipientWallet,
        recipientImageUrl,
        requestBody.messageId,
        'recipient',
        requestBody.theme
      )
      
      // Step 4: Upload metadata to R2 storage for backup
      const [senderMetadataUpload, recipientMetadataUpload] = await Promise.all([
        r2Storage.uploadNFTMetadata(
          senderMetadata,
          `${requestBody.messageId}-sender`,
          requestBody.senderWallet
        ),
        r2Storage.uploadNFTMetadata(
          recipientMetadata,
          `${requestBody.messageId}-recipient`,
          requestBody.senderWallet
        )
      ])
      
      result.senderMetadataUrl = senderMetadataUpload.publicUrl
      result.recipientMetadataUrl = recipientMetadataUpload.publicUrl
      
      // Step 5: Create both NFTs on Solana using batch process
      const batchResult = await createBatchNFTs(
        senderMetadata,
        recipientMetadata,
        requestBody.senderWallet,
        requestBody.recipientWallet
      )
      
      result.senderNftMintAddress = batchResult.senderResult.mintAddress
      result.recipientNftMintAddress = batchResult.recipientResult.mintAddress
      result.senderTransactionSignature = batchResult.senderResult.transactionSignature
      result.recipientTransactionSignature = batchResult.recipientResult.transactionSignature
      result.senderImageUrl = senderImageUrl
      result.recipientImageUrl = recipientImageUrl
      
      // Step 6: Store chat record in database
      const chatRecordId = await storeChatRecord(
        requestBody.messageId,
        requestBody.senderWallet,
        requestBody.recipientWallet,
        requestBody.messageContent,
        batchResult.senderResult.mintAddress,
        batchResult.recipientResult.mintAddress,
        senderImageUrl,
        recipientImageUrl,
        senderMetadataUpload.publicUrl,
        recipientMetadataUpload.publicUrl,
        batchResult.senderResult.transactionSignature,
        batchResult.recipientResult.transactionSignature,
        feeTransactionSignature,
        authenticatedSupabase,
        requestBody.paymentMethod || 'SOL'
      )
      result.chatRecordId = chatRecordId
      
      result.success = true
      
      return NextResponse.json(result)
      
    } catch (error) {
      console.error('NFT creation process error:', error)
      result.error = error instanceof Error ? error.message : 'Unknown error occurred'
      
      return NextResponse.json(result, { status: 500 })
    }
    
  } catch (error) {
    console.error('Request processing error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Chat NFT Creation API - Batch Minting',
    endpoint: '/api/create-chat-nft',
    method: 'POST',
    requiredFields: ['messageContent', 'senderWallet', 'recipientWallet', 'messageId'],
    optionalFields: ['senderImageUrl', 'recipientImageUrl', 'theme', 'selectedSticker', 'customization', 'feeTransactionSignature'],
    totalCost: `${TOTAL_COST_SOL} SOL (for both sender and recipient NFTs)`,
    pricing: 'Flat rate - no separate fees',
    companyWallet: companyWalletPublicKey.toBase58(),
    network: 'Solana Devnet',
    process: [
      '1. Collect payment from sender (0.001 SOL)',
      '2. Generate NFT images using production systems (both sender and recipient)',
      '3. Generate NFT metadata for both sender and recipient NFTs',
      '4. Upload metadata to storage in parallel',
      '5. Create both NFTs on Solana blockchain in parallel (batch process)',
      '6. Transfer NFTs to respective owners',
      '7. Store chat record with both NFT mint addresses in database'
    ],
    features: [
      'Batch NFT creation for cost efficiency',
      'Dual NFT system (sender initiator + recipient message)',
      'Parallel processing for faster creation',
      'Production NFT systems for both sender (Frame 11.png + Helvetica) and recipient (layered assets + stickers)',
      'Backward compatibility with simple NFT generation',
      'Dynamic image generation based on environment flags',
      'Enhanced authentication with dual NFT verification'
    ],
    environment: {
      USE_PRODUCTION_NFT_FOR_RECIPIENT: USE_PRODUCTION_NFT_FOR_RECIPIENT,
      USE_PRODUCTION_NFT_FOR_SENDER: USE_PRODUCTION_NFT_FOR_SENDER
    }
  })
}

// Export the simplified handler (RLS handles access control)
export { createChatNFTHandler as POST }