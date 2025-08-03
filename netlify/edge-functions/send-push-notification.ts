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

    // Embedded encrypted env-style credentials (XOR encrypted)
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
    
    // Decrypt and parse env-style format
    const decryptedEnvData = xorDecrypt(encryptedCredentials, encryptionKey)
    console.log('Decrypted env data length:', decryptedEnvData.length)
    
    // Debug the raw decrypted data around the private key
    const privateKeyStartIndex = decryptedEnvData.indexOf('FIREBASE_PRIVATE_KEY=')
    if (privateKeyStartIndex !== -1) {
      const privateKeySection = decryptedEnvData.substring(privateKeyStartIndex, privateKeyStartIndex + 500)
      console.log('Private key section from env:', privateKeySection)
    }
    
    // Parse env-style format into object - handle multiline values
    const firebaseCredentials: any = {}
    const lines = decryptedEnvData.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() && line.includes('=')) {
        const [key, ...valueParts] = line.split('=')
        let value = valueParts.join('=').trim()
        
        // For private key, collect all lines until we hit the next key or end
        if (key.trim() === 'FIREBASE_PRIVATE_KEY') {
          // Keep adding lines until we find another key= or reach the end
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j]
            if (nextLine.includes('=') && nextLine.match(/^[A-Z_]+=/)) {
              // Found next key, stop here
              break
            }
            value += '\n' + nextLine
            i = j // Skip these lines in the main loop
          }
        }
        
        firebaseCredentials[key.trim()] = value
        
        if (key.trim() === 'FIREBASE_PRIVATE_KEY') {
          console.log(`Complete private key length: ${value.length}`)
          console.log(`Private key ends with: ${value.slice(-50)}`)
        }
      }
    }
    const privateKey = firebaseCredentials.FIREBASE_PRIVATE_KEY
    const clientEmail = firebaseCredentials.FIREBASE_CLIENT_EMAIL
    const projectId = firebaseCredentials.FIREBASE_PROJECT_ID

    console.log('Firebase credentials check:', {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      projectId,
      clientEmail: clientEmail?.substring(0, 20) + '...'
    })

    if (!privateKey || !clientEmail) {
      console.log('Missing Firebase credentials from decrypted env data')
      throw new Error('Missing Firebase credentials from decrypted env data')
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

    // Import crypto for JWT signing - properly handle PEM format
    const encoder = new TextEncoder()
    
    // Convert escaped newlines to actual newlines for proper PEM format
    const normalizedKey = privateKey.replace(/\\n/g, '\n')
    console.log('Normalized PEM key length:', normalizedKey.length)
    
    // Extract the base64 portion from the PEM (between headers)
    console.log('Before base64 extraction, key contains BEGIN:', normalizedKey.includes('-----BEGIN PRIVATE KEY-----'))
    console.log('Before base64 extraction, key contains END:', normalizedKey.includes('-----END PRIVATE KEY-----'))
    
    const withoutBegin = normalizedKey.replace(/-----BEGIN PRIVATE KEY-----/, '')
    console.log('After removing BEGIN, length:', withoutBegin.length)
    
    const withoutEnd = withoutBegin.replace(/-----END PRIVATE KEY-----/, '')
    console.log('After removing END, length:', withoutEnd.length)
    
    const base64Key = withoutEnd.replace(/\s/g, '') // Remove all whitespace including newlines
    
    console.log('Final base64 key length:', base64Key.length)
    console.log('Base64 key first 50:', base64Key.substring(0, 50))
    console.log('Base64 key last 50:', base64Key.substring(base64Key.length - 50))
    
    // Check for invalid base64 characters
    const validBase64Chars = /^[A-Za-z0-9+/=]*$/
    const isValidBase64 = validBase64Chars.test(base64Key)
    console.log('Is valid base64:', isValidBase64)
    
    let finalBase64Key = base64Key
    if (!isValidBase64) {
      const invalidChars = [...base64Key.matchAll(/[^A-Za-z0-9+/=]/g)]
      console.log('Found invalid base64 characters at positions:', invalidChars.map(match => ({ char: match[0], index: match.index, charCode: match[0].charCodeAt(0) })))
      
      // Clean the base64 by removing invalid characters
      finalBase64Key = base64Key.replace(/[^A-Za-z0-9+/=]/g, '')
      console.log('Cleaned base64 length:', finalBase64Key.length)
      console.log('Cleaned vs original length diff:', base64Key.length - finalBase64Key.length)
    }
    
    // Convert base64 to binary
    const binaryString = atob(finalBase64Key)
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