import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import admin from 'firebase-admin'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: "stork-sms-560b2",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com"
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: 'stork-sms-560b2'
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // This should be called by your backend when a new message arrives
    const { recipientWallet, senderWallet, messagePreview, chatId } = await request.json()

    if (!recipientWallet) {
      return NextResponse.json(
        { error: 'Recipient wallet required' },
        { status: 400 }
      )
    }

    // Get all push subscriptions for the recipient
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('wallet_address', recipientWallet)

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { message: 'No push subscriptions found' },
        { status: 200 }
      )
    }

    // Prepare notification payload
    const notificationPayload = {
      title: 'New Message',
      body: messagePreview || 'You have a new message',
      icon: '/stork-app-icon.png',
      badge: '/stork-app-icon.png',
      tag: `message-${chatId || Date.now()}`,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: {
        url: chatId ? `/chat/${chatId}` : '/',
        chatId,
        senderWallet,
        timestamp: Date.now()
      }
    }

    // Send FCM notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        // Extract FCM token from endpoint or use p256dh field
        let fcmToken = subscription.p256dh
        if (subscription.endpoint.includes('fcm.googleapis.com')) {
          fcmToken = subscription.endpoint.split('/').pop() || subscription.p256dh
        }

        // Send via Firebase Admin SDK
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
              renotify: notificationPayload.renotify,
              requireInteraction: notificationPayload.requireInteraction
            }
          }
        }

        const response = await admin.messaging().send(message)
        console.log('FCM notification sent successfully:', response)
        return { success: true, endpoint: subscription.endpoint, response }
      } catch (error: any) {
        console.error('Error sending FCM notification:', error)
        
        // If token is invalid, remove subscription
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
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

    return NextResponse.json({ 
      success: true,
      sent: successCount,
      total: subscriptions.length,
      results
    })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}