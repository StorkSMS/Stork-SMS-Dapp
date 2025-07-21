/**
 * Voice codec utilities for AAC/MP3 processing
 * Handles 32kbps AAC MP4 encoding and browser-side MP3 conversion
 */

export interface AudioConfig {
  mimeType: string
  audioBitsPerSecond: number
  sampleRate: number
  channelCount: number
}

export interface VoiceRecordingResult {
  blob: Blob
  duration: number
  size: number
  url: string
}

// Configuration hierarchy from most preferred to most compatible
export const VOICE_CONFIGS: AudioConfig[] = [
  // Modern WebM with Opus (usually most reliable)
  {
    mimeType: 'audio/webm; codecs=opus',
    audioBitsPerSecond: 32000,
    sampleRate: 48000,
    channelCount: 1
  },
  // Generic WebM (safer fallback)
  {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 32000,
    sampleRate: 44100,
    channelCount: 1
  },
  // Generic MP4 (avoid specific codec specs that cause issues)
  {
    mimeType: 'audio/mp4',
    audioBitsPerSecond: 32000,
    sampleRate: 44100,
    channelCount: 1
  },
  // Lower bitrate options for compatibility
  {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 16000,
    sampleRate: 44100,
    channelCount: 1
  },
  // Ultimate fallback - no bitrate specified
  {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 0, // Let browser decide
    sampleRate: 44100,
    channelCount: 1
  }
]

/**
 * Get the best supported audio configuration for the current browser
 * Tests actual MediaRecorder instantiation, not just isTypeSupported()
 */
export async function getBestSupportedConfig(testStream?: MediaStream): Promise<AudioConfig> {
  // Try each configuration in order of preference
  for (const config of VOICE_CONFIGS) {
    if (await testConfiguration(config, testStream)) {
      console.log('🎤 Selected config:', config.mimeType, '@', config.audioBitsPerSecond, 'bps')
      return config
    }
  }

  // Absolute last resort - browser default with no constraints
  console.warn('🎤 Using browser default configuration')
  return {
    mimeType: '',
    audioBitsPerSecond: 0,
    sampleRate: 44100,
    channelCount: 1
  }
}

/**
 * Test if a configuration actually works with MediaRecorder
 */
async function testConfiguration(config: AudioConfig, testStream?: MediaStream): Promise<boolean> {
  // First check basic support
  if (!MediaRecorder.isTypeSupported(config.mimeType)) {
    return false
  }

  // If we have a test stream, try creating an actual MediaRecorder
  if (testStream) {
    try {
      const options: MediaRecorderOptions = {
        mimeType: config.mimeType || undefined
      }
      
      // Only add audioBitsPerSecond if it's > 0
      if (config.audioBitsPerSecond > 0) {
        options.audioBitsPerSecond = config.audioBitsPerSecond
      }

      const recorder = new MediaRecorder(testStream, options)
      
      // Clean up immediately
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
      
      return true
    } catch (error) {
      console.warn('🎤 Config failed test:', config.mimeType, error)
      return false
    }
  }

  // Without test stream, can only check isTypeSupported
  return true
}

/**
 * Check if the browser supports voice recording
 */
export function isVoiceRecordingSupported(): boolean {
  return !!(
    typeof navigator !== 'undefined' && 
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === 'function' && 
    typeof window.MediaRecorder !== 'undefined'
  )
}

/**
 * Get user media with optimized constraints for voice recording
 */
export async function getVoiceStream(): Promise<MediaStream> {
  if (!isVoiceRecordingSupported()) {
    throw new Error('Voice recording is not supported in this browser')
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      },
      video: false
    })

    return stream
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access to record voice messages.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone to record voice messages.')
      } else if (error.name === 'AbortError') {
        throw new Error('Microphone access was aborted.')
      }
    }
    throw new Error('Failed to access microphone: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

/**
 * Calculate audio duration from blob - tries Web Audio API first, falls back to Audio element
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  // First try Web Audio API approach (more reliable for blob data)
  try {
    return await getAudioDurationWebAudioAPI(blob)
  } catch (webAudioError) {
    console.warn('Web Audio API duration detection failed:', webAudioError)
    
    // Fallback to Audio element approach
    try {
      return await getAudioDurationAudioElement(blob)
    } catch (audioElementError) {
      console.warn('Audio element duration detection failed:', audioElementError)
      
      // Final fallback: estimate based on file size and bitrate
      const estimatedDuration = (blob.size * 8) / (32 * 1000) // 32kbps
      console.info('Using estimated duration based on file size:', estimatedDuration)
      return estimatedDuration
    }
  }
}

/**
 * Get audio duration using Web Audio API (more reliable for blob data)
 */
async function getAudioDurationWebAudioAPI(blob: Blob): Promise<number> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer.duration
    } finally {
      // Clean up the audio context
      if (audioContext.state !== 'closed') {
        await audioContext.close()
      }
    }
  } catch (error) {
    throw new Error('Web Audio API decoding failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

/**
 * Get audio duration using Audio element (fallback method)
 */
async function getAudioDurationAudioElement(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(blob)
    
    // Set preload to metadata only to avoid loading the entire file
    audio.preload = 'metadata'
    
    const cleanup = () => {
      URL.revokeObjectURL(url)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('canplay', onCanPlay)
    }
    
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        cleanup()
        resolve(audio.duration)
      }
    }
    
    const onCanPlay = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        cleanup()
        resolve(audio.duration)
      }
    }
    
    const onError = (e: Event) => {
      cleanup()
      reject(new Error('Audio element failed to load: ' + e.type))
    }
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    
    // Set source after all event listeners are attached
    audio.src = url
    
    // Timeout fallback after 3 seconds
    setTimeout(() => {
      cleanup()
      reject(new Error('Audio element timeout'))
    }, 3000)
  })
}

/**
 * Generate unique voice filename with timestamp
 */
export function generateVoiceFilename(walletAddress: string, messageId: string): string {
  const timestamp = Date.now()
  const walletShort = walletAddress.slice(0, 8)
  return `voice_${timestamp}_${messageId}_${walletShort}.mp4`
}

/**
 * Check if browser supports proper MP3 conversion
 */
function canConvertToMp3(): boolean {
  try {
    // Check for Web Audio API support
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      return false
    }
    
    // Check for required APIs
    return !!(
      window.Blob &&
      window.URL &&
      typeof window.URL.createObjectURL === 'function' &&
      typeof ArrayBuffer !== 'undefined' &&
      typeof Int16Array !== 'undefined'
    )
  } catch (error) {
    return false
  }
}

/**
 * Fallback download function - downloads original file with MP3 extension
 */
async function fallbackDownload(blob: Blob, filename: string, onProgress?: (progress: number) => void): Promise<void> {
  if (onProgress) onProgress(50)
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.(mp4|m4a|aac|webm)$/, '.mp3')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  if (onProgress) onProgress(100)
}

/**
 * Convert audio blob to MP3 format using Web Audio API and lamejs with browser compatibility
 */
export async function convertToMp3Download(blob: Blob, filename: string, onProgress?: (progress: number) => void): Promise<void> {
  // Check if we can do proper conversion
  if (!canConvertToMp3()) {
    console.warn('Browser does not support MP3 conversion, using fallback download')
    return await fallbackDownload(blob, filename, onProgress)
  }
  
  try {
    // Import @breezystack/lamejs dynamically with error handling
    let lamejsModule
    try {
      lamejsModule = await import('@breezystack/lamejs')
    } catch (importError) {
      console.warn('Failed to load lamejs, using fallback download:', importError)
      return await fallbackDownload(blob, filename, onProgress)
    }
    
    const { Mp3Encoder } = lamejsModule
    
    if (onProgress) onProgress(10) // Starting conversion
    
    // Create audio context with proper error handling
    let audioContext
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (contextError) {
      console.warn('Failed to create AudioContext, using fallback download:', contextError)
      return await fallbackDownload(blob, filename, onProgress)
    }
    
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer()
    if (onProgress) onProgress(20) // Buffer loaded
    
    // Decode audio data with error handling
    let audioBuffer
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    } catch (decodeError) {
      console.warn('Failed to decode audio data, using fallback download:', decodeError)
      await audioContext.close()
      return await fallbackDownload(blob, filename, onProgress)
    }
    
    if (onProgress) onProgress(40) // Audio decoded
    
    // Get audio data as Float32Array
    const channels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    
    // Convert to 16-bit PCM
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel
    
    const leftBuffer = new Int16Array(length)
    const rightBuffer = new Int16Array(length)
    
    for (let i = 0; i < length; i++) {
      leftBuffer[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32768))
      rightBuffer[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32768))
    }
    
    if (onProgress) onProgress(60) // PCM conversion complete
    
    // Initialize MP3 encoder with error handling (128kbps, good quality for voice)
    let mp3encoder
    try {
      mp3encoder = new Mp3Encoder(channels, sampleRate, 128)
    } catch (encoderError) {
      console.warn('Failed to initialize MP3 encoder, using fallback download:', encoderError)
      await audioContext.close()
      return await fallbackDownload(blob, filename, onProgress)
    }
    
    const mp3Data: Uint8Array[] = []
    
    // Process audio in chunks for better performance and progress tracking
    const chunkSize = 1152 // Standard MP3 frame size
    let processed = 0
    
    try {
      for (let i = 0; i < length; i += chunkSize) {
        const leftChunk = leftBuffer.subarray(i, Math.min(i + chunkSize, length))
        const rightChunk = rightBuffer.subarray(i, Math.min(i + chunkSize, length))
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk)
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf)
        }
        
        processed += chunkSize
        if (onProgress) {
          const progress = 60 + (processed / length) * 30 // 60-90% for encoding
          onProgress(Math.min(90, progress))
        }
      }
      
      // Flush the encoder
      const mp3buf = mp3encoder.flush()
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
    } catch (encodingError) {
      console.warn('Failed during MP3 encoding, using fallback download:', encodingError)
      await audioContext.close()
      return await fallbackDownload(blob, filename, onProgress)
    }
    
    if (onProgress) onProgress(95) // Encoding complete
    
    // Create final MP3 blob
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' })
    
    // Download the file
    const url = URL.createObjectURL(mp3Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.replace(/\.(mp4|m4a|aac|webm)$/, '.mp3')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    if (onProgress) onProgress(100) // Complete
    
    // Clean up audio context
    await audioContext.close()
    
  } catch (error) {
    console.error('MP3 conversion error:', error)
    // Final fallback - try to download original file
    try {
      console.warn('Using final fallback download due to conversion error')
      return await fallbackDownload(blob, filename, onProgress)
    } catch (fallbackError) {
      console.error('Even fallback download failed:', fallbackError)
      throw new Error('Failed to download audio file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Calculate time remaining until expiry
 */
export function getTimeRemaining(expiresAt: string): { hours: number; minutes: number; expired: boolean } {
  const now = Date.now()
  const expiry = new Date(expiresAt).getTime()
  const timeLeft = expiry - now

  if (timeLeft <= 0) {
    return { hours: 0, minutes: 0, expired: true }
  }

  const hours = Math.floor(timeLeft / (60 * 60 * 1000))
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

  return { hours, minutes, expired: false }
}

/**
 * Format time remaining as square brackets display
 */
export function formatTimeRemaining(expiresAt: string): string {
  const { hours, minutes, expired } = getTimeRemaining(expiresAt)
  
  if (expired) {
    return '[Expired]'
  }
  
  return `[${hours}h ${minutes}m left]`
}

/**
 * Create 24-hour expiry timestamp
 */
export function createExpiryTimestamp(): string {
  const now = new Date()
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now
  return expiry.toISOString()
}

/**
 * Compress audio blob to target size (optional optimization)
 */
export async function compressAudioBlob(blob: Blob, targetBitrate: number = 32000): Promise<Blob> {
  // For now, return the original blob
  // In a full implementation, you'd use Web Audio API to re-encode at target bitrate
  return blob
}

/**
 * Validate audio blob for voice message requirements
 */
export function validateVoiceBlob(blob: Blob, maxDuration: number = 300): Promise<{ valid: boolean; error?: string; duration?: number }> {
  return new Promise(async (resolve) => {
    try {
      // Check file size (rough estimate: 32kbps = 4KB/second, max 5 minutes = ~1.2MB)
      const maxSize = maxDuration * 4 * 1024 // 4KB per second
      if (blob.size > maxSize) {
        resolve({ valid: false, error: `Voice message too large. Maximum size is ${Math.round(maxSize / 1024)}KB.` })
        return
      }

      // Check duration
      const duration = await getAudioDuration(blob)
      if (duration > maxDuration) {
        resolve({ valid: false, error: `Voice message too long. Maximum duration is ${Math.floor(maxDuration / 60)} minutes.` })
        return
      }

      if (duration < 1) {
        resolve({ valid: false, error: 'Voice message too short. Minimum duration is 1 second.' })
        return
      }

      resolve({ valid: true, duration })
    } catch (error) {
      resolve({ valid: false, error: 'Failed to validate voice message: ' + (error instanceof Error ? error.message : 'Unknown error') })
    }
  })
}

/**
 * Validate voice blob with a known duration (avoids blob URL duration detection issues)
 */
export function validateVoiceBlobWithDuration(blob: Blob, duration: number, maxDuration: number = 300): Promise<{ valid: boolean; error?: string; duration?: number }> {
  return new Promise((resolve) => {
    try {
      // Check file size (rough estimate: 32kbps = 4KB/second, max 5 minutes = ~1.2MB)
      const maxSize = maxDuration * 4 * 1024 // 4KB per second
      if (blob.size > maxSize) {
        resolve({ valid: false, error: `Voice message too large. Maximum size is ${Math.round(maxSize / 1024)}KB.` })
        return
      }

      // Check minimum blob size (should be at least 1KB for 1 second at 32kbps)
      if (blob.size < 1024) {
        resolve({ valid: false, error: 'Voice message file appears corrupted or too small.' })
        return
      }

      // Check duration
      if (duration > maxDuration) {
        resolve({ valid: false, error: `Voice message too long. Maximum duration is ${Math.floor(maxDuration / 60)} minutes.` })
        return
      }

      if (duration < 0.5) {
        resolve({ valid: false, error: 'Voice message too short. Minimum duration is 0.5 seconds.' })
        return
      }

      resolve({ valid: true, duration })
    } catch (error) {
      resolve({ valid: false, error: 'Failed to validate voice message: ' + (error instanceof Error ? error.message : 'Unknown error') })
    }
  })
}