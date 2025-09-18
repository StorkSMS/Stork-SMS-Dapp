"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Trophy } from "lucide-react"
import Image from "next/image"

interface TrophyData {
  type: 'platinum' | 'gold' | 'silver' | 'bronze'
  count: number
  achieved: boolean
}

interface Trophy {
  id: string
  title: string
  description: string
  threshold: number
  achieved: boolean
  type: 'platinum' | 'gold' | 'silver' | 'bronze'
}

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

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Trophy summary data
  const trophyData: TrophyData[] = [
    { type: 'platinum', count: 0, achieved: false },
    { type: 'gold', count: 0, achieved: false },
    { type: 'silver', count: 0, achieved: false },
    { type: 'bronze', count: 1, achieved: true }
  ]

  // Individual trophies list
  const trophies: Trophy[] = [
    {
      id: '1',
      title: '1 placeholder trophy',
      description: 'Placeholder description for 1 placeholder trophy',
      threshold: 1,
      achieved: true,
      type: 'bronze'
    },
    {
      id: '2',
      title: '10 placeholder trophy',
      description: 'Placeholder description for 10 placeholder trophy',
      threshold: 10,
      achieved: false,
      type: 'silver'
    },
    {
      id: '3',
      title: '50 placeholder trophy',
      description: 'Placeholder description for 50 placeholder trophy',
      threshold: 50,
      achieved: false,
      type: 'gold'
    },
    {
      id: '4',
      title: '100 placeholder trophy',
      description: 'Placeholder description for 100 placeholder trophy',
      threshold: 100,
      achieved: false,
      type: 'platinum'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-md mx-4 border-2 shadow-lg"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          maxHeight: '80vh'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2"
          style={{ borderBottomColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: colors.text }} />
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
          {!isExpanded ? (
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
                          imageRendering: 'pixelated',
                          imageRendering: '-moz-crisp-edges',
                          imageRendering: 'crisp-edges'
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
                            imageRendering: 'pixelated',
                            imageRendering: '-moz-crisp-edges',
                            imageRendering: 'crisp-edges'
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
                className="space-y-3 overflow-y-auto"
                style={{ maxHeight: '300px' }}
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
                          imageRendering: 'pixelated',
                          imageRendering: '-moz-crisp-edges',
                          imageRendering: 'crisp-edges'
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
                          imageRendering: 'pixelated',
                          imageRendering: '-moz-crisp-edges',
                          imageRendering: 'crisp-edges'
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