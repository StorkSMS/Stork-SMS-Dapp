'use client'

import { useState, useEffect, useCallback } from 'react'

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
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot subscribe: notifications not supported or permission not granted')
      return null
    }

    setIsSubscribing(true)

    try {
      const registration = await navigator.serviceWorker.ready
      
      // VAPID public key (you'll need to generate this and store it in env)
      // For now, using a placeholder - you'll need to generate a real one
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
        'BKd0F0yPUYhGfNhJe-kEHhKETpHfNfFfDmfrFmT-h-3CqbAXfXezOkZb5JSKFRVWjNqPy1rXHtkcHNqnZTCIyqc'
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey)
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })
      
      const subData = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!)))
        }
      }
      
      setSubscription(subData)
      
      // TODO: Send subscription to your backend
      // await sendSubscriptionToBackend(subData)
      
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
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        renotify: true,
        data: {
          url: '/',
          timestamp: Date.now()
        }
      })
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