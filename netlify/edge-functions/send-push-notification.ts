import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export default async (request: Request, context: any) => {
  console.log('Edge Function called with method:', request.method)
  
  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { recipientWallet, senderWallet, messagePreview, chatId } = await request.json()
    console.log('Edge Function received data:', { recipientWallet, senderWallet, messagePreview, chatId })

    if (!recipientWallet) {
      console.log('Missing recipientWallet')
      return new Response(
        JSON.stringify({ error: 'Recipient wallet required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all push subscriptions for the recipient
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('wallet_address', recipientWallet)

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push subscriptions found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found subscriptions:', subscriptions.length)

    // Get encrypted private key and decrypt it (much smaller than full JSON)
    const encryptedKey = Deno.env.get('FIREBASE_ENCRYPTED_KEY')
    const encryptionPassword = Deno.env.get('FIREBASE_ENCRYPTION_PASSWORD')
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL')
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')

    if (!encryptedKey || !encryptionPassword || !clientEmail || !projectId) {
      console.log('Missing Firebase credentials')
      throw new Error('Missing Firebase credentials')
    }

    console.log('Using Firebase project:', projectId)

    // Simple XOR decrypt just the private key
    function xorDecrypt(encryptedBase64: string, password: string): string {
      const encrypted = atob(encryptedBase64)
      let result = ''
      for (let i = 0; i < encrypted.length; i++) {
        result += String.fromCharCode(encrypted.charCodeAt(i) ^ password.charCodeAt(i % password.length))
      }
      return result
    }

    const privateKey = xorDecrypt(encryptedKey, encryptionPassword)
    console.log('Decrypted private key length:', privateKey.length)

    // Create access token using the decrypted private key
    const jwt = await createFirebaseJWT(privateKey, clientEmail)
    const accessToken = await getFirebaseAccessToken(jwt)

async function createFirebaseJWT(privateKey: string, clientEmail: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  }

  const encoder = new TextEncoder()
  const normalizedKey = privateKey.replace(/\\n/g, '\n')
  
  // Extract base64 and add padding
  const base64Key = normalizedKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  
  const paddedKey = base64Key + '='.repeat((4 - base64Key.length % 4) % 4)
  const binaryString = atob(paddedKey)
  const keyBytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    keyBytes[i] = binaryString.charCodeAt(i)
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const headerB64 = btoa(JSON.stringify(header)).replace(/[+/=]/g, m => ({'+':'-','/':'_','=':''})[m]!)
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/[+/=]/g, m => ({'+':'-','/':'_','=':''})[m]!)
  const signatureInput = `${headerB64}.${payloadB64}`
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  )
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/[+/=]/g, m => ({'+':'-','/':'_','=':''})[m]!)
  
  return `${signatureInput}.${signatureB64}`
}

async function getFirebaseAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  const { access_token } = await response.json()
  if (!access_token) {
    throw new Error('Failed to get Firebase access token')
  }
  return access_token
}

    // Prepare notification payload
    const notificationPayload = {
      title: 'New Message',
      body: messagePreview || 'You have a new message',
      icon: '/stork-app-icon.png',
      badge: '/stork-app-icon.png',
      tag: `message-${chatId || Date.now()}`,
      data: {
        url: chatId ? `/chat/${chatId}` : '/',
        chatId,
        senderWallet,
        timestamp: Date.now()
      }
    }

    // Send FCM notifications to all subscriptions using legacy FCM API (much simpler!)
    const sendPromises = subscriptions.map(async (subscription: any) => {
      try {
        // Extract FCM token from endpoint or use p256dh field
        let fcmToken = subscription.p256dh
        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          fcmToken = subscription.endpoint.split('/').pop() || subscription.p256dh
        }

        console.log('Sending to FCM token:', fcmToken?.substring(0, 20) + '...')

        // Use FCM v1 API with proper authentication
        const message = {
          token: fcmToken,
          notification: {
            title: notificationPayload.title,
            body: notificationPayload.body,
            icon: notificationPayload.icon
          },
          data: {
            url: notificationPayload.data?.url || '/',
            chatId: notificationPayload.data?.chatId || '',
            senderWallet: notificationPayload.data?.senderWallet || '',
            timestamp: String(notificationPayload.data?.timestamp || Date.now())
          },
          webpush: {
            notification: {
              icon: notificationPayload.icon,
              badge: notificationPayload.badge,
              tag: notificationPayload.tag
            }
          }
        }

        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message })
        })

        const result = await response.json()
        console.log('FCM response:', response.status, result)
        
        if (response.ok) {
          return { success: true, endpoint: subscription.endpoint, result }
        } else {
          console.error('FCM error:', result)
          return { success: false, endpoint: subscription.endpoint, error: result }
        }
      } catch (error: any) {
        console.error('Error sending FCM notification:', error)
        return { success: false, endpoint: subscription.endpoint, error: error.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.success).length

    return new Response(JSON.stringify({ 
      success: true,
      sent: successCount,
      total: subscriptions.length,
      results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Push notification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}