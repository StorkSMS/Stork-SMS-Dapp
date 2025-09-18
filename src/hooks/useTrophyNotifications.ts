"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useTrophy } from "@/contexts/TrophyContext"
import type { TrophyNotificationData } from "@/components/TrophyNotification"

interface UseTrophyNotificationsReturn {
  currentNotification: TrophyNotificationData | null
  hasNotifications: boolean
  checkForTrophyUpdates: () => Promise<void>
  dismissCurrentNotification: () => void
}

export const useTrophyNotifications = (): UseTrophyNotificationsReturn => {
  const [currentNotification, setCurrentNotification] = useState<TrophyNotificationData | null>(null)
  const [notificationQueue, setNotificationQueue] = useState<TrophyNotificationData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const initializedRef = useRef<string | null>(null)

  const { publicKey, connected } = useWallet()
  const { pendingNotifications, updateTrophyStats, clearNotifications } = useTrophy()

  // Create ref after updateTrophyStats is available
  const updateTrophyStatsRef = useRef(updateTrophyStats)

  // Keep ref updated
  updateTrophyStatsRef.current = updateTrophyStats

  // Process notification queue
  useEffect(() => {
    if (isProcessing || currentNotification) return

    // Update queue with pending notifications
    if (pendingNotifications.length > 0) {
      setNotificationQueue(prev => {
        const combined = [...prev, ...pendingNotifications]
        // Remove duplicates based on ID
        const unique = combined.filter((notification, index, self) =>
          index === self.findIndex(n => n.id === notification.id)
        )
        return unique
      })
      clearNotifications()
    }

    // Show next notification if available
    if (notificationQueue.length > 0 && !currentNotification) {
      setIsProcessing(true)
      const nextNotification = notificationQueue[0]
      setCurrentNotification(nextNotification)
      setNotificationQueue(prev => prev.slice(1))
    }
  }, [pendingNotifications, notificationQueue, currentNotification, isProcessing, clearNotifications])

  const dismissCurrentNotification = useCallback(() => {
    setCurrentNotification(null)
    setIsProcessing(false)

    // Wait 1 second before showing next notification
    if (notificationQueue.length > 0) {
      setTimeout(() => {
        setIsProcessing(false)
      }, 1000)
    }
  }, [notificationQueue.length])

  const checkForTrophyUpdates = useCallback(async () => {
    if (!connected || !publicKey) return

    try {
      const response = await fetch(`/api/trophies?wallet=${publicKey.toString()}`)
      const data = await response.json()

      if (data.success) {
        updateTrophyStatsRef.current(data.stats)
      } else {
        console.error('Failed to fetch trophy stats:', data.error)
      }
    } catch (error) {
      console.error('Error checking trophy updates:', error)
    }
  }, [connected, publicKey])

  // Initialize trophy state on wallet connection but don't trigger notifications
  useEffect(() => {
    if (connected && publicKey) {
      const walletKey = publicKey.toString()

      // Only initialize if we haven't already for this wallet
      if (initializedRef.current === walletKey) {
        return
      }

      // Silently fetch current trophy state without triggering notifications
      const initializeTrophyState = async () => {
        try {
          const response = await fetch(`/api/trophies?wallet=${walletKey}`)
          const data = await response.json()

          if (data.success) {
            // Always skip notifications on initial load
            updateTrophyStatsRef.current(data.stats, true)
            initializedRef.current = walletKey
          }
        } catch (error) {
          console.error('Error initializing trophy state:', error)
        }
      }

      initializeTrophyState()
    } else {
      // Reset initialization when wallet disconnects
      initializedRef.current = null
    }
  }, [connected, publicKey])

  return {
    currentNotification,
    hasNotifications: notificationQueue.length > 0 || pendingNotifications.length > 0,
    checkForTrophyUpdates,
    dismissCurrentNotification
  }
}