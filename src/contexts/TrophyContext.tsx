"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import type { TrophyStats } from "@/types/trophies"
import type { TrophyNotificationData } from "@/components/TrophyNotification"

interface TrophyContextType {
  currentStats: TrophyStats | null
  pendingNotifications: TrophyNotificationData[]
  updateTrophyStats: (newStats: TrophyStats, skipNotifications?: boolean) => void
  clearNotifications: () => void
  addNotification: (notification: TrophyNotificationData) => void
  isLoading: boolean
}

const TrophyContext = createContext<TrophyContextType | undefined>(undefined)

export const useTrophy = () => {
  const context = useContext(TrophyContext)
  if (context === undefined) {
    throw new Error('useTrophy must be used within a TrophyProvider')
  }
  return context
}

interface TrophyProviderProps {
  children: React.ReactNode
}

export const TrophyProvider: React.FC<TrophyProviderProps> = ({ children }) => {
  const [currentStats, setCurrentStats] = useState<TrophyStats | null>(null)
  const [previousStats, setPreviousStats] = useState<TrophyStats | null>(null)
  const [pendingNotifications, setPendingNotifications] = useState<TrophyNotificationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const { publicKey, connected } = useWallet()

  // Load previous stats from localStorage
  useEffect(() => {
    if (!connected || !publicKey) {
      setCurrentStats(null)
      setPreviousStats(null)
      setIsInitialized(false)
      return
    }

    const walletKey = publicKey.toString()
    const stored = localStorage.getItem(`trophy_stats_${walletKey}`)

    if (stored) {
      try {
        const parsedStats = JSON.parse(stored)
        setPreviousStats(parsedStats)
        setCurrentStats(parsedStats)
        setIsInitialized(true)
      } catch (error) {
        console.error('Error parsing stored trophy stats:', error)
        setPreviousStats(null)
        setIsInitialized(false)
      }
    } else {
      setPreviousStats(null)
      setIsInitialized(false)
    }
  }, [connected, publicKey])

  // Save current stats to localStorage whenever they change
  useEffect(() => {
    if (!connected || !publicKey || !currentStats) return

    const walletKey = publicKey.toString()
    localStorage.setItem(`trophy_stats_${walletKey}`, JSON.stringify(currentStats))
  }, [currentStats, connected, publicKey])

  // Helper function to get trophy achievements
  const getTrophyAchievements = (stats: TrophyStats) => {
    const achievements: TrophyNotificationData[] = []

    // Early Adopter (Platinum)
    if (stats.earlyAdopterCount >= 3) {
      achievements.push({
        id: 'early-adopter',
        title: 'Early Adopter',
        type: 'platinum'
      })
    }

    // Onboarder trophies (all achieved tiers)
    if (stats.onboarderCount >= 1) {
      achievements.push({
        id: 'onboarder-bronze',
        title: 'Onboarder',
        type: 'bronze'
      })
    }
    if (stats.onboarderCount >= 10) {
      achievements.push({
        id: 'onboarder-silver',
        title: 'Silver Onboarder',
        type: 'silver'
      })
    }
    if (stats.onboarderCount >= 25) {
      achievements.push({
        id: 'onboarder-gold',
        title: 'Gold Onboarder',
        type: 'gold'
      })
    }
    if (stats.onboarderCount >= 50) {
      achievements.push({
        id: 'onboarder-platinum',
        title: 'Master Onboarder',
        type: 'platinum'
      })
    }

    // Chatter Box trophies (all achieved tiers)
    if (stats.chatterBoxCount >= 5) {
      achievements.push({
        id: 'chatterbox-bronze',
        title: 'Chatter Box',
        type: 'bronze'
      })
    }
    if (stats.chatterBoxCount >= 15) {
      achievements.push({
        id: 'chatterbox-silver',
        title: 'Silver Chatter',
        type: 'silver'
      })
    }
    if (stats.chatterBoxCount >= 30) {
      achievements.push({
        id: 'chatterbox-gold',
        title: 'Gold Chatter',
        type: 'gold'
      })
    }
    if (stats.chatterBoxCount >= 100) {
      achievements.push({
        id: 'chatterbox-platinum',
        title: 'Master Chatter',
        type: 'platinum'
      })
    }

    // Fledgling (Bronze)
    if (stats.chatterBoxCount >= 1) {
      achievements.push({
        id: 'fledgling',
        title: 'Fledgling',
        type: 'bronze'
      })
    }

    // Tweeter (Bronze)
    if (stats.tweeterCount >= 1) {
      achievements.push({
        id: 'tweeter',
        title: 'Tweeter',
        type: 'bronze'
      })
    }

    // Sticker Collector (Bronze)
    if (stats.stickerCollectorCount >= 1) {
      achievements.push({
        id: 'sticker-collector',
        title: 'Sticker Collector',
        type: 'bronze'
      })
    }

    // Can you hear me (Bronze)
    if (stats.canYouHearMeCount >= 1) {
      achievements.push({
        id: 'can-you-hear-me',
        title: 'Can you hear me?',
        type: 'bronze'
      })
    }

    // Look at this (Bronze)
    if (stats.lookAtThisCount >= 1) {
      achievements.push({
        id: 'look-at-this',
        title: 'Look at this',
        type: 'bronze'
      })
    }

    // Future Millionaire (Silver)
    if (stats.futureMillionaireCount >= 1) {
      achievements.push({
        id: 'future-millionaire',
        title: 'Future Millionaire',
        type: 'silver'
      })
    }

    return achievements
  }

  const updateTrophyStats = useCallback((newStats: TrophyStats, skipNotifications = false) => {
    const previous = previousStats || {
      earlyAdopterCount: 0,
      onboarderCount: 0,
      chatterBoxCount: 0,
      fledglingCount: 0,
      tweeterCount: 0,
      stickerCollectorCount: 0,
      canYouHearMeCount: 0,
      lookAtThisCount: 0,
      futureMillionaireCount: 0
    }

    // Only check for new achievements if this is not initialization and notifications aren't skipped
    if (isInitialized && !skipNotifications) {
      const currentAchievements = getTrophyAchievements(previous)
      const newAchievements = getTrophyAchievements(newStats)

      // Find newly unlocked trophies
      const newlyUnlocked = newAchievements.filter(newTrophy =>
        !currentAchievements.some(currentTrophy => currentTrophy.id === newTrophy.id)
      )

      // Add notifications for newly unlocked trophies
      if (newlyUnlocked.length > 0) {
        setPendingNotifications(prev => [...prev, ...newlyUnlocked])
      }
    }

    setCurrentStats(newStats)
    setPreviousStats(newStats)

    // Mark as initialized after first update
    if (!isInitialized) {
      setIsInitialized(true)
    }
  }, [previousStats, isInitialized])

  const clearNotifications = useCallback(() => {
    setPendingNotifications([])
  }, [])

  const addNotification = useCallback((notification: TrophyNotificationData) => {
    setPendingNotifications(prev => [...prev, notification])
  }, [])

  const value: TrophyContextType = {
    currentStats,
    pendingNotifications,
    updateTrophyStats,
    clearNotifications,
    addNotification,
    isLoading
  }

  return (
    <TrophyContext.Provider value={value}>
      {children}
    </TrophyContext.Provider>
  )
}

export default TrophyProvider