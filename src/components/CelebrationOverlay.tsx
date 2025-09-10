"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import confetti from "canvas-confetti"

interface CelebrationOverlayProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
  onAirdropCheckClick?: () => void
}

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isOpen,
  onClose,
  isDarkMode = false,
  onAirdropCheckClick
}) => {
  const [mounted, setMounted] = useState(false)
  const confettiTimeout = useRef<NodeJS.Timeout | null>(null)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    textSecondary: isDarkMode ? '#CCC' : '#666',
    backdrop: 'rgba(0, 0, 0, 0.7)'
  }

  const fireConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10002 }

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // Fire from bottom left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
      })

      // Fire from bottom right  
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']
      })
    }, 250)

    confettiTimeout.current = interval
  }

  useEffect(() => {
    if (isOpen && !mounted) {
      setMounted(true)
      
      // Fire confetti after a short delay to ensure component is rendered
      setTimeout(() => {
        fireConfetti()
      }, 500)
    }

    return () => {
      if (confettiTimeout.current) {
        clearInterval(confettiTimeout.current)
      }
    }
  }, [isOpen, mounted, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleClose = () => {
    if (confettiTimeout.current) {
      clearInterval(confettiTimeout.current)
    }
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[10001] p-4"
      style={{ backgroundColor: colors.backdrop }}
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-lg border-4 rounded-sm relative"
        style={{ 
          backgroundColor: colors.bg, 
          borderColor: colors.border 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button in top right */}
        <div className="relative">
          <Button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-none hover:opacity-80 z-10"
            style={{ 
              backgroundColor: "transparent",
              color: colors.text,
              border: "none",
              boxShadow: "none"
            }}
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div 
            className="p-6 border-b-2"
            style={{ borderBottomColor: colors.border }}
          >
            <h1 
              className="text-2xl font-bold pr-12"
              style={{ 
                color: colors.text,
                fontFamily: "Helvetica Neue, sans-serif" 
              }}
            >
              Airdrop Qualification has ended
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div 
            className="text-lg leading-relaxed"
            style={{ 
              color: colors.text,
              fontFamily: "Helvetica Neue, sans-serif" 
            }}
          >
            <p className="mb-4">
              The <strong>Seeker Airdrop qualification period is closed</strong>. 
              The airdrop will take place at a random time between now as you read this message 
              and <strong>11:59pm UTC September 10th</strong>. You can{" "}
              <button
                onClick={() => {
                  onAirdropCheckClick?.()
                  onClose()
                }}
                className="underline hover:opacity-80 font-semibold"
                style={{ 
                  color: colors.text,
                  backgroundColor: "transparent",
                  border: "none",
                  padding: 0,
                  fontFamily: "inherit"
                }}
              >
                navigate to the airdrop checker
              </button>{" "}
              to check if your wallet is eligible.
            </p>
            
            <div 
              className="p-4 border-2 rounded-sm"
              style={{ 
                borderColor: colors.border,
                backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9'
              }}
            >
              <p 
                className="text-sm"
                style={{ 
                  color: colors.textSecondary,
                  fontFamily: "Helvetica Neue, sans-serif" 
                }}
              >
                📢 <strong>Stay tuned:</strong> This message will be updated with further details about the airdrop timing and distribution.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CelebrationOverlay