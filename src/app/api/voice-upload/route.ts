import { NextRequest, NextResponse } from 'next/server'
import { r2Storage } from '@/lib/r2-storage'
import { createExpiryTimestamp } from '@/lib/voice-codec'

interface VoiceUploadResponse {
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  duration: number
  expires_at: string
  upload_key: string
}

/**
 * Upload voice message to R2 storage
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
    const audioFile = formData.get('audio') as File
    const messageId = formData.get('messageId') as string
    const duration = parseFloat(formData.get('duration') as string)

    // Validate required fields
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'Valid duration is required' }, { status: 400 })
    }

    // Validate audio file
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'File must be an audio file' }, { status: 400 })
    }

    // Check file size (max 2MB for 1 minute at 32kbps)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (audioFile.size > maxSize) {
      return NextResponse.json({ 
        error: `Audio file too large. Maximum size is ${maxSize / 1024 / 1024}MB.` 
      }, { status: 400 })
    }

    // Check duration (max 1 minute)
    const maxDuration = 60 // 1 minute
    if (duration > maxDuration) {
      return NextResponse.json({ 
        error: `Audio too long. Maximum duration is ${maxDuration} seconds.` 
      }, { status: 400 })
    }

    console.log(`Uploading voice message for wallet ${walletAddress.slice(0, 8)}..., duration: ${duration}s, size: ${Math.round(audioFile.size / 1024)}KB`)

    // Convert File to Blob for upload
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type })

    // Upload to R2 storage in voice directory
    const uploadResult = await r2Storage.uploadVoiceMessage(
      audioBlob,
      walletAddress,
      messageId,
      duration
    )

    // Create expiry timestamp (24 hours from now)
    const expiresAt = createExpiryTimestamp()

    const response: VoiceUploadResponse = {
      file_url: uploadResult.publicUrl,
      file_name: `voice_${messageId}.mp4`,
      file_size: uploadResult.size,
      file_type: 'audio/mp4',
      duration,
      expires_at: expiresAt,
      upload_key: uploadResult.key
    }

    console.log(`✅ Voice message uploaded successfully:`, {
      key: uploadResult.key,
      size: `${Math.round(uploadResult.size / 1024)}KB`,
      duration: `${duration}s`,
      expiresAt
    })

    return NextResponse.json({
      success: true,
      data: response
    })

  } catch (error) {
    console.error('Voice upload error:', error)
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to upload')) {
        return NextResponse.json({ 
          error: 'Failed to upload voice message to storage. Please try again.' 
        }, { status: 500 })
      }
      
      if (error.message.includes('permission') || error.message.includes('access')) {
        return NextResponse.json({ 
          error: 'Storage access denied. Please check your permissions.' 
        }, { status: 403 })
      }
    }

    return NextResponse.json({ 
      error: 'Failed to upload voice message. Please try again.' 
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