import { NextRequest, NextResponse } from 'next/server'

// Redirect to Edge Function for better environment variable handling

export async function POST(request: NextRequest) {
  // Forward to Edge Function which has better environment variable handling
  const body = await request.text()
  
  const edgeResponse = await fetch(new URL('/.netlify/edge-functions/send-push-notification', request.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  const result = await edgeResponse.text()
  
  return new NextResponse(result, {
    status: edgeResponse.status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}