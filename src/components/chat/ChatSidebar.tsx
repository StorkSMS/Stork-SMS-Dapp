"use client"

import React, { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, MoreVertical, UserPlus, Users, Plane, Gift, Trophy } from "lucide-react"
import DomainDisplay from "@/components/DomainDisplay"
import AddContactModal from "@/components/AddContactModal"
import ContactManagementModal from "@/components/ContactManagementModal"
import AirdropCheckModal from "@/components/AirdropCheckModal"
import AirdropClaimModal from "@/components/AirdropClaimModal"
import TrophiesModal from "@/components/TrophiesModal"
import { useAuth } from "@/contexts/AuthContext"
import { useContacts } from "@/hooks/useContacts"

interface PendingChat {
  id: string
  status: 'processing' | 'completed' | 'failed'
  recipient: string
  message: string
  theme: string
  error?: string
  result?: {
    chatId: string
  }
}

interface FormattedChat {
  id: string
  title: string
  lastMessage: string
  lastActivity: string
}

interface ChatSidebarProps {
  // Display state
  isMobile: boolean
  isMobileMenuOpen: boolean
  isDarkMode: boolean
  selectedChat: string | null
  
  // Data
  conversations: any[]
  formattedChats: FormattedChat[]
  pendingChats: PendingChat[]
  
  // Loading/error states
  isLoadingConversations: boolean
  connectionStatus: string
  authError: string | null
  isAuthenticating: boolean
  
  // Unread status
  unreadThreads: Set<string>
  newlyCreatedChats: Set<string>
  fadingChats: Set<string>
  
  // Progress for NFT creation
  progress: number
  getCurrentStep: () => string | null
  
  // Capabilities
  canCreate: boolean
  connected: boolean
  
  // Actions
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onRetryPendingChat: (pendingChatId: string) => void
  onContactRefresh?: () => void
  
  // Helper
  formatRelativeTime: (timestamp: string) => string
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isMobile,
  isMobileMenuOpen,
  isDarkMode,
  selectedChat,
  conversations,
  formattedChats,
  pendingChats,
  isLoadingConversations,
  connectionStatus,
  authError,
  isAuthenticating,
  unreadThreads,
  newlyCreatedChats,
  fadingChats,
  progress,
  getCurrentStep,
  canCreate,
  connected,
  onChatSelect,
  onNewChat,
  onRetryPendingChat,
  onContactRefresh,
  formatRelativeTime,
}) => {
  const { isAuthenticated } = useAuth()
  const { refreshUserContacts } = useContacts()
  
  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Social menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [isManageContactsModalOpen, setIsManageContactsModalOpen] = useState(false)
  const [isAirdropCheckModalOpen, setIsAirdropCheckModalOpen] = useState(false)
  const [isAirdropClaimModalOpen, setIsAirdropClaimModalOpen] = useState(false)
  const [isTrophiesModalOpen, setIsTrophiesModalOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Note: Domain resolution temporarily disabled for main chat list for debugging
  // Only pending chats still use domain resolution via DomainDisplay component

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

  const handleAddContactClick = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to add contacts')
      return
    }
    setIsMenuOpen(false)
    setIsAddContactModalOpen(true)
  }

  const handleManageContactsClick = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to manage contacts')
      return
    }
    setIsMenuOpen(false)
    setIsManageContactsModalOpen(true)
  }

  const handleAirdropCheckClick = () => {
    setIsMenuOpen(false)
    setIsAirdropCheckModalOpen(true)
  }

  const handleAirdropClaimClick = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to claim airdrops')
      return
    }
    setIsMenuOpen(false)
    setIsAirdropClaimModalOpen(true)
  }

  const handleTrophiesClick = () => {
    if (!isAuthenticated) {
      alert('Please connect and authenticate your wallet to view trophies')
      return
    }
    setIsMenuOpen(false)
    setIsTrophiesModalOpen(true)
  }

  const handleContactAdded = (contact: any) => {
    console.log('✅ Contact added, refreshing list...', contact.name)
    // Small delay to ensure database transaction is complete
    setTimeout(() => {
      refreshUserContacts()
      // Also refresh parent's contacts (for NewChatModal)
      onContactRefresh?.()
    }, 100)
  }
  
  return (
    <div 
      className={`
        ${isMobile ? `
          ${isMobileMenuOpen ? 'w-full' : 'w-0'}
          fixed top-0 left-0 h-[calc(100vh-73px)] z-40
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-hidden p-0
        ` : 'w-80 border-r-4 h-full'}
        flex flex-col relative z-[2]
        md:relative md:transform-none md:transition-none md:w-80 md:border-r-4 md:h-full
      `}
      style={{ 
        backgroundColor: colors.bg, 
        borderRightColor: colors.border,
        ...(isMobile ? { borderTop: `4px solid ${colors.border}` } : {})
      }}
    >
      {/* Logo Section - Desktop Only */}
      <div 
        className="hidden md:flex p-6 border-b-4 items-center justify-between relative"
        style={{ borderBottomColor: colors.border }}
      >
        {/* Logo and Text - Left Side */}
        <div className="flex items-center gap-4">
          <Image src="/stork-logo.svg" alt="Stork Logo" width={120} height={40} className="h-10 w-auto" />
          <div className="text-lg" style={{ color: colors.text }}>
            <span style={{ 
              fontFamily: "Helvetica Neue, sans-serif",
              fontWeight: 500,
              fontSize: "1.25rem"
            }}>
              Stork-
            </span>
            <span style={{ 
              fontFamily: "SelfWritten-Regular, Helvetica Neue, sans-serif"
            }}>
              SMS
            </span>
          </div>
        </div>

        {/* Social Menu - Right Side */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <Button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-8 w-8 p-0 hover:opacity-80 bg-transparent border-0 shadow-none"
            style={{ 
              backgroundColor: "transparent", 
              color: colors.text,
              border: "none",
              boxShadow: "none"
            }}
          >
            <MoreVertical className="w-4 h-4" />
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
                onClick={handleTrophiesClick}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <Trophy className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Trophies</span>
              </button>
              <button
                onClick={handleAddContactClick}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <UserPlus className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Add Contact</span>
              </button>
              <button
                onClick={handleManageContactsClick}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <Users className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Manage Contacts</span>
              </button>
              <button
                onClick={handleAirdropClaimClick}
                className="flex items-center gap-2 px-3 py-2 hover:opacity-70 transition-opacity text-sm w-full text-left"
                style={{ color: colors.text }}
              >
                <Gift className="w-4 h-4" />
                <span style={{ fontFamily: "Helvetica Neue, sans-serif" }}>Airdrop Claim</span>
              </button>
              <button
                onClick={handleAirdropCheckClick}
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
                href="https://discord.gg/YucFC3mn" 
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

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading State */}
        {isLoadingConversations && conversations.length === 0 && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-2" style={{ borderColor: colors.border }}></div>
            <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>Loading conversations...</p>
          </div>
        )}
        
        {/* Connection Status */}
        {connectionStatus === 'connecting' && (
          <div className="p-2 border-b-2" style={{ borderBottomColor: colors.border, backgroundColor: colors.bgSecondary }}>
            <p className="text-xs text-center" style={{ color: colors.textSecondary }}>Connecting to real-time updates...</p>
          </div>
        )}
        
        {/* Auth Error */}
        {authError && (
          <div className="p-3 border-b-2" style={{ borderBottomColor: colors.border, backgroundColor: '#EF444415' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" style={{ color: '#EF4444' }} />
              <p className="text-xs" style={{ color: colors.text }}>Authentication issue: {authError}</p>
            </div>
          </div>
        )}
        
        {/* Pending Chats */}
        {pendingChats
          .filter(pendingChat => {
            // Keep completed chats visible even if they exist in conversations
            // This ensures users see the success state and chat doesn't disappear
            return true // Show all pending chats for better user experience
          })
          .map((pendingChat) => (
          <div
            key={pendingChat.id}
            className="p-4 border-b-2 cursor-pointer relative"
            style={{
              borderBottomColor: colors.border,
              backgroundColor: '#3388FF15'
            }}
          >
            {/* Blue pending indicator */}
            <div 
              className="absolute left-0 top-0 w-1 h-full"
              style={{ backgroundColor: '#3388FF' }}
            />
            
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="font-medium text-sm" 
                style={{ 
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.text
                }}
              >
{/* Temporarily disabled domain resolution to prevent rate limiting */}
                {pendingChat.recipient && pendingChat.recipient.length > 12 
                  ? `${pendingChat.recipient.slice(0, 8)}...${pendingChat.recipient.slice(-4)}`
                  : pendingChat.recipient || 'Unknown'
                }
              </div>
              <div className="flex items-center gap-1">
                {pendingChat.status === 'processing' && (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: '#3388FF' }}
                    />
                    <span 
                      className="text-xs"
                      style={{ color: '#3388FF', fontFamily: "Helvetica Neue, sans-serif" }}
                    >
                      Creating...
                    </span>
                  </>
                )}
                {pendingChat.status === 'completed' && (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#10B981' }}
                    />
                    <span 
                      className="text-xs"
                      style={{ color: '#10B981', fontFamily: "Helvetica Neue, sans-serif" }}
                    >
                      Complete
                    </span>
                  </>
                )}
                {pendingChat.status === 'failed' && (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#EF4444' }}
                    />
                    <span 
                      className="text-xs"
                      style={{ color: '#EF4444', fontFamily: "Helvetica Neue, sans-serif" }}
                    >
                      Failed
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRetryPendingChat(pendingChat.id)
                      }}
                      className="text-xs underline ml-1 hover:opacity-80"
                      style={{ color: '#3388FF', fontFamily: "Helvetica Neue, sans-serif" }}
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div 
              className="text-sm truncate" 
              style={{ 
                fontFamily: "Helvetica Neue, sans-serif",
                color: colors.textSecondary
              }}
            >
              {pendingChat.message}
            </div>
            
            {/* Progress bar for processing chats */}
            {pendingChat.status === 'processing' && (
              <div className="mt-2">
                <div 
                  className="h-1 rounded-full"
                  style={{ backgroundColor: colors.border }}
                >
                  <div 
                    className="h-1 rounded-full transition-all duration-300"
                    style={{ 
                      backgroundColor: '#3388FF',
                      width: `${progress}%`
                    }}
                  />
                </div>
                <div 
                  className="text-xs mt-1"
                  style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  {getCurrentStep() || 'Processing...'}
                </div>
              </div>
            )}
            
            {/* Error details for failed chats */}
            {pendingChat.status === 'failed' && pendingChat.error && (
              <div 
                className="text-xs mt-1 p-2 rounded"
                style={{ 
                  backgroundColor: '#EF444415',
                  color: '#EF4444',
                  fontFamily: "Helvetica Neue, sans-serif"
                }}
              >
                Error: {pendingChat.error}
              </div>
            )}
          </div>
        ))}

        {/* Chat Items */}
        {formattedChats.map((chat) => {
          const isNewlyCreated = newlyCreatedChats.has(chat.id)
          const isFading = fadingChats.has(chat.id)
          
          // Hide server version when showing "Complete" version in pending chats
          if (isNewlyCreated && !isFading) {
            return null
          }
          
          return (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`p-4 border-b-2 cursor-pointer hover:opacity-80 relative ${
                selectedChat === chat.id ? 'border-l-2' : ''
              }`}
              style={{
                borderBottomColor: colors.border,
                borderLeftColor: selectedChat === chat.id ? '#3B82F6' : 'transparent',
                backgroundColor: selectedChat === chat.id 
                  ? (isDarkMode ? '#1E3A8A15' : '#EFF6FF80') 
                  : 'transparent'
              }}
            >
              
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="font-medium" 
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.text
                      }}
                    >
                      {chat.title && chat.title.length > 12 
                        ? `${chat.title.slice(0, 8)}...${chat.title.slice(-4)}`
                        : chat.title || 'Unknown'
                      }
                    </div>
                    {/* Unread indicator dot - moved to be inline with address */}
                    {unreadThreads.has(chat.id) && (
                      <div 
                        className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                        style={{ backgroundColor: '#3388FF' }}
                        title="New messages"
                      />
                    )}
                  </div>
                  {isNewlyCreated && (
                    <div 
                      className={`flex items-center gap-1 transition-opacity duration-500 ${
                        isFading ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: '#10B981' }}
                      />
                      <span 
                        className="text-xs"
                        style={{ color: '#10B981', fontFamily: "Helvetica Neue, sans-serif" }}
                      >
                        Complete
                      </span>
                    </div>
                  )}
                </div>
                <div 
                  className="text-xs" 
                  style={{ 
                    fontFamily: "Helvetica Neue, sans-serif",
                    color: colors.textSecondary
                  }}
                >
                  {formatRelativeTime(chat.lastActivity)}
                </div>
              </div>
              <div 
                className="text-sm truncate" 
                style={{ 
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.textSecondary
                }}
              >
                {chat.lastMessage}
              </div>
            </div>
          )
        })}
        
        {/* Empty State */}
        {!isLoadingConversations && formattedChats.length === 0 && (
          <div className="p-8 text-center">
            <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>No conversations yet</p>
            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Create your first NFT message!</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div 
        className="p-4 relative space-y-3"
        style={{ 
          background: `linear-gradient(to top, ${colors.bg}, transparent)` 
        }}
      >
        
        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          disabled={!canCreate || isAuthenticating}
          className="w-full rounded-none hover:opacity-80 disabled:opacity-50"
          style={{ 
            fontFamily: "Helvetica Neue, sans-serif", 
            fontWeight: 500,
            backgroundColor: colors.bg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            height: '52px',
            transform: 'translateY(5px)'
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {!connected ? 'Connect Wallet' : isAuthenticating ? 'Authenticating...' : 'New NFT Chat'}
        </Button>
      </div>

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onContactAdded={handleContactAdded}
        isDarkMode={isDarkMode}
      />

      {/* Manage Contacts Modal */}
      <ContactManagementModal
        isOpen={isManageContactsModalOpen}
        onClose={() => setIsManageContactsModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Airdrop Check Modal */}
      <AirdropCheckModal
        isOpen={isAirdropCheckModalOpen}
        onClose={() => setIsAirdropCheckModalOpen(false)}
        isDarkMode={isDarkMode}
      />
      
      {/* Airdrop Claim Modal */}
      <AirdropClaimModal
        isOpen={isAirdropClaimModalOpen}
        onClose={() => setIsAirdropClaimModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Trophies Modal */}
      <TrophiesModal
        isOpen={isTrophiesModalOpen}
        onClose={() => setIsTrophiesModalOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  )
}

export default ChatSidebar