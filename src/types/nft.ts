import { PublicKey } from '@solana/web3.js'

// NFT Creation types
export interface NFTCreationOptions {
  name: string
  description: string
  image: string
  attributes?: NFTAttribute[]
  sellerFeeBasisPoints?: number
  creators?: NFTCreator[]
  collection?: {
    name: string
    family: string
  }
  externalUrl?: string
}

export interface NFTAttribute {
  trait_type: string
  value: string | number
  display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date'
}

export interface NFTCreator {
  address: string | PublicKey
  verified: boolean
  share: number
}

// Message NFT specific types
export interface MessageNFTMetadata {
  name: string
  symbol?: string
  description: string
  image: string
  animation_url?: string
  external_url?: string
  attributes: NFTAttribute[]
  properties: {
    files: Array<{
      uri: string
      type: string
    }>
    category: 'image'
    creators?: Array<{
      address: string
      verified: boolean
      share: number
    }>
  }
  collection?: {
    name: string
    family: string
  }
  message: {
    content: string
    sender: string
    recipient: string
    timestamp: string
    encrypted: boolean
  }
}

// NFT Message generation types
export interface NFTMessageGenerationData {
  messageContent: string
  senderWallet: string
  recipientWallet: string
  theme?: 'default' | 'romantic' | 'formal' | 'casual' | 'celebration'
  backgroundColor?: string
  textColor?: string
  fontFamily?: string
  backgroundImage?: string
}

export interface GeneratedNFTResult {
  imageBuffer: Buffer
  metadata: MessageNFTMetadata
  mintAddress?: string
  transactionSignature?: string
}

// Canvas generation types
export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
  padding: number
  fontSize: number
  fontFamily: string
  textColor: string
  lineHeight: number
  maxTextWidth: number
}

export interface TextLayout {
  lines: string[]
  totalHeight: number
  lineHeight: number
  fontSize: number
}

// Storage types
export interface NFTStorageResult {
  imageUrl: string
  metadataUrl: string
  imageKey: string
  metadataKey: string
}

// Mint result types
export interface NFTMintResult {
  mintAddress: string
  transactionSignature: string
  imageUrl: string
  metadataUrl: string
  metadata: MessageNFTMetadata
}

// Error types

export class NFTCreationError extends Error {
  constructor(
    message: string,
    public code: 'GENERATION_FAILED' | 'UPLOAD_FAILED' | 'MINT_FAILED' | 'INVALID_INPUT',
    public originalError?: Error
  ) {
    super(message)
    this.name = 'NFTCreationError'
  }
}