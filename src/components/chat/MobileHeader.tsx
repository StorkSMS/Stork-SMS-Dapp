"use client"

import React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
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
              const otherParticipant = selectedConversation?.participants.find(p => p !== publicKey?.toString())
              
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

      <WalletButton />
      
    </div>
  )
}

export default MobileHeader