"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Trophy as TrophyIcon, Loader2 } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"
import type { TrophyData, Trophy, TrophyStats } from "@/types/trophies"


interface TrophiesModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
}

const TrophiesModal: React.FC<TrophiesModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [trophyStats, setTrophyStats] = useState<TrophyStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { publicKey, connected } = useWallet()

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Fetch trophy stats when modal opens and wallet is connected
  useEffect(() => {
    const fetchTrophyStats = async () => {
      if (!isOpen || !connected || !publicKey) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/trophies?wallet=${publicKey.toString()}`)
        const data = await response.json()

        if (data.success) {
          setTrophyStats(data.stats)
        } else {
          setError(data.error || 'Failed to fetch trophy data')
        }
      } catch (err) {
        console.error('Error fetching trophy stats:', err)
        setError('Failed to load trophy data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrophyStats()
  }, [isOpen, connected, publicKey])

  // Generate trophy data based on fetched stats
  const earlyAdopterAchieved = (trophyStats?.earlyAdopterCount || 0) >= 3
  const earlyAdopterCount = earlyAdopterAchieved ? 1 : 0

  // Onboarder trophy logic - multi-tier system
  const onboarderCount = trophyStats?.onboarderCount || 0
  const onboarderTier =
    onboarderCount >= 50 ? 'platinum' :
    onboarderCount >= 25 ? 'gold' :
    onboarderCount >= 10 ? 'silver' :
    onboarderCount >= 1 ? 'bronze' : null

  // Chatter Box trophy logic - multi-tier system
  const chatterBoxCount = trophyStats?.chatterBoxCount || 0
  const chatterBoxTier =
    chatterBoxCount >= 100 ? 'platinum' :
    chatterBoxCount >= 30 ? 'gold' :
    chatterBoxCount >= 15 ? 'silver' :
    chatterBoxCount >= 5 ? 'bronze' : null

  // Fledgling trophy logic - single bronze trophy (based on total chats)
  const fledglingAchieved = chatterBoxCount >= 1

  // Tweeter trophy logic - single bronze trophy
  const tweeterCount = trophyStats?.tweeterCount || 0
  const tweeterAchieved = tweeterCount >= 1

  // Sticker Collector trophy logic - single bronze trophy
  const stickerCollectorCount = trophyStats?.stickerCollectorCount || 0
  const stickerCollectorAchieved = stickerCollectorCount >= 1

  // Can you hear me trophy logic - single bronze trophy
  const canYouHearMeCount = trophyStats?.canYouHearMeCount || 0
  const canYouHearMeAchieved = canYouHearMeCount >= 1

  // Look at this trophy logic - single bronze trophy
  const lookAtThisCount = trophyStats?.lookAtThisCount || 0
  const lookAtThisAchieved = lookAtThisCount >= 1

  // Future Millionaire trophy logic - single bronze trophy
  const futureMillionaireCount = trophyStats?.futureMillionaireCount || 0
  const futureMillionaireAchieved = futureMillionaireCount >= 1

  // Calculate trophy counts for each tier using threshold-based logic
  const platinumCount = (earlyAdopterAchieved ? 1 : 0) + (onboarderCount >= 50 ? 1 : 0) + (chatterBoxCount >= 100 ? 1 : 0)
  const goldCount = (onboarderCount >= 25 ? 1 : 0) + (chatterBoxCount >= 30 ? 1 : 0)
  const silverCount = (onboarderCount >= 10 ? 1 : 0) + (chatterBoxCount >= 15 ? 1 : 0) + (futureMillionaireAchieved ? 1 : 0)
  const bronzeCount = (onboarderCount >= 1 ? 1 : 0) + (chatterBoxCount >= 5 ? 1 : 0) + (fledglingAchieved ? 1 : 0) + (tweeterAchieved ? 1 : 0) + (stickerCollectorAchieved ? 1 : 0) + (canYouHearMeAchieved ? 1 : 0) + (lookAtThisAchieved ? 1 : 0)

  const trophyData: TrophyData[] = [
    { type: 'platinum', count: platinumCount, achieved: platinumCount > 0 },
    { type: 'gold', count: goldCount, achieved: goldCount > 0 },
    { type: 'silver', count: silverCount, achieved: silverCount > 0 },
    { type: 'bronze', count: bronzeCount, achieved: bronzeCount > 0 }
  ]

  // Individual trophies list - organized by tier (descending: Bronze → Silver → Gold → Platinum)
  const trophies: Trophy[] = [
    // Bronze Trophies
    {
      id: 'fledgling',
      title: 'Fledgling',
      description: 'Start your first NFT chat',
      threshold: 1,
      achieved: fledglingAchieved,
      type: 'bronze' as const,
      currentCount: chatterBoxCount
    },
    {
      id: 'chatterbox-bronze',
      title: 'Chatter Box',
      description: 'Start 5 chats',
      threshold: 5,
      achieved: chatterBoxCount >= 5,
      type: 'bronze' as const,
      currentCount: chatterBoxCount
    },
    {
      id: 'onboarder-bronze',
      title: 'Onboarder',
      description: 'Onboard 1 new user (they must start 1 chat)',
      threshold: 1,
      achieved: onboarderCount >= 1,
      type: 'bronze' as const,
      currentCount: onboarderCount
    },
    {
      id: 'tweeter',
      title: 'Tweeter',
      description: 'Start a chat with an NFT using over 280 characters',
      threshold: 1,
      achieved: tweeterAchieved,
      type: 'bronze' as const,
      currentCount: tweeterCount
    },
    {
      id: 'sticker-collector',
      title: 'Sticker Collector',
      description: 'Send a sticker message',
      threshold: 1,
      achieved: stickerCollectorAchieved,
      type: 'bronze' as const,
      currentCount: stickerCollectorCount
    },
    {
      id: 'can-you-hear-me',
      title: 'Can you hear me?',
      description: 'Send a voice note (available in desktop only)',
      threshold: 1,
      achieved: canYouHearMeAchieved,
      type: 'bronze' as const,
      currentCount: canYouHearMeCount
    },
    {
      id: 'look-at-this',
      title: 'Look at this',
      description: 'Send an image',
      threshold: 1,
      achieved: lookAtThisAchieved,
      type: 'bronze' as const,
      currentCount: lookAtThisCount
    },
    // Silver Trophies
    {
      id: 'chatterbox-silver',
      title: 'Silver Chatter',
      description: 'Start 15 chats',
      threshold: 15,
      achieved: chatterBoxCount >= 15,
      type: 'silver' as const,
      currentCount: chatterBoxCount
    },
    {
      id: 'onboarder-silver',
      title: 'Silver Onboarder',
      description: 'Onboard 10 new users (they must start 1 chat)',
      threshold: 10,
      achieved: onboarderCount >= 10,
      type: 'silver' as const,
      currentCount: onboarderCount
    },
    {
      id: 'future-millionaire',
      title: 'Future Millionaire',
      description: 'Pay for an NFT chat with $SMS',
      threshold: 1,
      achieved: futureMillionaireAchieved,
      type: 'silver' as const,
      currentCount: futureMillionaireCount
    },
    // Gold Trophies
    {
      id: 'chatterbox-gold',
      title: 'Gold Chatter',
      description: 'Start 30 chats',
      threshold: 30,
      achieved: chatterBoxCount >= 30,
      type: 'gold' as const,
      currentCount: chatterBoxCount
    },
    {
      id: 'onboarder-gold',
      title: 'Gold Onboarder',
      description: 'Onboard 25 new users (they must start 1 chat)',
      threshold: 25,
      achieved: onboarderCount >= 25,
      type: 'gold' as const,
      currentCount: onboarderCount
    },
    // Platinum Trophies
    {
      id: 'early-adopter',
      title: 'Early Adopter',
      description: 'Start 3 NFT chats before Sept 18 25',
      threshold: 3,
      achieved: earlyAdopterAchieved,
      type: 'platinum',
      currentCount: trophyStats?.earlyAdopterCount || 0
    },
    {
      id: 'chatterbox-platinum',
      title: 'Master Chatter',
      description: 'Start 100 chats',
      threshold: 100,
      achieved: chatterBoxCount >= 100,
      type: 'platinum' as const,
      currentCount: chatterBoxCount
    },
    {
      id: 'onboarder-platinum',
      title: 'Master Onboarder',
      description: 'Onboard 50 new users (they must start 1 chat)',
      threshold: 50,
      achieved: onboarderCount >= 50,
      type: 'platinum' as const,
      currentCount: onboarderCount
    }
  ]

  const achievedTrophies = trophies.filter(t => t.achieved)
  const unachievedTrophies = trophies.filter(t => !t.achieved)

  const getTrophyImagePath = (trophyType: string) => {
    const typeMap: { [key: string]: string } = {
      'bronze': 'bronze2',
      'silver': 'silver',
      'gold': 'gold',
      'platinum': 'platinum'
    }
    return `/Trophies/${typeMap[trophyType.toLowerCase()]}.png`
  }

  // Create unique ID for this modal instance
  const modalId = React.useId()
  const scrollbarClass = `trophy-scrollbar-${modalId.replace(/:/g, '')}`

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleAllTrophiesClick = () => {
    setIsExpanded(true)
  }

  const handleBackClick = () => {
    setIsExpanded(false)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      style={{ zIndex: 10003 }}
      onClick={handleOverlayClick}
    >
      {/* Dynamic scrollbar styles */}
      <style>
        {`
          .${scrollbarClass}::-webkit-scrollbar {
            width: 6px;
          }
          .${scrollbarClass}::-webkit-scrollbar-track {
            background: transparent;
          }
          .${scrollbarClass}::-webkit-scrollbar-thumb {
            background: ${colors.border};
            border-radius: 0;
          }
          .${scrollbarClass}::-webkit-scrollbar-thumb:hover {
            background: ${colors.text};
          }
        `}
      </style>
        <div
          className="relative w-full max-w-md mx-4 border-2 shadow-lg"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            maxHeight: '80vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2"
          style={{ borderBottomColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5" style={{ color: colors.text }} />
            <h2
              className="text-lg font-medium"
              style={{
                fontFamily: "Helvetica Neue, sans-serif",
                color: colors.text
              }}
            >
              Trophies
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ color: colors.text }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: colors.text }} />
              <p
                className="text-sm"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.textSecondary
                }}
              >
                Loading your trophies...
              </p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-8">
              <TrophyIcon className="w-8 h-8 mb-4 opacity-50" style={{ color: colors.text }} />
              <p
                className="text-sm text-center"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.textSecondary
                }}
              >
                {error}
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 hover:opacity-80"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  backgroundColor: colors.bgSecondary,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  height: '36px'
                }}
              >
                Retry
              </Button>
            </div>
          ) : !connected ? (
            /* Not Connected State */
            <div className="flex flex-col items-center justify-center py-8">
              <TrophyIcon className="w-8 h-8 mb-4 opacity-50" style={{ color: colors.text }} />
              <p
                className="text-sm text-center"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.textSecondary
                }}
              >
                Connect your wallet to view trophies
              </p>
            </div>
          ) : !isExpanded ? (
            /* Collapsed View */
            <div className="space-y-6">
              {/* Trophy Row */}
              <div className="flex justify-between gap-2">
                {trophyData.map((trophy) => (
                  <div key={trophy.type} className="flex flex-col items-center flex-1">
                    <div className="w-16 h-16 mb-2 relative">
                      <Image
                        src={`/Trophies/${trophy.type.toLowerCase()}.png`}
                        alt={`${trophy.type} trophy`}
                        width={64}
                        height={64}
                        className={`w-full h-full object-contain ${
                          !trophy.achieved ? 'opacity-50 grayscale' : ''
                        }`}
                        style={{
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                    <div
                      className="text-lg font-medium"
                      style={{
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.text
                      }}
                    >
                      {trophy.count}
                    </div>
                    <div
                      className="text-xs capitalize"
                      style={{
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.textSecondary
                      }}
                    >
                      {trophy.type}
                    </div>
                  </div>
                ))}
              </div>

              {/* All Trophies Button */}
              <Button
                onClick={handleAllTrophiesClick}
                className="w-full hover:opacity-80"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  fontWeight: 500,
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  height: '48px'
                }}
              >
                All Trophies
              </Button>
            </div>
          ) : (
            /* Expanded View */
            <div className="space-y-4">
              {/* Compressed Trophy Summary */}
              <div
                className="transition-all duration-300 ease-in-out"
                style={{ transform: 'scale(0.7) translateY(-10px)' }}
              >
                <div className="flex justify-between items-center gap-2">
                  {trophyData.map((trophy) => (
                    <div key={trophy.type} className="flex items-center gap-1">
                      <div className="w-10 h-10 relative">
                        <Image
                          src={`/Trophies/${trophy.type.toLowerCase()}.png`}
                          alt={`${trophy.type} trophy`}
                          width={40}
                          height={40}
                          className={`w-full h-full object-contain ${
                            !trophy.achieved ? 'opacity-50 grayscale' : ''
                          }`}
                          style={{
                            imageRendering: 'pixelated'
                          }}
                        />
                      </div>
                      <div
                        className="text-sm font-medium"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        {trophy.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Back Button */}
              <Button
                onClick={handleBackClick}
                className="w-full hover:opacity-80 mb-4"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  fontWeight: 500,
                  backgroundColor: colors.bgSecondary,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  height: '36px'
                }}
              >
                Back to Summary
              </Button>

              {/* Trophy List */}
              <div
                className={`space-y-3 overflow-y-auto ${scrollbarClass}`}
                style={{
                  maxHeight: '300px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: `${colors.border} transparent`,
                  paddingRight: '4px'
                }}
              >
                {/* Achieved Trophies */}
                {achievedTrophies.map((trophy) => (
                  <div
                    key={trophy.id}
                    className="flex items-start gap-3 p-3 border"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bgSecondary
                    }}
                  >
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={getTrophyImagePath(trophy.type)}
                        alt={trophy.title}
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                        style={{
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-sm font-medium mb-1"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        {trophy.title}
                      </h3>
                      <p
                        className="text-xs"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.textSecondary
                        }}
                      >
                        {trophy.description}
                        {trophy.currentCount !== undefined && (
                          <span className="block mt-1" style={{ color: '#10B981' }}>
                            ✓ Completed ({trophy.currentCount}/{trophy.threshold})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Unachieved Trophies */}
                {unachievedTrophies.map((trophy) => (
                  <div
                    key={trophy.id}
                    className="flex items-start gap-3 p-3 border opacity-60"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.bg
                    }}
                  >
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={getTrophyImagePath(trophy.type)}
                        alt={trophy.title}
                        width={40}
                        height={40}
                        className="w-full h-full object-contain opacity-50 grayscale"
                        style={{
                          imageRendering: 'pixelated'
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3
                        className="text-sm font-medium mb-1"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        {trophy.title}
                      </h3>
                      <p
                        className="text-xs"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.textSecondary
                        }}
                      >
                        {trophy.description}
                        {trophy.currentCount !== undefined && (
                          <span className="block mt-1" style={{ color: colors.textSecondary, opacity: 0.7 }}>
                            Progress: {trophy.currentCount}/{trophy.threshold}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrophiesModal