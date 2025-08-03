'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationManager() {
  const { walletAddress, isAuthenticated } = useAuth()
  const { isSupported, permission, subscribe, subscription } = usePushNotifications()
  const lastWalletAddress = useRef<string | null>(null)

  useEffect(() => {
    // Auto-subscribe when user is authenticated (refresh on every wallet connection)
    if (
      isAuthenticated && 
      walletAddress && 
      isSupported && 
      permission !== 'denied' &&
      lastWalletAddress.current !== walletAddress // Only trigger if wallet changed
    ) {
      lastWalletAddress.current = walletAddress
      
      // Automatically request permission and subscribe
      const setupPushNotifications = async () => {
        try {
          console.log('🔄 Refreshing push notifications for wallet:', walletAddress)
          
          // First, clean up any existing subscriptions for this wallet
          await cleanupExistingSubscriptions(walletAddress)
          
          // Check current permission state
          let currentPermission = Notification.permission
          
          // If permission hasn't been requested yet, request it
          if (currentPermission === 'default') {
            currentPermission = await Notification.requestPermission()
          }
          
          // If granted, subscribe to push notifications
          if (currentPermission === 'granted') {
            const sub = await subscribe()
            
            if (sub && walletAddress) {
              // Send fresh subscription to backend
              await savePushSubscription(walletAddress, sub)
              console.log('✅ Fresh push notification subscription created for wallet:', walletAddress)
            }
          }
        } catch (error) {
          console.error('Error setting up push notifications:', error)
        }
      }
      
      // Small delay to ensure service worker is ready
      setTimeout(setupPushNotifications, 1000)
    }
  }, [isAuthenticated, walletAddress, isSupported, subscription, permission, subscribe])

  // Save subscription when it changes
  useEffect(() => {
    if (subscription && walletAddress) {
      savePushSubscription(walletAddress, subscription)
    }
  }, [subscription, walletAddress])

  return null // This component doesn't render anything
}

async function cleanupExistingSubscriptions(walletAddress: string) {
  try {
    console.log('🧹 Cleaning up existing subscriptions for wallet:', walletAddress)
    const response = await fetch('/api/push-subscription/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress
      }),
    })

    if (response.ok) {
      console.log('✅ Existing subscriptions cleaned up')
    }
  } catch (error) {
    console.error('Error cleaning up existing subscriptions:', error)
  }
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