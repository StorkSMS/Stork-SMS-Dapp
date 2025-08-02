'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationManager() {
  const { publicKey, isAuthenticated } = useAuth()
  const { isSupported, permission, subscribe, subscription } = usePushNotifications()
  const hasAttemptedSubscription = useRef(false)

  useEffect(() => {
    // Auto-subscribe when user is authenticated and hasn't subscribed yet
    if (
      isAuthenticated && 
      publicKey && 
      isSupported && 
      !subscription && 
      !hasAttemptedSubscription.current &&
      permission !== 'denied'
    ) {
      hasAttemptedSubscription.current = true
      
      // Automatically request permission and subscribe
      const setupPushNotifications = async () => {
        try {
          // Check current permission state
          let currentPermission = Notification.permission
          
          // If permission hasn't been requested yet, request it
          if (currentPermission === 'default') {
            currentPermission = await Notification.requestPermission()
          }
          
          // If granted, subscribe to push notifications
          if (currentPermission === 'granted') {
            const sub = await subscribe()
            
            if (sub && publicKey) {
              // Send subscription to backend
              await savePushSubscription(publicKey, sub)
            }
          }
        } catch (error) {
          console.error('Error setting up push notifications:', error)
        }
      }
      
      // Small delay to ensure service worker is ready
      setTimeout(setupPushNotifications, 1000)
    }
  }, [isAuthenticated, publicKey, isSupported, subscription, permission, subscribe])

  // Save subscription when it changes
  useEffect(() => {
    if (subscription && publicKey) {
      savePushSubscription(publicKey, subscription)
    }
  }, [subscription, publicKey])

  return null // This component doesn't render anything
}

async function savePushSubscription(walletAddress: string, subscription: any) {
  try {
    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        subscription
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to save push subscription')
    }

    console.log('Push subscription saved successfully')
  } catch (error) {
    console.error('Error saving push subscription:', error)
  }
}