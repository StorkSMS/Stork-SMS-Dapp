/**
 * Image processing utilities for WebP conversion and optimization
 * Handles JPEG, PNG, GIF → WebP conversion with thumbnails and compression
 */

export interface ImageConfig {
  outputFormat: 'image/webp' | 'image/jpeg' | 'image/png'
  quality: number
  maxWidth: number
  maxHeight: number
  thumbnailSize: number
}

export interface ImageProcessingResult {
  originalBlob: Blob
  processedBlob: Blob
  thumbnailBlob?: Blob
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

export interface ImageValidationResult {
  valid: boolean
  error?: string
  metadata?: {
    width: number
    height: number
    size: number
    type: string
  }
}

// Configuration hierarchy from most preferred to most compatible
export const IMAGE_CONFIGS: ImageConfig[] = [
  // High quality WebP (best compression)
  {
    outputFormat: 'image/webp',
    quality: 0.85,
    maxWidth: 1920,
    maxHeight: 1080,
    thumbnailSize: 300
  },
  // Medium quality WebP (good balance)
  {
    outputFormat: 'image/webp',
    quality: 0.75,
    maxWidth: 1600,
    maxHeight: 900,
    thumbnailSize: 250
  },
  // Lower quality WebP (smaller files)
  {
    outputFormat: 'image/webp',
    quality: 0.65,
    maxWidth: 1280,
    maxHeight: 720,
    thumbnailSize: 200
  },
  // JPEG fallback (if WebP not supported)
  {
    outputFormat: 'image/jpeg',
    quality: 0.8,
    maxWidth: 1600,
    maxHeight: 900,
    thumbnailSize: 250
  }
]

// Supported input formats
export const SUPPORTED_INPUT_FORMATS = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
]

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Check if the browser supports WebP conversion
 */
export function isWebPSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    
    // Test if browser can export WebP
    const webpDataUrl = canvas.toDataURL('image/webp')
    return webpDataUrl.indexOf('data:image/webp') === 0
  } catch (error) {
    return false
  }
}

/**
 * Check if Canvas API is available for image processing
 */
export function isCanvasSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    return !!(canvas && ctx && typeof ctx.drawImage === 'function')
  } catch (error) {
    return false
  }
}

/**
 * Get the best supported image configuration for the current browser
 */
export function getBestSupportedImageConfig(): ImageConfig {
  // Check WebP support
  if (isWebPSupported()) {
    console.log('🖼️ WebP supported, using high quality WebP config')
    return IMAGE_CONFIGS[0] // High quality WebP
  }

  // Fallback to JPEG
  console.log('🖼️ WebP not supported, using JPEG fallback')
  return IMAGE_CONFIGS[3] // JPEG fallback
}

/**
 * Validate image file before processing
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // Check file type
  if (!SUPPORTED_INPUT_FORMATS.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported formats: JPEG, PNG, GIF, WebP`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${Math.round(file.size / 1024 / 1024)}MB. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  // Get image dimensions
  try {
    const dimensions = await getImageDimensions(file)
    
    // Check minimum dimensions
    if (dimensions.width < 10 || dimensions.height < 10) {
      return {
        valid: false,
        error: 'Image too small. Minimum dimensions: 10x10 pixels'
      }
    }

    // Check maximum dimensions (30MP)
    const maxPixels = 30 * 1024 * 1024
    if (dimensions.width * dimensions.height > maxPixels) {
      return {
        valid: false,
        error: 'Image too large. Maximum resolution: 30 megapixels'
      }
    }

    return {
      valid: true,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        size: file.size,
        type: file.type
      }
    }

  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read image: ' + (error instanceof Error ? error.message : 'Unknown error')
    }
  }
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      // Create Image element using the most reliable method
      let img: HTMLImageElement
      
      // Try document.createElement first (most reliable)
      if (typeof document !== 'undefined' && document.createElement) {
        img = document.createElement('img') as HTMLImageElement
      } else if (typeof window !== 'undefined' && window.Image && typeof window.Image === 'function') {
        img = new window.Image()
      } else if (typeof Image !== 'undefined') {
        img = new Image()
      } else {
        reject(new Error('No method available to create image element'))
        return
      }

      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    } catch (error) {
      reject(new Error(`Image processing error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

/**
 * Calculate optimal resize dimensions maintaining aspect ratio
 */
export function calculateResizeDimensions(
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
 * Process image: resize, convert format, and create thumbnail
 */
export async function processImage(
  file: File,
  config?: ImageConfig,
  onProgress?: (progress: number, message: string) => void
): Promise<ImageProcessingResult> {
  if (!isCanvasSupported()) {
    throw new Error('Canvas API not supported in this browser')
  }

  const selectedConfig = config || getBestSupportedImageConfig()
  
  if (onProgress) onProgress(10, 'Validating image...')

  // Validate input
  const validation = await validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  if (onProgress) onProgress(20, 'Loading image...')

  // Load image
  const img = await loadImageFromFile(file)
  const originalDimensions = { width: img.naturalWidth, height: img.naturalHeight }

  if (onProgress) onProgress(30, 'Processing image...')

  // Calculate main image dimensions
  const mainDimensions = calculateResizeDimensions(
    originalDimensions.width,
    originalDimensions.height,
    selectedConfig.maxWidth,
    selectedConfig.maxHeight
  )

  if (onProgress) onProgress(50, 'Converting to optimized format...')

  // Process main image
  const processedBlob = await resizeAndConvertImage(
    img,
    mainDimensions.width,
    mainDimensions.height,
    selectedConfig.outputFormat,
    selectedConfig.quality
  )

  if (onProgress) onProgress(70, 'Creating thumbnail...')

  // Create thumbnail
  const thumbnailDimensions = calculateResizeDimensions(
    originalDimensions.width,
    originalDimensions.height,
    selectedConfig.thumbnailSize,
    selectedConfig.thumbnailSize
  )

  const thumbnailBlob = await resizeAndConvertImage(
    img,
    thumbnailDimensions.width,
    thumbnailDimensions.height,
    selectedConfig.outputFormat,
    selectedConfig.quality * 0.9 // Slightly lower quality for thumbnails
  )

  if (onProgress) onProgress(90, 'Finalizing...')

  // Calculate compression ratio
  const compressionRatio = file.size / processedBlob.size

  if (onProgress) onProgress(100, 'Complete!')

  return {
    originalBlob: file,
    processedBlob,
    thumbnailBlob,
    metadata: {
      originalFormat: file.type,
      processedFormat: selectedConfig.outputFormat,
      originalSize: file.size,
      processedSize: processedBlob.size,
      compressionRatio,
      dimensions: mainDimensions,
      thumbnailDimensions
    }
  }
}

/**
 * Load image from file
 */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    try {
      // Create Image element using the most reliable method
      let img: HTMLImageElement
      
      // Try document.createElement first (most reliable)
      if (typeof document !== 'undefined' && document.createElement) {
        img = document.createElement('img') as HTMLImageElement
      } else if (typeof window !== 'undefined' && window.Image && typeof window.Image === 'function') {
        img = new window.Image()
      } else if (typeof Image !== 'undefined') {
        img = new Image()
      } else {
        reject(new Error('No method available to create image element'))
        return
      }

      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve(img)
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }

      img.src = url
    } catch (error) {
      reject(new Error(`Image loading error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

/**
 * Resize and convert image using Canvas
 */
function resizeAndConvertImage(
  img: HTMLImageElement,
  width: number,
  height: number,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    canvas.width = width
    canvas.height = height

    // Apply image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Draw resized image
    ctx.drawImage(img, 0, 0, width, height)

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to convert canvas to blob'))
        }
      },
      format,
      quality
    )
  })
}

/**
 * Generate unique image filename with timestamp
 */
export function generateImageFilename(
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
export function generateThumbnailFilename(
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
 * Convert file to WebP format (simplified version for client-side use)
 */
export async function convertToWebP(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> {
  if (!isWebPSupported()) {
    throw new Error('WebP format not supported in this browser')
  }

  const img = await loadImageFromFile(file)
  const dimensions = calculateResizeDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight
  )

  return await resizeAndConvertImage(
    img,
    dimensions.width,
    dimensions.height,
    'image/webp',
    quality
  )
}

/**
 * Create a thumbnail from an image file
 */
export async function createThumbnail(
  file: File,
  size: number = 300,
  quality: number = 0.75
): Promise<Blob> {
  const img = await loadImageFromFile(file)
  const dimensions = calculateResizeDimensions(
    img.naturalWidth,
    img.naturalHeight,
    size,
    size
  )

  const format = isWebPSupported() ? 'image/webp' : 'image/jpeg'
  
  return await resizeAndConvertImage(
    img,
    dimensions.width,
    dimensions.height,
    format,
    quality
  )
}

/**
 * Get image file metadata without full processing
 */
export async function getImageMetadata(file: File): Promise<{
  format: string
  size: number
  dimensions: { width: number; height: number }
  aspectRatio: number
}> {
  const dimensions = await getImageDimensions(file)
  
  return {
    format: file.type,
    size: file.size,
    dimensions,
    aspectRatio: dimensions.width / dimensions.height
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Calculate compression percentage
 */
export function calculateCompressionPercentage(originalSize: number, compressedSize: number): number {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100)
}