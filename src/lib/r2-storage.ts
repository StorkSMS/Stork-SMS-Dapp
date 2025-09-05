import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

// R2 Configuration
const r2Config = {
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
}

// Validate required environment variables (server-side only)
if (typeof window === 'undefined') { // Only check on server-side
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID) {
    throw new Error(
      'Missing R2 environment variables. Please add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID to your .env file.'
    )
  }
}

// Create S3 client for R2 (server-side only)
export const r2Client = typeof window === 'undefined' ? new S3Client(r2Config) : null

// Bucket name from environment
export const BUCKET_NAME = process.env.R2_BUCKET || 'stork-nft'

// Base URL for public access
export const getPublicUrl = (key: string): string => {
  // Use the public R2 development URL if available, otherwise fall back to base URL
  const baseUrl = process.env.R2_PUBLIC_URL || process.env.R2_BASE_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}`
  const publicUrl = `${baseUrl}/${key}`
  
  // Log the generated URL for debugging
  console.log(`🔗 Generated R2 public URL: ${publicUrl}`)
  console.log(`📝 R2_PUBLIC_URL: ${process.env.R2_PUBLIC_URL || 'not set'}`)
  console.log(`📝 R2_BASE_URL: ${process.env.R2_BASE_URL || 'not set'}`)
  console.log(`📝 Using fallback: ${!process.env.R2_PUBLIC_URL && !process.env.R2_BASE_URL}`)
  
  return publicUrl
}

// File upload types
export interface UploadResult {
  key: string
  publicUrl: string
  size: number
}

export interface FileMetadata {
  originalName?: string
  contentType?: string
  walletAddress?: string
  messageId?: string
  [key: string]: any
}

// R2 Storage operations
export const r2Storage = {
  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    file: Buffer | Uint8Array,
    fileName: string,
    contentType: string = 'application/octet-stream',
    metadata: FileMetadata = {}
  ): Promise<UploadResult> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      // Generate unique key with timestamp and UUID
      const timestamp = Date.now()
      const uuid = uuidv4().substring(0, 8)
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const key = `uploads/${timestamp}_${uuid}_${sanitizedFileName}`

      // Prepare metadata for S3
      const s3Metadata: Record<string, string> = {}
      Object.entries(metadata).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          s3Metadata[k] = String(v)
        }
      })

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: s3Metadata,
        ACL: 'public-read', // Make files publicly accessible
        // Add cache control for better performance
        CacheControl: 'public, max-age=31536000' // Cache for 1 year
      })

      await r2Client.send(command)

      return {
        key,
        publicUrl: getPublicUrl(key),
        size: file.length,
      }
    } catch (error) {
      console.error('R2 upload error:', error)
      throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Upload NFT image with specific naming convention
   */
  async uploadNFTImage(
    imageBuffer: Buffer,
    walletAddress: string,
    messageId: string,
    contentType: string = 'image/png'
  ): Promise<UploadResult> {
    const fileName = `nft_${messageId}.png`
    const metadata: FileMetadata = {
      originalName: fileName,
      contentType,
      walletAddress,
      messageId,
      type: 'nft-image',
    }

    return this.uploadFile(imageBuffer, fileName, contentType, metadata)
  },

  /**
   * Upload NFT metadata JSON
   */
  async uploadNFTMetadata(
    metadata: any,
    messageId: string,
    walletAddress: string
  ): Promise<UploadResult> {
    const metadataJson = JSON.stringify(metadata, null, 2)
    const buffer = Buffer.from(metadataJson, 'utf-8')
    const fileName = `metadata_${messageId}.json`
    
    const fileMetadata: FileMetadata = {
      originalName: fileName,
      contentType: 'application/json',
      walletAddress,
      messageId,
      type: 'nft-metadata',
    }

    return this.uploadFile(buffer, fileName, 'application/json', fileMetadata)
  },

  /**
   * Upload voice message with specific naming convention for stork-nft/voice/ directory
   */
  async uploadVoiceMessage(
    audioBlob: Blob,
    walletAddress: string,
    messageId: string,
    duration: number
  ): Promise<UploadResult> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      // Generate unique key in voice directory with timestamp and metadata
      const timestamp = Date.now()
      const uuid = uuidv4().substring(0, 8)
      const walletShort = walletAddress.slice(0, 8)
      const key = `voice/${timestamp}_${messageId}_${walletShort}.mp4`

      // Convert Blob to Buffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Prepare metadata for S3 with voice-specific information
      const s3Metadata: Record<string, string> = {
        originalName: `voice_${messageId}.mp4`,
        contentType: 'audio/mp4',
        walletAddress,
        messageId,
        type: 'voice-message',
        duration: duration.toString(),
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      }

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'audio/mp4',
        Metadata: s3Metadata,
        ACL: 'public-read', // Make files publicly accessible
      })

      await r2Client.send(command)

      return {
        key,
        publicUrl: getPublicUrl(key),
        size: buffer.length,
      }
    } catch (error) {
      console.error('R2 voice upload error:', error)
      throw new Error(`Failed to upload voice message to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Upload image message with specific naming convention for stork-nft/images/ directory
   */
  async uploadImageMessage(
    imageBlob: Blob,
    walletAddress: string,
    messageId: string,
    dimensions: { width: number; height: number },
    originalFormat?: string,
    compressionRatio?: number
  ): Promise<UploadResult> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      // Generate unique key in images directory with timestamp and metadata
      const timestamp = Date.now()
      const uuid = uuidv4().substring(0, 8)
      const walletShort = walletAddress.slice(0, 8)
      const key = `images/${timestamp}_${messageId}_${walletShort}.webp`

      // Convert Blob to Buffer
      const arrayBuffer = await imageBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Prepare metadata for S3 with image-specific information
      const s3Metadata: Record<string, string> = {
        originalName: `image_${messageId}.webp`,
        contentType: 'image/webp',
        walletAddress,
        messageId,
        type: 'chat-image',
        width: dimensions.width.toString(),
        height: dimensions.height.toString(),
        uploadedAt: new Date().toISOString()
      }

      // Add optional metadata if provided
      if (originalFormat) {
        s3Metadata.originalFormat = originalFormat
      }
      if (compressionRatio) {
        s3Metadata.compressionRatio = compressionRatio.toString()
      }

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        Metadata: s3Metadata,
        ACL: 'public-read', // Make files publicly accessible
      })

      await r2Client.send(command)

      return {
        key,
        publicUrl: getPublicUrl(key),
        size: buffer.length,
      }
    } catch (error) {
      console.error('R2 image upload error:', error)
      throw new Error(`Failed to upload image message to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Upload image thumbnail with specific naming convention for stork-nft/images/thumbnails/ directory
   */
  async uploadImageThumbnail(
    thumbnailBlob: Blob,
    walletAddress: string,
    messageId: string,
    dimensions: { width: number; height: number },
    parentImageKey: string
  ): Promise<UploadResult> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      // Generate unique key in thumbnails directory
      const timestamp = Date.now()
      const uuid = uuidv4().substring(0, 8)
      const walletShort = walletAddress.slice(0, 8)
      const key = `images/thumbnails/${timestamp}_${messageId}_${walletShort}.webp`

      // Convert Blob to Buffer
      const arrayBuffer = await thumbnailBlob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Prepare metadata for S3 with thumbnail-specific information
      const s3Metadata: Record<string, string> = {
        originalName: `thumb_${messageId}.webp`,
        contentType: 'image/webp',
        walletAddress,
        messageId,
        type: 'chat-image-thumbnail',
        width: dimensions.width.toString(),
        height: dimensions.height.toString(),
        parentImageKey,
        uploadedAt: new Date().toISOString()
      }

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        Metadata: s3Metadata,
        ACL: 'public-read', // Make files publicly accessible
      })

      await r2Client.send(command)

      return {
        key,
        publicUrl: getPublicUrl(key),
        size: buffer.length,
      }
    } catch (error) {
      console.error('R2 thumbnail upload error:', error)
      throw new Error(`Failed to upload image thumbnail to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Download a file from R2 storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      const response = await r2Client.send(command)
      
      if (!response.Body) {
        throw new Error('No file content received')
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      const reader = response.Body.transformToWebStream().getReader()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      return Buffer.concat(chunks)
    } catch (error) {
      console.error('R2 download error:', error)
      throw new Error(`Failed to download file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Delete a file from R2 storage
   */
  async deleteFile(key: string): Promise<void> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      await r2Client.send(command)
    } catch (error) {
      console.error('R2 delete error:', error)
      throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Check if a file exists in R2 storage
   */
  async fileExists(key: string): Promise<boolean> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })

      await r2Client.send(command)
      return true
    } catch (error) {
      return false
    }
  },

  /**
   * Upload contact avatar with specific naming convention for contacts/ directory
   */
  async uploadContactAvatar(
    avatarFile: Blob | File,
    walletAddress: string,
    contactId: string
  ): Promise<UploadResult> {
    if (!r2Client) {
      throw new Error('R2 client not available. This function can only be used server-side.')
    }
    
    try {
      // Generate unique key in contacts directory
      const timestamp = Date.now()
      const uuid = uuidv4().substring(0, 8)
      const walletShort = walletAddress.slice(0, 8)
      const key = `contacts/${timestamp}_${contactId}_${walletShort}.webp`

      // Convert Blob/File to Buffer
      const arrayBuffer = await avatarFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Prepare metadata for S3 with contact avatar information
      const s3Metadata: Record<string, string> = {
        originalName: `contact_avatar_${contactId}.webp`,
        contentType: 'image/webp',
        walletAddress,
        contactId,
        type: 'contact-avatar',
        size: '64x64',
        uploadedAt: new Date().toISOString()
      }

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
        Metadata: s3Metadata,
        ACL: 'public-read', // Make files publicly accessible
        CacheControl: 'public, max-age=31536000' // Cache for 1 year
      })

      await r2Client.send(command)

      return {
        key,
        publicUrl: getPublicUrl(key),
        size: buffer.length,
      }
    } catch (error) {
      console.error('R2 contact avatar upload error:', error)
      throw new Error(`Failed to upload contact avatar to R2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Generate a unique file key with timestamp and UUID
   */
  generateUniqueKey(prefix: string = 'file', extension: string = ''): string {
    const timestamp = Date.now()
    const uuid = uuidv4().substring(0, 8)
    const ext = extension.startsWith('.') ? extension : (extension ? `.${extension}` : '')
    return `${prefix}/${timestamp}_${uuid}${ext}`
  }
}

// Note: r2Client and getPublicUrl are already exported above

// Helper function to determine content type from file extension
export const getContentTypeFromExtension = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop()
  
  const contentTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'json': 'application/json',
    'txt': 'text/plain',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'aac': 'audio/aac',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
  }
  
  return contentTypes[ext || ''] || 'application/octet-stream'
}