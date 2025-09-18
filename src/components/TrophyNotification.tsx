"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { Trophy } from "lucide-react"

export interface TrophyNotificationData {
  id: string
  title: string
  type: 'platinum' | 'gold' | 'silver' | 'bronze'
}

interface TrophyNotificationProps {
  notification: TrophyNotificationData | null
  onComplete: () => void
  isDarkMode?: boolean
}

const TrophyNotification: React.FC<TrophyNotificationProps> = ({
  notification,
  onComplete,
  isDarkMode = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isSliding, setIsSliding] = useState(false)

  const colors = {
    text: isDarkMode ? '#FFF' : '#000',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  useEffect(() => {
    if (!notification) {
      setIsVisible(false)
      return
    }

    // Start slide in animation
    setIsVisible(true)
    setIsSliding(true)

    // Animation timing
    const slideInTimer = setTimeout(() => {
      setIsSliding(false)
    }, 500) // 0.5s slide in

    // Display timer (5 seconds total)
    const displayTimer = setTimeout(() => {
      // Start slide out
      setIsSliding(true)

      // Complete slide out and cleanup
      setTimeout(() => {
        setIsVisible(false)
        setIsSliding(false)
        onComplete()
      }, 500) // 0.5s slide out
    }, 5000) // 5s display time

    return () => {
      clearTimeout(slideInTimer)
      clearTimeout(displayTimer)
    }
  }, [notification, onComplete])

  const getTrophyImagePath = (trophyType: string) => {
    const typeMap: { [key: string]: string } = {
      'bronze': 'bronze2',
      'silver': 'silver',
      'gold': 'gold',
      'platinum': 'platinum'
    }
    return `/Trophies/${typeMap[trophyType.toLowerCase()]}.png`
  }

  if (!notification || !isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] transition-transform duration-500 ease-in-out ${
        isSliding ? 'translate-x-full' : 'translate-x-0'
      }`}
      style={{
        width: '320px',
        height: '100px'
      }}
    >
      {/* Paper texture background */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundImage: 'url(/Nft-Build-Images/Recipient NFT/Paper-Texture (position bottom right).png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.8
        }}
      />

      {/* Content */}
      <div
        className="relative w-full h-full flex items-center gap-4 px-4 py-3 rounded-lg"
        style={{
          backgroundColor: isDarkMode ? 'rgba(14, 14, 14, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          border: `2px solid ${colors.text}`,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Trophy Icon */}
        <div className="flex-shrink-0">
          <Image
            src={getTrophyImagePath(notification.type)}
            alt={`${notification.type} trophy`}
            width={48}
            height={48}
            style={{
              imageRendering: 'pixelated',
              filter: 'none'
            }}
            unoptimized
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-sm mb-1"
            style={{ color: colors.text }}
          >
            Trophy Unlocked!
          </div>
          <div
            className="text-sm font-medium truncate"
            style={{ color: colors.text }}
          >
            {notification.title}
          </div>
          <div
            className="text-xs capitalize"
            style={{ color: colors.textSecondary }}
          >
            {notification.type} Trophy
          </div>
        </div>

        {/* Accent Trophy Icon */}
        <div className="flex-shrink-0">
          <Trophy
            size={20}
            style={{ color: colors.textSecondary }}
          />
        </div>
      </div>
    </div>
  )
}

export default TrophyNotification