/**
 * Simple, robust image processing utilities with minimal dependencies
 * Designed to work reliably across all browser environments
 */

/**
 * Simple image dimensions getter with fallback
 */
export function getSimpleImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    try {
      // Create image element using the most compatible method
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ 
          width: img.naturalWidth || img.width, 
          height: img.naturalHeight || img.height 
        })
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
 * Simple WebP conversion with fallback
 */
export function convertToSimpleWebP(file: File, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const img = document.createElement('img')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }

      const url = URL.createObjectURL(file)

      img.onload = () => {
        try {
          // Set canvas size to image size
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height

          // Draw image to canvas
          ctx.drawImage(img, 0, 0)

          // Convert to WebP
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('WebP conversion failed'))
            }
          }, 'image/webp', quality)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(new Error(`Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`))
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image for conversion'))
      }

      img.src = url
    } catch (error) {
      reject(new Error(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  })
}

/**
 * Check if WebP is supported
 */
export function isSimpleWebPSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const dataUrl = canvas.toDataURL('image/webp')
    return dataUrl.indexOf('data:image/webp') === 0
  } catch {
    return false
  }
}

/**
 * Resize image dimensions maintaining aspect ratio
 */
export function calculateSimpleResize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight

  let width = originalWidth
  let height = originalHeight

  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}