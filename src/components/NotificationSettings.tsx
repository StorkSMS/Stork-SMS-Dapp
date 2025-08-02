'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { Bell, BellOff } from 'lucide-react'

interface NotificationSettingsProps {
  isDarkMode?: boolean
}

export default function NotificationSettings({ isDarkMode = false }: NotificationSettingsProps) {
  const {
    isSupported,
    permission,
    subscription,
    isSubscribing,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications()

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9'
  }

  const handleEnableNotifications = async () => {
    // First request permission
    const granted = await requestPermission()
    
    if (granted) {
      // Then subscribe to push notifications
      await subscribe()
    }
  }

  if (!isSupported) {
    return (
      <div 
        className="p-4 rounded-lg text-sm"
        style={{ 
          backgroundColor: colors.bgSecondary,
          color: colors.text 
        }}
      >
        Push notifications are not supported in your browser.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {subscription ? (
            <Bell className="w-5 h-5" style={{ color: colors.text }} />
          ) : (
            <BellOff className="w-5 h-5" style={{ color: colors.text }} />
          )}
          <div>
            <h3 
              className="font-medium"
              style={{ 
                fontFamily: "Helvetica Neue, sans-serif",
                color: colors.text 
              }}
            >
              Push Notifications
            </h3>
            <p 
              className="text-sm opacity-70"
              style={{ 
                fontFamily: "Helvetica Neue, sans-serif",
                color: colors.text 
              }}
            >
              {subscription 
                ? 'Notifications are enabled' 
                : permission === 'denied' 
                  ? 'Notifications are blocked in your browser'
                  : 'Get notified when you receive new messages'
              }
            </p>
          </div>
        </div>

        {permission !== 'denied' && (
          <Button
            onClick={subscription ? unsubscribe : handleEnableNotifications}
            disabled={isSubscribing}
            className="rounded-none h-10 hover:opacity-80"
            style={{ 
              fontFamily: "Helvetica Neue, sans-serif", 
              fontWeight: 500,
              backgroundColor: subscription ? colors.bg : '#3388FF',
              color: subscription ? colors.text : '#FFF',
              border: `2px solid ${subscription ? colors.border : '#3388FF'}`
            }}
          >
            {isSubscribing 
              ? 'Setting up...' 
              : subscription 
                ? 'Disable' 
                : 'Enable'
            }
          </Button>
        )}
      </div>

      {/* Test notification button (only in development) */}
      {process.env.NODE_ENV === 'development' && subscription && (
        <Button
          onClick={sendTestNotification}
          className="w-full rounded-none h-10 hover:opacity-80"
          style={{ 
            fontFamily: "Helvetica Neue, sans-serif", 
            fontWeight: 500,
            backgroundColor: colors.bgSecondary,
            color: colors.text,
            border: `2px solid ${colors.border}`
          }}
        >
          Send Test Notification
        </Button>
      )}

      {permission === 'denied' && (
        <p 
          className="text-sm opacity-70"
          style={{ 
            fontFamily: "Helvetica Neue, sans-serif",
            color: colors.text 
          }}
        >
          To enable notifications, you'll need to allow them in your browser settings.
        </p>
      )}
    </div>
  )
}