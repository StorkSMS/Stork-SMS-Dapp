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
    const keyData = privateKey.replace(/-----BEGIN PRIVATE KEY-----|\-----END PRIVATE KEY-----|\n/g, '')
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