'use client'

import { useState, useEffect, useCallback } from 'react'
import { messaging, getToken, onMessage } from '@/lib/firebase'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Check if push notifications are supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window
      
      setIsSupported(supported)
      
      if (supported && Notification.permission) {
        setPermission(Notification.permission)
      }
    }
  }, [])

  // Get current subscription
  useEffect(() => {
    if (isSupported) {
      getSubscription()
    }
  }, [isSupported])

  const getSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      
      if (sub) {
        const subData = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!)))
          }
        }
        setSubscription(subData)
      }
    } catch (error) {
      console.error('Error getting push subscription:', error)
    }
  }

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Push notifications are not supported')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted' || !messaging) {
      console.warn('Cannot subscribe: notifications not supported, permission not granted, or messaging unavailable')
      return null
    }

    setIsSubscribing(true)

    try {
      // Get FCM token using Firebase SDK (force refresh to avoid stale tokens)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidPublicKey) {
        console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable is required')
        return null
      }

      // Force refresh to get a fresh token and avoid duplicates
      const token = await getToken(messaging, {
        vapidKey: vapidPublicKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      })

      if (!token) {
        console.error('Failed to get FCM token')
        return null
      }

      console.log('FCM Token generated:', token)
      console.log('Token length:', token.length)
      console.log('Token starts with:', token.substring(0, 20) + '...')

      // Create subscription object with proper v1 format
      // Store the raw FCM token in p256dh field for v1 API compatibility
      const subData = {
        endpoint: token, // Store raw FCM token for v1 API
        keys: {
          p256dh: token, // Also store here for compatibility
          auth: btoa(String(Date.now())) // Generate unique auth for this subscription
        }
      }
      
      setSubscription(subData)
      
      // Send subscription to backend
      const walletAddress = window.localStorage.getItem('wallet_address')
      if (walletAddress) {
        try {
          const response = await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress,
              subscription: subData,
              fcmToken: token // Add FCM token for proper backend handling
            })
          })
          
          if (!response.ok) {
            console.error('Failed to save subscription to backend')
          }
        } catch (error) {
          console.error('Error saving subscription to backend:', error)
        }
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload)
        // Handle foreground messages if needed
      })
      
      return subData
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return null
    } finally {
      setIsSubscribing(false)
    }
  }, [isSupported, permission])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !subscription) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      
      if (sub) {
        await sub.unsubscribe()
        
        // Remove subscription from backend
        if (subscription) {
          await fetch('/api/push-subscription', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              walletAddress: window.localStorage.getItem('wallet_address'),
              endpoint: subscription.endpoint
            })
          })
        }
        
        setSubscription(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }, [isSupported, subscription])

  // Test notification (for development)
  const sendTestNotification = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot send test notification')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Show notification directly (for testing)
      await registration.showNotification('Test Notification', {
        body: 'This is a test notification from Stork SMS',
        icon: '/stork-app-icon.png',
        badge: '/stork-app-icon.png',
        tag: 'test-notification',
        renotify: true,
        data: {
          url: '/',
          timestamp: Date.now()
        }
      } as NotificationOptions)
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }, [isSupported, permission])

  return {
    isSupported,
    permission,
    subscription,
    isSubscribing,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  
  return outputArray
}