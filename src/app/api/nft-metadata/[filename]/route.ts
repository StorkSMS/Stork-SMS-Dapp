import { NextRequest, NextResponse } from 'next/server'
import { r2Client, BUCKET_NAME } from '@/lib/r2-storage'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    
    // Construct the R2 key for metadata files
    const key = `uploads/${filename}`
    
    if (!r2Client) {
      return NextResponse.json(
        { error: 'R2 storage not configured' },
        { status: 503 }
      )
    }
    
    // Get the file from R2
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
    
    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return NextResponse.json(
        { error: 'Metadata not found' },
        { status: 404 }
      )
    }
    
    // Convert stream to string
    const bodyString = await response.Body.transformToString()
    
    // Parse and return as JSON with proper headers
    const metadata = JSON.parse(bodyString)
    
    return NextResponse.json(metadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*', // Allow CORS
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
    
  } catch (error) {
    console.error('Error serving NFT metadata:', error)
    return NextResponse.json(
      { error: 'Failed to load metadata' },
      { status: 500 }
    )
  }
}