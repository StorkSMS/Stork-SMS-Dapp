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

    // Prepare Firebase Admin request - decrypt embedded credentials
    const encryptionKey = Deno.env.get('FIREBASE_ENCRYPTION_KEY')
    if (!encryptionKey) {
      console.log('Missing Firebase encryption key')
      throw new Error('Missing Firebase encryption key')
    }

    // Embedded encrypted credentials (XOR encrypted)
    const encryptedCredentials = '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'
    
    // Simple XOR decryption
    function xorDecrypt(encryptedBase64: string, key: string): string {
      const encrypted = atob(encryptedBase64)
      let result = ''
      for (let i = 0; i < encrypted.length; i++) {
        result += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return result
    }
    
    const decryptedB64 = xorDecrypt(encryptedCredentials, encryptionKey)
    const firebaseCredentials = JSON.parse(atob(decryptedB64))
    const privateKey = firebaseCredentials.private_key
    const clientEmail = firebaseCredentials.client_email
    const projectId = firebaseCredentials.project_id

    console.log('Firebase credentials check:', {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      projectId,
      clientEmail: clientEmail?.substring(0, 20) + '...'
    })

    if (!privateKey || !clientEmail) {
      console.log('Missing Firebase credentials from decrypted JSON')
      throw new Error('Missing Firebase credentials from decrypted JSON')
    }

    // Create JWT for Firebase Admin
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

    // Import crypto for JWT signing
    const encoder = new TextEncoder()
    
    // Debug the private key format
    console.log('Raw private key length:', privateKey.length)
    console.log('Private key starts with:', privateKey.substring(0, 50))
    
    // Replace escaped newlines with actual newlines first, then remove headers and newlines
    const normalizedKey = privateKey.replace(/\\n/g, '\n')
    console.log('Normalized key starts with:', normalizedKey.substring(0, 50))
    
    const keyData = normalizedKey.replace(/-----BEGIN PRIVATE KEY-----|\-----END PRIVATE KEY-----|\n|\r|\s/g, '')
    console.log('Clean key data length:', keyData.length)
    console.log('Clean key data starts with:', keyData.substring(0, 50))
    
    // Validate base64 before decoding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    if (!base64Regex.test(keyData)) {
      console.log('Invalid base64 characters found in key data')
      throw new Error('Invalid base64 format in private key')
    }
    
    const keyBytes = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
    
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
    
    const jwt = `${signatureInput}.${signatureB64}`

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    })

    const { access_token } = await tokenResponse.json()

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

    // Send FCM notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription: any) => {
      try {
        // Extract FCM token from endpoint or use p256dh field
        let fcmToken = subscription.p256dh
        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          fcmToken = subscription.endpoint.split('/').pop() || subscription.p256dh
        }

        // Send via Firebase Cloud Messaging API
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
              tag: notificationPayload.tag,
              renotify: true,
              requireInteraction: false
            }
          }
        }

        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message })
        })

        const result = await response.json()
        console.log('FCM notification sent successfully:', result)
        return { success: true, endpoint: subscription.endpoint, result }
      } catch (error: any) {
        console.error('Error sending FCM notification:', error)
        
        // If token is invalid, remove subscription
        if (error.message?.includes('registration-token-not-registered') || 
            error.message?.includes('invalid-registration-token')) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
        }
        
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}