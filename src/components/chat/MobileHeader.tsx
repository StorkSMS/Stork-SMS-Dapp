"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, MoreVertical, UserPlus, Users, Plane } from "lucide-react"
import { WalletButton } from "@/components/wallet-button"
import OnlineStatus from "@/components/OnlineStatus"
import ContactHeader from "@/components/ContactHeader"
import { useAuth } from "@/contexts/AuthContext"
import { useContacts } from "@/hooks/useContacts"

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
  onContactRefresh?: () => void
  onAddContactClick: () => void
  onManageContactsClick: () => void
  onAirdropCheckClick: () => void
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
  onContactRefresh,
  onAddContactClick,
  onManageContactsClick,
  onAirdropCheckClick,
}) => {
  const { isAuthenticated } = useAuth()
  const { contacts, refreshUserContacts } = useContacts()
  
  const findContactByAddress = useCallback((walletAddress: string) => {
    if (!walletAddress) return null
    const contact = contacts.find(contact => 
      contact.publicAddress === walletAddress
    )
    return contact || null
  }, [contacts])
  
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

  const handleAddContactClickInternal = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to add contacts')
      return
    }
    setIsMenuOpen(false)
    onAddContactClick()
  }

  const handleManageContactsClickInternal = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to manage contacts')
      return
    }
    setIsMenuOpen(false)
    onManageContactsClick()
  }

  const handleAirdropCheckClickInternal = () => {
    setIsMenuOpen(false)
    onAirdropCheckClick()
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
              const otherParticipant = selectedConversation?.participants.find((p: string) => p !== publicKey?.toString())
              
              if (!otherParticipant) return (
                <Image src="/stork-logo.svg" alt="Stork Logo" width={100} height={33} className="h-8 w-auto" />
              )
              
              const contact = findContactByAddress(otherParticipant)
              
              return (
                <div className="flex flex-col items-center">
                  {contact ? (
                    <ContactHeader
                      contactName={contact.name}
                      contactAddress={otherParticipant}
                      profilePictureUrl={contact.pfp}
                      onClick={onCopyWalletAddress}
                      showCopyToast={showCopyToast}
                      isDarkMode={isDarkMode}
                      className="text-sm font-medium"
                      style={{
                        fontFamily: "Helvetica Neue, sans-serif"
                      }}
                      isMobile={true}
                    />
                  ) : (
                    <div 
                      className="text-sm font-medium cursor-pointer hover:opacity-70"
                      style={{
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.text
                      }}
                      onClick={() => onCopyWalletAddress(otherParticipant)}
                    >
                      {otherParticipant.length > 16 
                        ? `${otherParticipant.slice(0, 8)}...${otherParticipant.slice(-4)}`
                        : otherParticipant
                      }
                    </div>
                  )}
                  
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
              className="absolute right-0 top-10 z-50 min-w-[180px] border-2 shadow-md rounded-sm"
              style={{ 
                backgroundColor: colors.bg, 
                borderColor: colors.border 
              }}
            >
              <button
                onClick={handleAddContactClickInternal}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <UserPlus className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Add Contact</span>
              </button>
              <button
                onClick={handleManageContactsClickInternal}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <Users className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Manage Contacts</span>
              </button>
              <button
                onClick={handleAirdropCheckClickInternal}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <Plane className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Airdrop Check</span>
              </button>
              <div 
                className="h-px mx-2" 
                style={{ backgroundColor: colors.border, opacity: 0.3 }} 
              />
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