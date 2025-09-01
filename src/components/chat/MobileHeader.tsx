"use client"

import React, { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, MoreVertical } from "lucide-react"
import { WalletButton } from "@/components/wallet-button"
import OnlineStatus from "@/components/OnlineStatus"

interface MobileHeaderProps {
  isMobileMenuOpen: boolean
  selectedChat: string | null
  conversations: any[]
  publicKey: string | null
  isDarkMode: boolean
  onlineUsers: Set<string>
  typingUsers: Set<string>
  showCopyToast: boolean
  
  onMenuToggle: () => void
  onCopyWalletAddress: (address: string) => void
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  isMobileMenuOpen,
  selectedChat,
  conversations,
  publicKey,
  isDarkMode,
  onlineUsers,
  typingUsers,
  showCopyToast,
  onMenuToggle,
  onCopyWalletAddress,
}) => {
  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Social menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])
  
  return (
    <div 
      className="md:hidden relative z-[100] flex items-center justify-between px-4 py-3"
      style={{ 
        backgroundColor: colors.bg
      }}
    >
      <Button
        onClick={onMenuToggle}
        className="rounded-none h-10 w-10 p-0 hover:opacity-80"
        style={{ 
          backgroundColor: colors.bg, 
          color: colors.text, 
          border: `2px solid ${colors.border}` 
        }}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>
      
      <div className="flex flex-col items-center">
        {!selectedChat ? (
          <Image src="/stork-logo.svg" alt="Stork Logo" width={100} height={33} className="h-8 w-auto" />
        ) : (
          <>
            {(() => {
              const selectedConversation = conversations.find(c => c.id === selectedChat)
              const otherParticipant = selectedConversation?.participants.find((p: string) => p !== publicKey?.toString())
              
              if (!otherParticipant) return (
                <Image src="/stork-logo.svg" alt="Stork Logo" width={100} height={33} className="h-8 w-auto" />
              )
              
              return (
                <div className="flex flex-col items-center">
                  <h2 
                    className="text-sm font-medium cursor-pointer transition-colors duration-200"
                    style={{ 
                      color: colors.text,
                      fontFamily: "Helvetica Neue, sans-serif"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#38F'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = colors.text
                    }}
                    onClick={() => onCopyWalletAddress(otherParticipant)}
                    title="Click to copy wallet address"
                  >
                    {otherParticipant.slice(0, 8)}...{otherParticipant.slice(-4)}
                  </h2>
                  
                  {/* Online Status */}
                  <OnlineStatus 
                    isOnline={onlineUsers.has(otherParticipant)}
                    isTyping={typingUsers.has(otherParticipant)}
                    showCopyFeedback={showCopyToast}
                    className="mt-0.5"
                  />
                </div>
              )
            })()}
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="[&>div>button]:!px-6">
          <WalletButton />
        </div>
        
        {/* Social Menu */}
        <div className="relative" ref={menuRef}>
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-4 w-4 p-0 hover:opacity-80 bg-transparent border-0 shadow-none"
            style={{ 
              backgroundColor: "transparent", 
              color: colors.text,
              border: "none",
              boxShadow: "none"
            }}
          >
            <MoreVertical className="w-3 h-3" />
          </Button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div 
              className="absolute right-0 top-10 z-50 min-w-[140px] border-2 shadow-md rounded-sm"
              style={{ 
                backgroundColor: colors.bg, 
                borderColor: colors.border 
              }}
            >
              <a 
                href="https://discord.gg/AdCKQAhe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm"
                style={{ color: colors.text }}
                onClick={() => setIsMenuOpen(false)}
              >
                <Image src="/discordlogo.svg" alt="Discord" width={16} height={16} className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Discord</span>
              </a>
              <div 
                className="h-px mx-2" 
                style={{ backgroundColor: colors.border, opacity: 0.3 }} 
              />
              <a 
                href="https://x.com/StorkSMS" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm"
                style={{ color: colors.text }}
                onClick={() => setIsMenuOpen(false)}
              >
                <Image src="/xlogo.svg" alt="X.com" width={16} height={16} className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>X.com</span>
              </a>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}

export default MobileHeader