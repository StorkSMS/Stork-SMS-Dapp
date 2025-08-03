'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuth } from '@/contexts/AuthContext'

export default function DebugNotificationsPage() {
  const { walletAddress, isAuthenticated } = useAuth()
  const pushNotifications = usePushNotifications()
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        // Auth state
        walletAddress,
        isAuthenticated,
        
        // Push notification state
        isSupported: pushNotifications.isSupported,
        permission: pushNotifications.permission,
        hasSubscription: !!pushNotifications.subscription,
        isSubscribing: pushNotifications.isSubscribing,
        
        // Browser state
        notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        
        // Current subscription
        currentSubscription: pushNotifications.subscription,
        
        // Environment
        vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20) + '...',
      })
    }

    updateDebugInfo()
    const interval = setInterval(updateDebugInfo, 1000)
    return () => clearInterval(interval)
  }, [walletAddress, isAuthenticated, pushNotifications])

  const handleEnableNotifications = async () => {
    try {
      console.log('Requesting permission...')
      const granted = await pushNotifications.requestPermission()
      console.log('Permission granted:', granted)
      
      if (granted) {
        console.log('Subscribing to push notifications...')
        const sub = await pushNotifications.subscribe()
        console.log('Subscription result:', sub)
      }
    } catch (error) {
      console.error('Error enabling notifications:', error)
    }
  }

  const handleTestNotification = () => {
    pushNotifications.sendTestNotification()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Push Notification Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Debug Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-4">
              <button
                onClick={handleEnableNotifications}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                disabled={pushNotifications.isSubscribing}
              >
                {pushNotifications.isSubscribing ? 'Enabling...' : 'Enable Notifications'}
              </button>
              
              <button
                onClick={handleTestNotification}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={pushNotifications.permission !== 'granted'}
              >
                Send Test Notification
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Debug Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Check if wallet is connected and authenticated</li>
            <li>Verify push notification support in browser</li>
            <li>Check current permission state</li>
            <li>Click "Enable Notifications" to trigger manual setup</li>
            <li>Open browser DevTools to see console logs</li>
            <li>Check if new subscription appears in debug info</li>
          </ol>
        </div>

        {/* Clear Cache Instructions */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">If notifications aren't working:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open DevTools (F12)</li>
            <li>Go to Application → Storage → Clear site data</li>
            <li>Or: Application → Service Workers → Unregister</li>
            <li>Reload the page</li>
            <li>Try enabling notifications again</li>
          </ol>
        </div>
      </div>
    </div>
  )
}