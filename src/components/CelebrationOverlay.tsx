"use client"

import React, { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import confetti from "canvas-confetti"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAuth } from "@/contexts/AuthContext"

interface CelebrationOverlayProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
  onAirdropClaimClick?: () => void
}

const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isOpen,
  onClose,
  isDarkMode = false,
  onAirdropClaimClick
}) => {
  const [mounted, setMounted] = useState(false)
  const confettiTimeout = useRef<NodeJS.Timeout | null>(null)
  const { connected, connecting, wallets, select, connect, publicKey, signMessage } = useWallet()
  const { isAuthenticated, isAuthenticating, authenticateWithWallet } = useAuth()
  const [showWalletList, setShowWalletList] = useState(false)
  const [userInitiatedConnection, setUserInitiatedConnection] = useState(false)
  const [hasTriggeredAuth, setHasTriggeredAuth] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Trigger authentication after wallet connects
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating && !hasTriggeredAuth && userInitiatedConnection && signMessage) {
      setHasTriggeredAuth(true)
      authenticateWithWallet()
    }
  }, [connected, publicKey, isAuthenticated, isAuthenticating, hasTriggeredAuth, userInitiatedConnection, authenticateWithWallet, signMessage])

  // Reset auth trigger when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setHasTriggeredAuth(false)
      setUserInitiatedConnection(false)
      setShowWalletList(false)
    }
  }, [connected])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletList(false)
      }
    }

    if (showWalletList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWalletList])

  // Handle wallet selection
  const handleWalletSelect = async (walletName: string) => {
    setShowWalletList(false)
    setUserInitiatedConnection(true)
    select(walletName as any)
    
    try {
      await connect()
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  // Handle button click
  const handleButtonClick = () => {
    if (connected && isAuthenticated) {
      // Fully authenticated, open claim modal
      onAirdropClaimClick?.()
      onClose()
    } else if (!connected) {
      // Show wallet selection
      setShowWalletList(!showWalletList)
    } else if (connected && !isAuthenticated && !isAuthenticating) {
      // Connected but not authenticated, trigger auth
      setUserInitiatedConnection(true)
      setHasTriggeredAuth(true)
      authenticateWithWallet()
    }
  }

  // Determine button text and disabled state
  const getButtonText = () => {
    if (connecting) return 'Connecting...'
    if (isAuthenticating) return 'Awaiting Signature...'
    if (connected && isAuthenticated) return 'Claim Your Airdrop'
    if (connected && !isAuthenticated) return 'Sign to Authenticate'
    return 'Connect Wallet to Claim'
  }

  const isButtonDisabled = connecting || isAuthenticating

  const availableWallets = wallets.filter((wallet) => wallet.readyState === "Installed")

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
          borderColor: colors.border,
          backgroundImage: 'url(/Nft-Build-Images/Recipient\ NFT/Paper-Texture\ \(position\ bottom\ right\).png)',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom right',
          backgroundRepeat: 'no-repeat',
          backgroundBlendMode: isDarkMode ? 'multiply' : 'overlay'
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
              🎁 Airdrop is Live!
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
            <p className="mb-6 text-center">
              <strong>🎁 Airdrop is now live!</strong> Eligible wallets include those from the 
              7-day developer updates period, .skr domain holders, and manually added contributors.
            </p>

            <div className="flex justify-center">
              <div className="relative" ref={dropdownRef}>
                <Button
                  onClick={handleButtonClick}
                  disabled={isButtonDisabled}
                  className="bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] hover:bg-[#2277EE] rounded-none h-12 px-8 relative disabled:opacity-50"
                  style={{
                    fontFamily: "Helvetica Neue, sans-serif",
                    fontWeight: 500,
                    boxShadow: "inset 0 0 0 1px #FFF",
                  }}
                >
                  {getButtonText()}
                </Button>

                {/* Wallet Selection Dropdown */}
                {showWalletList && (
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 border-2 min-w-[200px] z-[10002]"
                    style={{ 
                      backgroundColor: colors.bg,
                      borderColor: colors.border
                    }}
                  >
                    <div
                      className="p-2 border-b-2 text-sm font-medium"
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        borderBottomColor: colors.border,
                        color: colors.text
                      }}
                    >
                      Connect Wallet
                    </div>
                    {availableWallets.length > 0 ? (
                      availableWallets.map((wallet) => (
                        <Button
                          key={wallet.adapter.name}
                          onClick={() => handleWalletSelect(wallet.adapter.name)}
                          className="w-full border-none hover:opacity-70 rounded-none h-10 text-left justify-start flex items-center gap-2"
                          style={{ 
                            fontFamily: "Helvetica Neue, sans-serif",
                            backgroundColor: "transparent",
                            color: colors.text
                          }}
                        >
                          {wallet.adapter.icon && (
                            <img src={wallet.adapter.icon} alt={wallet.adapter.name} className="w-4 h-4" />
                          )}
                          {wallet.adapter.name}
                        </Button>
                      ))
                    ) : (
                      <div 
                        className="p-4 text-sm"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.textSecondary
                        }}
                      >
                        No wallets detected. Please install a Solana wallet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}

export default CelebrationOverlay