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

// Validate required environment variables
if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ACCOUNT_ID) {
  throw new Error(
    'Missing R2 environment variables. Please add R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ACCOUNT_ID to your .env file.'
  )
}

// Create S3 client for R2
export const r2Client = new S3Client(r2Config)

// Bucket name from environment
export const BUCKET_NAME = process.env.R2_BUCKET || 'stork-nft'

// Base URL for public access
export const getPublicUrl = (key: string): string => {
  // Use the public R2 development URL if available, otherwise fall back to base URL
  const baseUrl = process.env.R2_PUBLIC_URL || process.env.R2_BASE_URL || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}`
  return `${baseUrl}/${key}`
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
   * Download a file from R2 storage
   */
  async downloadFile(key: string): Promise<Buffer> {
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