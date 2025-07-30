import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'
import { 
  validateServerImageFile, 
  processServerImage, 
  generateServerImageFilename, 
  generateServerThumbnailFilename,
  getBestServerConfig
} from '@/lib/server-image-processing'

interface ImageUploadResponse {
  imageUrl: string
  thumbnailUrl?: string
  fileName: string
  fileSize: number
  fileType: string
  dimensions: { width: number; height: number }
  uploadKey: string
  thumbnailKey?: string
  compressionRatio: number
}

/**
 * Upload image to R2 storage with WebP conversion and thumbnail generation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get wallet address and auth token from headers
    const walletAddress = request.headers.get('X-Wallet-Address')
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!walletAddress || !authToken) {
      return NextResponse.json({ error: 'Missing authentication headers' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const imageFile = formData.get('image') as File
    const messageId = formData.get('messageId') as string

    // Validate required fields
    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    console.log(`Processing image upload for wallet ${walletAddress.slice(0, 8)}...`)
    console.log(`📁 File details: name="${imageFile.name}", type="${imageFile.type}", size=${Math.round(imageFile.size / 1024)}KB`)

    // Validate image file
    const validation = await validateServerImageFile(imageFile)
    if (!validation.valid) {
      console.error(`❌ Image validation failed: ${validation.error}`)
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    
    console.log(`✅ Image validation passed`)

    // Process image with best available format (WebP if supported, otherwise JPEG)
    const serverConfig = getBestServerConfig()
    console.log(`🔧 Using server config: ${serverConfig.outputFormat} at quality ${serverConfig.quality}`)
    const processingResult = await processServerImage(imageFile, serverConfig)

    console.log(`Image processed: ${processingResult.metadata.originalFormat} → ${processingResult.metadata.processedFormat}, compression: ${processingResult.metadata.compressionRatio.toFixed(2)}x`)

    // Generate filenames
    const imageFilename = generateServerImageFilename(walletAddress, messageId, processingResult.metadata.processedFormat)
    const thumbnailFilename = generateServerThumbnailFilename(walletAddress, messageId, processingResult.metadata.processedFormat)

    // Use buffers directly from server-side processing
    const imageBuffer = processingResult.processedBlob
    const thumbnailBuffer = processingResult.thumbnailBlob || null

    // Upload main image to R2 storage in images directory
    const imageUploadResult = await r2Storage.uploadFile(
      imageBuffer,
      imageFilename,
      processingResult.metadata.processedFormat,
      {
        originalName: imageFile.name,
        contentType: processingResult.metadata.processedFormat,
        walletAddress,
        messageId,
        type: 'chat-image',
        originalFormat: processingResult.metadata.originalFormat,
        originalSize: processingResult.metadata.originalSize.toString(),
        processedSize: processingResult.metadata.processedSize.toString(),
        compressionRatio: processingResult.metadata.compressionRatio.toString(),
        dimensions: JSON.stringify(processingResult.metadata.dimensions),
        uploadedAt: new Date().toISOString()
      }
    )

    // Upload thumbnail if available
    let thumbnailUploadResult = null
    if (thumbnailBuffer && processingResult.metadata.thumbnailDimensions) {
      try {
        thumbnailUploadResult = await r2Storage.uploadFile(
          thumbnailBuffer,
          thumbnailFilename,
          processingResult.metadata.processedFormat,
          {
            originalName: `thumb_${imageFile.name}`,
            contentType: processingResult.metadata.processedFormat,
            walletAddress,
            messageId,
            type: 'chat-image-thumbnail',
            dimensions: JSON.stringify(processingResult.metadata.thumbnailDimensions),
            parentImageKey: imageUploadResult.key,
            uploadedAt: new Date().toISOString()
          }
        )
      } catch (thumbnailError) {
        console.warn('Thumbnail upload failed, continuing without thumbnail:', thumbnailError)
      }
    }

    const response: ImageUploadResponse = {
      imageUrl: imageUploadResult.publicUrl,
      thumbnailUrl: thumbnailUploadResult?.publicUrl,
      fileName: imageFilename,
      fileSize: processingResult.metadata.processedSize,
      fileType: processingResult.metadata.processedFormat,
      dimensions: processingResult.metadata.dimensions,
      uploadKey: imageUploadResult.key,
      thumbnailKey: thumbnailUploadResult?.key,
      compressionRatio: processingResult.metadata.compressionRatio
    }

    console.log(`✅ Image uploaded successfully:`, {
      key: imageUploadResult.key,
      size: `${Math.round(imageUploadResult.size / 1024)}KB`,
      dimensions: `${processingResult.metadata.dimensions.width}x${processingResult.metadata.dimensions.height}`,
      compression: `${processingResult.metadata.compressionRatio.toFixed(2)}x`,
      thumbnail: !!thumbnailUploadResult
    })

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Image upload error:', error)
    
    // Return more specific error messages
    if (error instanceof Error) {
      // Image processing errors
      if (error.message.includes('Canvas API not supported')) {
        return NextResponse.json({ 
          error: 'Image processing not supported in this browser. Please try a different browser.' 
        }, { status: 400 })
      }

      if (error.message.includes('WebP format not supported')) {
        return NextResponse.json({ 
          error: 'WebP conversion not supported. Image will be uploaded in original format.' 
        }, { status: 400 })
      }

      if (error.message.includes('File too large') || error.message.includes('Image too large')) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 400 })
      }

      if (error.message.includes('Unsupported file type')) {
        return NextResponse.json({ 
          error: 'Unsupported image format. Please use JPEG, PNG, GIF, or WebP.' 
        }, { status: 400 })
      }

      // Storage errors
      if (error.message.includes('Failed to upload')) {
        return NextResponse.json({ 
          error: 'Failed to upload image to storage. Please try again.' 
        }, { status: 500 })
      }
      
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json({ 
          error: 'Storage access denied. Please check your permissions.' 
        }, { status: 403 })
      }

      // Image validation errors
      if (error.message.includes('Failed to read image') || error.message.includes('Failed to load image')) {
        return NextResponse.json({ 
          error: 'Invalid or corrupted image file. Please try a different image.' 
        }, { status: 400 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to upload image. Please try again.' 
    }, { status: 500 })
  }
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Address',
    },
  })
}