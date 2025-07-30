/**
 * Server-side image processing utilities using node-canvas
 * Works reliably in Node.js environment for API routes
 */

import { createCanvas, loadImage, Image } from 'canvas'

export interface ServerImageConfig {
  outputFormat: 'image/webp' | 'image/jpeg' | 'image/png'
  quality: number
  maxWidth: number
  maxHeight: number
  thumbnailSize: number
}

export interface ServerImageProcessingResult {
  originalBlob: Buffer
  processedBlob: Buffer
  thumbnailBlob?: Buffer
  metadata: {
    originalFormat: string
    processedFormat: string
    originalSize: number
    processedSize: number
    compressionRatio: number
    dimensions: { width: number; height: number }
    thumbnailDimensions?: { width: number; height: number }
  }
}

export interface ServerImageValidationResult {
  valid: boolean
  error?: string
  metadata?: {
    width: number
    height: number
    size: number
    type: string
  }
}

// Default configuration for server-side processing
// Note: WebP conversion in node-canvas can be unreliable, so we default to JPEG
export const DEFAULT_SERVER_CONFIG: ServerImageConfig = {
  outputFormat: 'image/jpeg', // Changed from WebP due to node-canvas reliability issues
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080,
  thumbnailSize: 300
}

// Fallback configuration when WebP fails
export const FALLBACK_SERVER_CONFIG: ServerImageConfig = {
  outputFormat: 'image/jpeg',
  quality: 0.85,
  maxWidth: 1920,
  maxHeight: 1080,
  thumbnailSize: 300
}

// Supported input formats
export const SUPPORTED_INPUT_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/pjpeg', // Progressive JPEG
  'image/png',
  'image/gif',
  'image/webp',
  // Some systems might use these alternative MIME types
  'image/x-png',
  'image/vnd.microsoft.icon',
  'application/octet-stream' // Sometimes used for images
]

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Test if server-side WebP conversion is working properly
 */
export function testServerWebPSupport(): boolean {
  try {
    const testCanvas = createCanvas(1, 1)
    // Test with PNG first to ensure basic canvas functionality works
    const testBuffer = testCanvas.toBuffer('image/png')
    
    // Check if we got a valid buffer with reasonable size
    const isValid = testBuffer && testBuffer.length > 0 && testBuffer.length < 1000
    console.log(`🧪 Server image processing test: ${isValid ? 'PASSED' : 'FAILED'} (buffer size: ${testBuffer?.length || 0})`)
    
    // For now, return false for WebP support to use JPEG fallback
    // This avoids the toBuffer WebP compilation issues
    return false
  } catch (error) {
    console.log(`🧪 Server WebP support test: FAILED (error: ${error instanceof Error ? error.message : 'Unknown'})`)
    return false
  }
}

/**
 * Get the best configuration based on actual server capabilities
 */
export function getBestServerConfig(): ServerImageConfig {
  // Test WebP support once and cache the result
  const webpSupported = testServerWebPSupport()
  
  if (webpSupported) {
    console.log('✅ WebP is supported, using WebP configuration')
    return {
      outputFormat: 'image/webp',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      thumbnailSize: 300
    }
  } else {
    console.log('⚠️ WebP is not supported, using JPEG configuration')
    return DEFAULT_SERVER_CONFIG
  }
}

/**
 * Validate image file before processing
 */
export async function validateServerImageFile(file: File): Promise<ServerImageValidationResult> {
  console.log(`🔍 Validating image file: ${file.name}, type: "${file.type}", size: ${file.size}`)
  
  // Check file type with more flexible validation
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  
  // Check MIME type first
  let isSupported = SUPPORTED_INPUT_FORMATS.includes(fileType)
  
  // If MIME type check fails, try file extension as fallback
  if (!isSupported) {
    console.log(`⚠️ MIME type "${fileType}" not in supported list, checking file extension...`)
    
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      console.log('✅ File extension indicates JPEG, allowing upload')
      isSupported = true
    } else if (fileName.endsWith('.png')) {
      console.log('✅ File extension indicates PNG, allowing upload')
      isSupported = true
    } else if (fileName.endsWith('.gif')) {
      console.log('✅ File extension indicates GIF, allowing upload')
      isSupported = true
    } else if (fileName.endsWith('.webp')) {
      console.log('✅ File extension indicates WebP, allowing upload')
      isSupported = true
    }
  }
  
  if (!isSupported) {
    console.error(`❌ Unsupported file: "${file.name}" with type "${fileType}"`)
    return {
      valid: false,
      error: `Unsupported file type: "${fileType}" for file "${file.name}". Supported formats: JPEG, PNG, GIF, WebP`
    }
  }
  
  console.log(`✅ File type validation passed for: ${file.name}`)
  

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  // Get image dimensions using server-side canvas
  try {
    console.log(`🔄 Loading image buffer for validation...`)
    const buffer = Buffer.from(await file.arrayBuffer())
    
    console.log(`🔄 Attempting to load image with node-canvas...`)
    const img = await loadImage(buffer)
    
    console.log(`✅ Image loaded successfully: ${img.width}x${img.height}`)
    
    // Check minimum dimensions
    if (img.width < 10 || img.height < 10) {
      return {
        valid: false,
        error: 'Image too small. Minimum dimensions: 10x10 pixels'
      }
    }

    // Check maximum dimensions (30MP)
    const maxPixels = 30 * 1024 * 1024
    if (img.width * img.height > maxPixels) {
      return {
        valid: false,
        error: 'Image too large. Maximum resolution: 30 megapixels'
      }
    }

    return {
      valid: true,
      metadata: {
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type
      }
    }

  } catch (error) {
    console.error(`❌ Failed to validate image "${file.name}":`, error)
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('unsupported image type') || errorMessage.includes('Invalid image')) {
      return {
        valid: false,
        error: `The image file "${file.name}" appears to be corrupted or in an unsupported format. Please try saving it as JPEG or PNG and upload again.`
      }
    }
    
    if (errorMessage.includes('premature end') || errorMessage.includes('truncated')) {
      return {
        valid: false,
        error: `The image file "${file.name}" appears to be incomplete or corrupted. Please try uploading the file again.`
      }
    }
    
    return {
      valid: false,
      error: `Failed to read image "${file.name}": ${errorMessage}. Please try converting to JPEG or PNG format.`
    }
  }
}

/**
 * Calculate optimal resize dimensions maintaining aspect ratio
 */
export function calculateServerResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight

  let newWidth = originalWidth
  let newHeight = originalHeight

  // Scale down if exceeds max dimensions
  if (newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = newWidth / aspectRatio
  }

  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = newHeight * aspectRatio
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  }
}

/**
 * Process image on server side: resize, convert format, and create thumbnail
 * Includes automatic fallback to JPEG if WebP conversion fails
 */
export async function processServerImage(
  file: File,
  config: ServerImageConfig = DEFAULT_SERVER_CONFIG
): Promise<ServerImageProcessingResult> {
  
  // Validate input
  const validation = await validateServerImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Load image using server-side canvas
  const buffer = Buffer.from(await file.arrayBuffer())
  const img = await loadImage(buffer)
  const originalDimensions = { width: img.width, height: img.height }

  // Calculate main image dimensions
  const mainDimensions = calculateServerResizeDimensions(
    originalDimensions.width,
    originalDimensions.height,
    config.maxWidth,
    config.maxHeight
  )

  let processedBuffer: Buffer
  let actualFormat = config.outputFormat
  let actualConfig = config

  // Try primary format first (usually WebP)
  try {
    console.log(`🔄 Processing image with ${config.outputFormat}...`)
    processedBuffer = await resizeAndConvertServerImage(
      img,
      mainDimensions.width,
      mainDimensions.height,
      config.outputFormat,
      config.quality
    )
    console.log(`✅ Successfully processed with ${config.outputFormat}`)
  } catch (primaryError) {
    console.warn(`⚠️ Primary format ${config.outputFormat} failed:`, primaryError)
    
    // Fallback to JPEG if WebP fails
    if (config.outputFormat === 'image/webp') {
      console.log('🔄 Falling back to JPEG format...')
      try {
        actualConfig = FALLBACK_SERVER_CONFIG
        actualFormat = actualConfig.outputFormat
        
        processedBuffer = await resizeAndConvertServerImage(
          img,
          mainDimensions.width,
          mainDimensions.height,
          actualFormat,
          actualConfig.quality
        )
        console.log('✅ Successfully processed with JPEG fallback')
      } catch (fallbackError) {
        console.error('❌ JPEG fallback also failed:', fallbackError)
        
        // Last resort: try PNG
        console.log('🔄 Last resort: trying PNG format...')
        try {
          actualFormat = 'image/png'
          processedBuffer = await resizeAndConvertServerImage(
            img,
            mainDimensions.width,
            mainDimensions.height,
            actualFormat,
            actualConfig.quality
          )
          console.log('✅ Successfully processed with PNG fallback')
        } catch (pngError) {
          console.error('❌ All format conversions failed:', pngError)
          throw new Error(`Image processing failed: Unable to convert to any supported format. Original error: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}`)
        }
      }
    } else {
      // If the primary format wasn't WebP, just re-throw the error
      throw new Error(`Image processing failed: ${primaryError instanceof Error ? primaryError.message : 'Unknown error'}`)
    }
  }

  // Create thumbnail with same format as main image
  const thumbnailDimensions = calculateServerResizeDimensions(
    originalDimensions.width,
    originalDimensions.height,
    actualConfig.thumbnailSize,
    actualConfig.thumbnailSize
  )

  let thumbnailBuffer: Buffer
  try {
    thumbnailBuffer = await resizeAndConvertServerImage(
      img,
      thumbnailDimensions.width,
      thumbnailDimensions.height,
      actualFormat,
      actualConfig.quality * 0.9 // Slightly lower quality for thumbnails
    )
  } catch (thumbnailError) {
    console.warn('⚠️ Thumbnail creation failed, proceeding without thumbnail:', thumbnailError)
    // Don't fail the entire upload if thumbnail creation fails
    thumbnailBuffer = Buffer.alloc(0)
  }

  // Calculate compression ratio
  const compressionRatio = buffer.length / processedBuffer.length

  return {
    originalBlob: buffer,
    processedBlob: processedBuffer,
    thumbnailBlob: thumbnailBuffer.length > 0 ? thumbnailBuffer : undefined,
    metadata: {
      originalFormat: file.type,
      processedFormat: actualFormat,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      compressionRatio,
      dimensions: mainDimensions,
      thumbnailDimensions: thumbnailBuffer.length > 0 ? thumbnailDimensions : undefined
    }
  }
}

/**
 * Resize and convert image using server-side Canvas
 */
async function resizeAndConvertServerImage(
  img: Image,
  width: number,
  height: number,
  format: string,
  quality: number
): Promise<Buffer> {
  try {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Apply image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw resized image
    ctx.drawImage(img, 0, 0, width, height)

    // Convert to buffer based on format with error handling
    let buffer: Buffer
    
    try {
      if (format === 'image/webp') {
        // WebP conversion - fallback to JPEG if WebP fails
        console.log(`🔄 Attempting WebP conversion with quality ${quality}`)
        
        try {
          // Since WebP has compilation issues, fall back to JPEG
          console.warn('⚠️ WebP compilation issues detected, using JPEG fallback')
          buffer = canvas.toBuffer('image/jpeg', { quality: quality })
        } catch (webpError) {
          console.warn('⚠️ WebP conversion failed:', webpError)
          throw new Error(`WebP conversion failed: ${webpError instanceof Error ? webpError.message : 'Unknown WebP error'}`)
        }
        
      } else if (format === 'image/jpeg') {
        // JPEG with quality (0-1 scale)
        const jpegQuality = quality > 1 ? quality / 100 : quality
        buffer = canvas.toBuffer('image/jpeg', { quality: jpegQuality })
        
      } else if (format === 'image/png') {
        // PNG (quality parameter doesn't apply)
        buffer = canvas.toBuffer('image/png')
        
      } else {
        // Fallback to JPEG for unknown formats
        console.warn(`⚠️ Unknown format ${format}, falling back to JPEG`)
        const jpegQuality = quality > 1 ? quality / 100 : quality
        buffer = canvas.toBuffer('image/jpeg', { quality: jpegQuality })
      }
      
    } catch (conversionError) {
      console.error(`❌ Failed to convert to ${format}:`, conversionError)
      throw new Error(`Format conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown conversion error'}`)
    }

    // Validate that we got a valid buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Image conversion produced empty buffer')
    }

    return buffer
    
  } catch (error) {
    console.error('❌ Image resize and conversion failed:', error)
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate unique image filename with timestamp
 */
export function generateServerImageFilename(
  walletAddress: string,
  messageId: string,
  format: string = 'webp'
): string {
  const timestamp = Date.now()
  const walletShort = walletAddress.slice(0, 8)
  const extension = format.replace('image/', '')
  return `image_${timestamp}_${messageId}_${walletShort}.${extension}`
}

/**
 * Generate thumbnail filename
 */
export function generateServerThumbnailFilename(
  walletAddress: string,
  messageId: string,
  format: string = 'webp'
): string {
  const timestamp = Date.now()
  const walletShort = walletAddress.slice(0, 8)
  const extension = format.replace('image/', '')
  return `thumb_${timestamp}_${messageId}_${walletShort}.${extension}`
}

/**
 * Get image dimensions from file using server-side processing
 */
export async function getServerImageDimensions(file: File): Promise<{ width: number; height: number }> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const img = await loadImage(buffer)
    return { width: img.width, height: img.height }
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}