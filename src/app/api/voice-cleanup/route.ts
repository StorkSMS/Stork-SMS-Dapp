import { NextRequest, NextResponse } from 'next/server'
import { r2Client, BUCKET_NAME } from '@/lib/r2-storage'
import { ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'

/**
 * Voice cleanup API for 24-hour auto-deletion
 * This endpoint should be called by a scheduled job (e.g., cron job or serverless function)
 * to delete expired voice messages from R2 storage
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧹 Starting voice message cleanup process...')
    
    if (!r2Client) {
      return NextResponse.json(
        { error: 'R2 storage not configured' },
        { status: 503 }
      )
    }
    
    // Verify this is an authorized cleanup request
    const authHeader = request.headers.get('Authorization')
    const cleanupKey = process.env.VOICE_CLEANUP_SECRET || 'cleanup-secret-key'
    
    if (authHeader !== `Bearer ${cleanupKey}`) {
      return NextResponse.json({ error: 'Unauthorized cleanup request' }, { status: 401 })
    }

    const now = new Date()
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    console.log(`🕐 Cleaning up voice files older than: ${cutoffTime.toISOString()}`)

    // List all objects in the voice/ directory
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'voice/',
      MaxKeys: 1000 // Process in batches
    })

    const listResponse = await r2Client.send(listCommand)
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('📁 No voice files found for cleanup')
      return NextResponse.json({
        success: true,
        message: 'No voice files found for cleanup',
        deleted: 0
      })
    }

    console.log(`📂 Found ${listResponse.Contents.length} voice files to check`)

    const filesToDelete: string[] = []
    let totalChecked = 0
    
    // Check each file's age
    for (const object of listResponse.Contents) {
      totalChecked++
      
      if (!object.Key || !object.LastModified) {
        continue
      }

      // Check if file is older than 24 hours
      if (object.LastModified < cutoffTime) {
        filesToDelete.push(object.Key)
        console.log(`🗑️  Marking for deletion: ${object.Key} (uploaded: ${object.LastModified.toISOString()})`)
      }
    }

    console.log(`✅ Checked ${totalChecked} files, found ${filesToDelete.length} expired files`)

    // Delete expired files
    let deletedCount = 0
    const deleteErrors: string[] = []

    for (const key of filesToDelete) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        })

        await r2Client.send(deleteCommand)
        deletedCount++
        console.log(`🗑️  Deleted expired voice file: ${key}`)
        
      } catch (error) {
        const errorMsg = `Failed to delete ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`
        deleteErrors.push(errorMsg)
        console.error('❌', errorMsg)
      }
    }

    const summary = {
      success: true,
      message: `Voice cleanup completed successfully`,
      stats: {
        totalChecked,
        expiredFound: filesToDelete.length,
        deleted: deletedCount,
        errors: deleteErrors.length,
        cutoffTime: cutoffTime.toISOString()
      },
      errors: deleteErrors.length > 0 ? deleteErrors : undefined
    }

    console.log('🧹 Voice cleanup summary:', summary.stats)

    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ Voice cleanup error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Voice cleanup failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check cleanup status and next scheduled run
 */
export async function GET(): Promise<NextResponse> {
  try {
    const now = new Date()
    
    if (!r2Client) {
      return NextResponse.json(
        { error: 'R2 storage not configured' },
        { status: 503 }
      )
    }
    
    // Count current voice files
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'voice/',
      MaxKeys: 1
    })

    const listResponse = await r2Client.send(listCommand)
    const hasVoiceFiles = listResponse.Contents && listResponse.Contents.length > 0

    return NextResponse.json({
      success: true,
      status: 'Voice cleanup service is running',
      currentTime: now.toISOString(),
      hasVoiceFiles,
      nextCleanupRecommended: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      cleanupFrequency: '24 hours',
      instructions: {
        scheduleCleanup: 'POST to this endpoint with Authorization: Bearer YOUR_CLEANUP_SECRET',
        setupCron: 'Set up a cron job or scheduled function to call this endpoint every hour'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check cleanup status: ' + (error instanceof Error ? error.message : 'Unknown error')
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}