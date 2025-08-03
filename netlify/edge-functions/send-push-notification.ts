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

    // Prepare Firebase Admin request - decrypt credentials from file
    const encryptionKey = Deno.env.get('FIREBASE_ENCRYPTION_KEY')
    if (!encryptionKey) {
      console.log('Missing Firebase encryption key')
      throw new Error('Missing Firebase encryption key')
    }

    // Read encrypted credentials file
    const credentialsPath = new URL('./firebase-credentials.enc', import.meta.url)
    const encryptedCredentials = await Deno.readTextFile(credentialsPath)
    
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