"use client"

// Force dynamic rendering to avoid SSR issues with wallet components
export const dynamic = 'force-dynamic'

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DomainDisplay from "@/components/DomainDisplay"
import ContactHeader from "@/components/ContactHeader"
import { Plus, Menu, X, Send, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"
import { useNFTChatCreation } from "@/hooks/useNFTChatCreation"
import { useRealtimeMessaging } from "@/hooks/useRealtimeMessaging"
import { useAuth } from "@/contexts/AuthContext"
import { useContacts } from "@/hooks/useContacts"
import { useNFTVerification } from "@/hooks/useNFTVerification"
import { MessageStatus, useMessageStatus } from "@/components/MessageStatus"
import StickerPicker, { useStickerState } from "@/components/StickerPicker"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { WalletButton } from "@/components/wallet-button"
import NFTPreviewCanvas from "@/components/NFTPreviewCanvas"
import ChatStickerButton from "@/components/ChatStickerButton"
import ChatStickerPicker from "@/components/ChatStickerPicker"
import ExpandingVoiceRecorder from "@/components/ExpandingVoiceRecorder"
import VoiceMessageBubble from "@/components/VoiceMessageBubble"
import ImageMessageBubble from "@/components/ImageMessageBubble"
import OnlineStatus from "@/components/OnlineStatus"
import FileUploadButton from "@/components/FileUploadButton"
import ImagePreview from "@/components/ImagePreview"
// WebP conversion now handled server-side only
// import type { } from "@/types/messaging"
import "@/lib/debug-auth" // Import debug functions for testing
import LinkPreview from "@/components/LinkPreview"
import { detectUrls, calculateSkeletonDimensions } from "@/lib/url-utils"
import { PRIORITY_LEVELS } from "@/lib/link-loading-queue"
import { getSimpleImageDimensions, calculateSimpleResize } from "@/lib/simple-image-processing"

// Import new components
import ChatSidebar from "@/components/chat/ChatSidebar"
import MessageDisplay from "@/components/chat/MessageDisplay"
import MessageInput from "@/components/chat/MessageInput"
import NewChatModal from "@/components/chat/NewChatModal"
import MobileHeader from "@/components/chat/MobileHeader"
import { getThemeColors, formatRelativeTime } from "@/components/chat/utils"

interface NewChatData {
  to: string
  from: string
  message: string
  selectedSticker?: string | null
  paymentMethod?: 'SOL' | 'STORK'
}

interface PendingChat {
  id: string
  status: 'processing' | 'completed' | 'failed'
  recipient: string
  message: string
  theme: string
  paymentMethod?: 'SOL' | 'STORK'
  error?: string
  result?: {
    chatId: string
  }
}

export default function ChatApp() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false)
  const [isWaitingForSignature, setIsWaitingForSignature] = useState(false)
  const [isChatStickerPickerOpen, setIsChatStickerPickerOpen] = useState(false)
  const [selectedChatSticker] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pendingChats, setPendingChats] = useState<PendingChat[]>([])
  const [timestampUpdate, setTimestampUpdate] = useState(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [newlyCreatedChats, setNewlyCreatedChats] = useState<Set<string>>(new Set())
  const [fadingChats, setFadingChats] = useState<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedChatRef = useRef<string | null>(null)
  const chatStickerButtonRef = useRef<HTMLButtonElement>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState<Map<string, { 
    file: File; 
    progress: number; 
    url?: string;
    chatId?: string;
    recipientWallet?: string;
    status?: 'uploading' | 'error';
    error?: string;
  }>>(new Map())
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [newChatData, setNewChatData] = useState<NewChatData>({
    to: "",
    from: "",
    message: "",
    selectedSticker: null,
  })
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false)
  const [isAppLoaded, setIsAppLoaded] = useState(false)
  const [hideWelcomeScreen, setHideWelcomeScreen] = useState(false)
  const [hasEverAuthenticated, setHasEverAuthenticated] = useState(false)
  
  // Typing detection refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCurrentlyTypingRef = useRef<boolean>(false)
  
  // Copy wallet address handler
  const handleCopyWalletAddress = useCallback((address: string) => {
    navigator.clipboard.writeText(address)
    setShowCopyToast(true)
    setTimeout(() => setShowCopyToast(false), 2000)
  }, [])
  
  // Initialize sticker state for new chat
  const stickerState = useStickerState(newChatData.message)

  const { publicKey, connected } = useWallet()
  
  // Use the new AuthContext - single source of truth!
  const authState = useAuth()
  const { sendTestNotification, subscription, permission } = usePushNotifications()
  
  // Load contacts for displaying names instead of wallet addresses
  const { contacts, refreshUserContacts } = useContacts()
  
  // Access properties directly from the context
  const isAuthenticated = authState.isAuthenticated
  const isAuthenticating = authState.isAuthenticating
  const authError = authState.error
  
  // Single authentication check to prevent multiple reactive dependencies
  const isActuallyAuthenticated = authState.authStatus === 'authenticated'
  
  // Helper function to find contact name by wallet address
  const findContactByAddress = useCallback((walletAddress: string) => {
    if (!walletAddress) return null
    
    // Search through all contacts (hardcoded + user contacts)
    const contact = contacts.find(contact => 
      contact.publicAddress === walletAddress
    )
    
    return contact?.name || null
  }, [contacts])

  // Helper function to find full contact by wallet address
  const findFullContactByAddress = useCallback((walletAddress: string) => {
    if (!walletAddress) return null
    
    // Search through all contacts (hardcoded + user contacts)
    const contact = contacts.find(contact => 
      contact.publicAddress === walletAddress
    )
    
    return contact || null
  }, [contacts])
  
  // Track if conversations have been loaded for current auth session
  const hasLoadedConversationsRef = useRef(false)
  const lastAuthenticatedWalletRef = useRef<string | null>(null)
  
  const { } = useNFTVerification()
  const { getStatusFromMessage, isMessageEncrypted, getMessageTimestamp } = useMessageStatus()
  

  const {
    conversations,
    currentChatMessages,
    readReceipts,
    isLoadingConversations,
    isLoadingMessages,
    connectionStatus,
    unreadThreads,
    loadChatMessages,
    sendMessage,
    retryMessage,
    subscribeToMessageUpdates,
    subscribeToReadReceiptsUpdates,
    subscribeToPresenceUpdates,
    clearCurrentChat,
    refreshConversations,
    clearUnreadStatus,
    addUnreadStatus,
    error: _messagingError,
    onNewMessage,
    // Presence state
    onlineUsers,
    typingUsers,
    presenceData: _presenceData,
    // Presence functions
    startTyping,
    extendTyping,
    stopTyping,
    setOnlineStatus
  } = useRealtimeMessaging()
  const {
    progress,
    createNFTChatWithImmediateSignature,
    getCurrentStep,
    canCreate,
    setPreviewCanvasData
  } = useNFTChatCreation()

  // Trigger app drop-down animation on mount (desktop) or after wallet connection (mobile)
  useEffect(() => {
    // Wait for mobile detection to complete first
    const timer = setTimeout(() => {
      if (!isMobile) {
        // Desktop: immediate animation
        setIsAppLoaded(true)
      }
      // Mobile: wait for wallet connection (don't set isAppLoaded)
    }, 100) // Small delay to ensure mobile detection is complete
    
    return () => clearTimeout(timer)
  }, [isMobile])

  // Track when user has ever authenticated to prevent welcome screen from reappearing
  useEffect(() => {
    if (isActuallyAuthenticated && !hasEverAuthenticated) {
      setHasEverAuthenticated(true)
    }
  }, [isActuallyAuthenticated, hasEverAuthenticated])

  // Trigger mobile animation after wallet connects AND authenticates
  useEffect(() => {
    if (isMobile && connected && isActuallyAuthenticated) {
      const animationTimer = setTimeout(() => {
        setIsAppLoaded(true)
        // Open sidebar by default on mobile after wallet connection
        setIsMobileMenuOpen(true)
      }, 300) // Small delay after wallet connection for smooth transition
      
      // Hide welcome screen elements 5 seconds after animation starts
      const hideWelcomeTimer = setTimeout(() => {
        setHideWelcomeScreen(true)
      }, 5300) // 300ms animation delay + 5000ms display time
      
      return () => {
        clearTimeout(animationTimer)
        clearTimeout(hideWelcomeTimer)
      }
    }
  }, [isMobile, connected, isActuallyAuthenticated])

  // Initialize audio on mount with better error handling
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🔊 Initializing notification audio...')
        audioRef.current = new Audio('/noti/11L-stork_squawk_message-1752946389647.mp3')
        audioRef.current.volume = 0.35
        audioRef.current.preload = 'auto'
        
        // Test if audio can be loaded
        await new Promise((resolve, reject) => {
          if (!audioRef.current) return reject('Audio ref is null')
          audioRef.current.addEventListener('canplaythrough', resolve)
          audioRef.current.addEventListener('error', reject)
          audioRef.current.load()
        })
        
        setAudioInitialized(true)
        console.log('✅ Notification audio initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize notification audio:', error)
        setAudioInitialized(false)
      }
    }
    
    initializeAudio()
  }, [])
  
  // Track user interaction for audio autoplay
  useEffect(() => {
    const handleUserInteraction = () => {
      console.log('👆 User interaction detected, enabling audio notifications')
      setUserInteracted(true)
    }
    
    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('keydown', handleUserInteraction)
    
    return () => {
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
    }
  }, [])
  
  // Keep selectedChatRef in sync with selectedChat
  useEffect(() => {
    selectedChatRef.current = selectedChat
    console.log('📍 Selected chat updated:', selectedChat || 'none')
    console.log('🔍 RENDER DEBUG - selectedChat state:', { 
      selectedChat, 
      hasSelectedChat: !!selectedChat,
      type: typeof selectedChat,
      length: selectedChat?.length 
    })
  }, [selectedChat])
  
  // Subscribe to new message events
  useEffect(() => {
    if (!onNewMessage) {
      console.log('⚠️ onNewMessage callback not available')
      return
    }
    
    console.log('🔔 Setting up new message notification handler')
    
    const unsubscribe = onNewMessage((message: any, isFromCurrentUser: boolean) => {
      console.log('🚨 NOTIFICATION HANDLER CALLED! Message received:', message)
      console.log('📨 Sender detection from hook:', { isFromCurrentUser })
      
      const currentSelectedChat = selectedChatRef.current
      
      console.log('📨 New message received:', {
        messageId: message.id,
        chatId: message.chat_id,
        currentlySelected: currentSelectedChat,
        isFromCurrentUser,
        shouldNotify: !isFromCurrentUser, // Always notify if not the sender
        shouldMarkUnread: message.chat_id !== currentSelectedChat && !isFromCurrentUser
      })
      
      // Only notify if the user is NOT the sender (regardless of which chat is open)
      if (!isFromCurrentUser) {
        // If message is for a different chat, mark it as unread
        if (message.chat_id !== currentSelectedChat) {
          console.log('🔴 New message in different chat - marking as unread')
          addUnreadStatus(message.chat_id)
        } else {
          console.log('📍 New message in current chat from other user')
          // Mark as read immediately since user is viewing the chat
          if (unreadThreads.has(message.chat_id)) {
            clearUnreadStatus(message.chat_id)
          }
        }
        
        // Play notification sound if audio is initialized and user has interacted
        console.log('🔔 Notification sound check:', {
          audioInitialized,
          userInteracted,
          hasAudioRef: !!audioRef.current,
          messageFrom: message.sender_wallet_address?.slice(0, 8),
          currentUser: publicKey?.toBase58().slice(0, 8)
        })
        
        if (audioInitialized && userInteracted && audioRef.current) {
          console.log('🔔 Playing notification sound for message from other user')
          audioRef.current.play()
            .then(() => console.log('✅ Notification sound played'))
            .catch(err => console.error('❌ Failed to play notification sound:', err))
        } else {
          console.log('🔇 Sound not played - conditions not met')
        }
      } else {
        console.log('🔇 No notification - message is from current user')
      }
    })
    
    return unsubscribe
  }, [onNewMessage, publicKey, unreadThreads, clearUnreadStatus, addUnreadStatus, audioInitialized, userInteracted])
  
  // Update from field when wallet connects/disconnects
  useEffect(() => {
    if (connected && publicKey) {
      setNewChatData(prev => ({ ...prev, from: publicKey.toString() }))
    } else {
      setNewChatData(prev => ({ ...prev, from: "" }))
    }
  }, [connected, publicKey])
  
  // Set up presence subscriptions when chat is selected
  useEffect(() => {
    if (selectedChat && isActuallyAuthenticated) {
      console.log('🌐 Setting up presence subscriptions for chat:', selectedChat)
      subscribeToPresenceUpdates(selectedChat)
      setOnlineStatus(selectedChat, true)
      
      return () => {
        console.log('🌐 Cleaning up presence subscriptions for chat:', selectedChat)
        setOnlineStatus(selectedChat, false)
      }
    }
  }, [selectedChat, isActuallyAuthenticated, subscribeToPresenceUpdates, setOnlineStatus])
  
  // Poll pending chats to update their status
  useEffect(() => {
    if (pendingChats.some(chat => chat.status === 'processing')) {
      const timer = setInterval(() => {
        setPendingChats(prev => 
          prev.filter(chat => 
            chat.status === 'failed' || // Keep failed chats indefinitely
            chat.status === 'processing' // Keep only processing chats
          )
        )
      }, 10000)
      
      return () => clearInterval(timer)
    }
  }, [pendingChats, conversations])

  // Start fade animation and remove chats from newly created set
  useEffect(() => {
    if (newlyCreatedChats.size > 0) {
      // Start fade animation after 5 seconds (show "Complete" for 5 seconds)
      const fadeTimer = setTimeout(() => {
        setFadingChats(new Set(newlyCreatedChats))
      }, 5000)
      
      // Remove from sets after animation completes (allow 0.5s for fade transition)
      const removeTimer = setTimeout(() => {
        // Remove completed pending chats that match newly created chats
        setPendingChats(prev => prev.filter(pendingChat => 
          !(pendingChat.status === 'completed' && newlyCreatedChats.has(pendingChat.result?.chatId || ''))
        ))
        
        setNewlyCreatedChats(new Set())
        setFadingChats(new Set())
      }, 5500)
      
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(removeTimer)
      }
    }
  }, [newlyCreatedChats])

  // Trigger chat loading when authentication completes - prevent multiple loads
  useEffect(() => {
    const currentWallet = publicKey?.toString() || null
    
    // Check if we should load conversations
    if (
      isActuallyAuthenticated && 
      currentWallet &&
      (!hasLoadedConversationsRef.current || lastAuthenticatedWalletRef.current !== currentWallet)
    ) {
      console.log('🔐 Auth state change detected, loading conversations...', {
        isAuthenticated: isActuallyAuthenticated,
        wallet: currentWallet,
        hasLoadedBefore: hasLoadedConversationsRef.current,
        lastWallet: lastAuthenticatedWalletRef.current
      })
      
      // Update tracking refs
      hasLoadedConversationsRef.current = true
      lastAuthenticatedWalletRef.current = currentWallet
      
      refreshConversations()
    } else if (!isActuallyAuthenticated || !currentWallet) {
      // Reset tracking when logged out or wallet disconnected
      hasLoadedConversationsRef.current = false
      if (!currentWallet) {
        lastAuthenticatedWalletRef.current = null
      }
    }
  }, [isActuallyAuthenticated, publicKey, refreshConversations])
  
  // Update timestamps every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampUpdate(prev => prev + 1)
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])

  // Handle mobile breakpoint detection
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Handle OS theme detection - DISABLED (force light mode)
  useEffect(() => {
    // Force light mode - disable OS theme detection
    setIsDarkMode(false)
    
    // Commented out OS theme detection:
    // const checkTheme = () => {
    //   const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    //   setIsDarkMode(isDark)
    // }
    // checkTheme()
    // const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    // mediaQuery.addEventListener('change', checkTheme)
    // return () => mediaQuery.removeEventListener('change', checkTheme)
  }, [])

  // Track loading state for scroll animation
  const prevIsLoadingMessages = useRef(false)
  
  // Auto-scroll behavior based on loading state
  useEffect(() => {
    // Check if loading just finished (transition from true to false)
    const loadingJustFinished = prevIsLoadingMessages.current && !isLoadingMessages
    
    // Update the ref for next render
    prevIsLoadingMessages.current = isLoadingMessages
    
    if (messagesContainerRef.current && currentChatMessages.length > 0) {
      if (loadingJustFinished) {
        // Chat just finished loading - do the animation
        
        // Wait for DOM to render the messages
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (messagesContainerRef.current) {
              // Set scroll to top
              messagesContainerRef.current.scrollTop = 0
              
              // Pause at top for 550ms to allow LinkPreview animations to complete
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  })
                }
              }, 550)
            }
          })
        })
      } else {
        // Not a fresh load - just scroll to bottom instantly (for new messages)
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }
  }, [isLoadingMessages, currentChatMessages])
  
  
  // Theme colors helper
  const colors = getThemeColors(isDarkMode)

  // Cleanup typing timeouts when chat changes or component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      isCurrentlyTypingRef.current = false
    }
  }, [selectedChat])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      isCurrentlyTypingRef.current = false
    }
  }, [])

  // Format conversations for display and sort by most recent activity
  const formattedChats = useMemo(() => {
    // Include timestampUpdate to trigger re-computation when timestamps need updating
    void timestampUpdate
    
    return conversations
      .sort((a, b) => {
        // Sort by last_activity in descending order (most recent first)
        const dateA = new Date(a.last_activity)
        const dateB = new Date(b.last_activity)
        return dateB.getTime() - dateA.getTime()
      })
      .map(conv => {
        const otherParticipant = conv.participants.find(p => p !== (publicKey?.toString() || ''))
        
        // Check if we have a saved contact for this wallet address
        const contactName = findContactByAddress(otherParticipant || '')
        
        // Use contact name if available, otherwise use formatted wallet address
        let title = 'Unknown'
        if (contactName) {
          title = contactName
        } else if (otherParticipant && otherParticipant.length > 12) {
          title = `${otherParticipant.slice(0, 8)}...${otherParticipant.slice(-4)}`
        } else {
          title = otherParticipant || 'Unknown'
        }
        
        const lastMessage = conv.last_message?.message_content || 'No messages yet'
        
        return {
          id: conv.id,
          title,
          lastMessage: lastMessage.length > 50 ? `${lastMessage.slice(0, 50)}...` : lastMessage,
          lastActivity: conv.last_activity
        }
      })
  }, [conversations, publicKey, timestampUpdate, contacts, findContactByAddress])

  const handleNewChat = () => {
    refreshUserContacts() // Refresh contacts from server
    setIsCreatingNewChat(true)
  }

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 Form validation:', {
      to: newChatData.to,
      message: newChatData.message,
      effectiveMessage: stickerState.getEffectiveMessage(),
      connected,
      publicKey: !!publicKey,
      isAuthenticated
    })
    
    // Validate form - use effective message which includes sticker logic
    const effectiveMessage = stickerState.getEffectiveMessage()
    if (!newChatData.to || !effectiveMessage) {
      alert('Please fill in all required fields')
      return
    }
    
    if (!connected || !publicKey) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!isAuthenticated) {
      alert('Please wait for wallet authentication to complete')
      return
    }
    
    // Go straight to NFT creation with immediate signature
    handleCreateNFTDirectly()
  }
  
  const handleCreateNFTDirectly = useCallback(async () => {
    try {
      setIsWaitingForSignature(true) // Start signature waiting state
      
      // Use effective message (original message if sticker selected, current message otherwise)
      const effectiveMessage = stickerState.getEffectiveMessage()
      
      console.log('🚀 Creating NFT chat with:', {
        recipientWallet: newChatData.to,
        messageContent: effectiveMessage,
        selectedSticker: stickerState.selectedSticker
      })
      
      // Use new immediate signature flow - wallet signature will popup immediately
      const { pendingChat, backgroundProcess } = await createNFTChatWithImmediateSignature(
        {
          recipientWallet: newChatData.to,
          messageContent: effectiveMessage,
          selectedSticker: stickerState.selectedSticker,
          theme: 'default',
          paymentMethod: newChatData.paymentMethod || 'SOL'
        },
        (pendingChat) => {
          // Add pending chat to sidebar immediately
          setPendingChats(prev => [pendingChat, ...prev])
        }
      )
      
      // Signature was successful, close modal and reset state
      setIsWaitingForSignature(false)
      setIsCreatingNewChat(false)
      
      // Clear form data and reset sticker state
      setNewChatData({ to: "", from: publicKey?.toString() || "", message: "", selectedSticker: null })
      stickerState.handleStickerSelect(null)
      stickerState.setCurrentMessage("")
      
      // Handle background processing result
      backgroundProcess.then((finalResult) => {
        setPendingChats(prev => 
          prev.map(chat => 
            chat.id === pendingChat.id 
              ? finalResult 
              : chat
          )
        )
        
        // If successful, refresh conversations and auto-select the new chat
        if (finalResult.status === 'completed' && finalResult.result?.chatId) {
          // Mark as newly created for success indicator
          setNewlyCreatedChats(prev => new Set(prev).add(finalResult.result.chatId))
          
          // Conversations should update automatically via real-time subscription
          
          // The new chat should automatically appear via realtime subscription
          // Auto-select the newly created chat after a brief delay to ensure it's in the conversations list
          setTimeout(() => {
            setSelectedChat(finalResult.result.chatId)
            loadChatMessages(finalResult.result.chatId)
            subscribeToMessageUpdates(finalResult.result.chatId)
          }, 100) // Small delay to ensure realtime subscription has processed the new chat
        }
      }).catch((error) => {
        console.error('Background NFT creation failed:', error)
        setPendingChats(prev => 
          prev.map(chat => 
            chat.id === pendingChat.id 
              ? { ...chat, status: 'failed', error: error.message }
              : chat
          )
        )
      })
      
    } catch (error) {
      console.error('NFT chat creation failed:', error)
      setIsWaitingForSignature(false)
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          alert('Transaction was cancelled. Please try again when ready to sign.')
        } else {
          alert(`Failed to create NFT chat: ${error.message}`)
        }
      } else {
        alert('Failed to create NFT chat. Please try again.')
      }
    }
  }, [newChatData.to, stickerState, createNFTChatWithImmediateSignature, publicKey, setPendingChats, setNewlyCreatedChats, setSelectedChat, loadChatMessages, subscribeToMessageUpdates])

  
  // Use the callback to call async createNFT operation
  const handleRetryPendingChat = useCallback(async (pendingChatId: string) => {
    const pendingChat = pendingChats.find(chat => chat.id === pendingChatId)
    if (!pendingChat) return

    try {
      // Reset the pending chat status to processing
      setPendingChats(prev => 
        prev.map(chat => 
          chat.id === pendingChatId 
            ? { ...chat, status: 'processing', error: undefined }
            : chat
        )
      )

      // Retry the NFT creation
      const { pendingChat: newPendingChat, backgroundProcess } = await createNFTChatWithImmediateSignature(
        {
          recipientWallet: pendingChat.recipient,
          messageContent: pendingChat.message,
          theme: pendingChat.theme,
          paymentMethod: pendingChat.paymentMethod || 'SOL'
        },
        (updatedPendingChat) => {
          // Update callback - not needed for retry
        }
      )

      // Wait for the background process to complete
      const finalResult = await backgroundProcess
      
      if (finalResult.status === 'completed' && finalResult.result?.chatId) {
        const chatId = finalResult.result.chatId
        console.log('NFT Chat retry successful with ID:', chatId)
        
        // Update pending chat to completed
        setPendingChats(prev => 
          prev.map(chat => 
            chat.id === pendingChatId 
              ? { ...chat, status: 'completed', result: { chatId } }
              : chat
          )
        )
        
        // Add to newly created set for animation
        setNewlyCreatedChats(prev => new Set(prev).add(chatId))
        
        // Refresh conversations to include the new chat
        refreshConversations()
        
        // Select the new chat after a short delay
        setTimeout(() => {
          setSelectedChat(chatId)
          loadChatMessages(chatId)
          subscribeToMessageUpdates(chatId)
          subscribeToReadReceiptsUpdates(chatId)
          clearUnreadStatus(chatId)
        }, 1000)
      } else {
        // Type guard: if status is not 'completed', it must be 'failed' which has an error property
        const errorMessage = finalResult.status === 'failed' ? finalResult.error : 'Failed to create chat'
        throw new Error(errorMessage || 'Failed to create chat')
      }
    } catch (error) {
      console.error('Error retrying NFT chat:', error)
      
      // Update pending chat to failed again
      setPendingChats(prev => 
        prev.map(chat => 
          chat.id === pendingChatId 
            ? { ...chat, status: 'failed', error: (error as Error).message || 'Failed to create chat' }
            : chat
        )
      )
    }
  }, [pendingChats, createNFTChatWithImmediateSignature, refreshConversations, loadChatMessages, subscribeToMessageUpdates, subscribeToReadReceiptsUpdates, clearUnreadStatus])

  const handleChatSelect = useCallback((chatId: string) => {
    console.log('💬 Selecting chat:', chatId)
    
    // Clear previous chat
    clearCurrentChat()
    
    // Set new chat - the loading state will trigger the animation
    setSelectedChat(chatId)
    loadChatMessages(chatId)
    subscribeToMessageUpdates(chatId)
    subscribeToReadReceiptsUpdates(chatId)
    subscribeToPresenceUpdates(chatId)
    setOnlineStatus(chatId, true)
    
    // Clear unread status for this chat
    clearUnreadStatus(chatId)
    
    // Close mobile menu when chat is selected
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }, [clearCurrentChat, loadChatMessages, subscribeToMessageUpdates, subscribeToReadReceiptsUpdates, subscribeToPresenceUpdates, setOnlineStatus, clearUnreadStatus, isMobile])

  const handleSendSticker = useCallback(async (stickerName: string) => {
    if (!selectedChat) return
    
    console.log('🎪 handleSendSticker called:', {
      stickerName,
      selectedChat
    })
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat)
      if (!selectedConversation) return
      
      const recipientWallet = selectedConversation.participants.find(p => p !== publicKey?.toString())
      if (!recipientWallet) return
      
      // Send sticker message immediately
      await sendMessage({
        chatId: selectedChat,
        content: "Sent a sticker",
        messageType: 'sticker',
        metadata: {
          sticker_name: stickerName
        },
        recipientWallet
      })
      
      console.log('✅ Sticker sent successfully')
      setIsChatStickerPickerOpen(false)
    } catch (error) {
      console.error('❌ Error sending sticker:', error)
    }
  }, [selectedChat, conversations, publicKey, sendMessage])

  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!selectedChat) return
    
    console.log('🎤 handleSendVoice called:', {
      duration,
      selectedChat,
      blobSize: audioBlob.size
    })
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat)
      if (!selectedConversation) return
      
      const recipientWallet = selectedConversation.participants.find(p => p !== publicKey?.toString())
      if (!recipientWallet) return
      
      // For now, send voice message with placeholder until upload is fixed
      await sendMessage({
        chatId: selectedChat,
        content: `Voice message (${Math.round(duration)}s)`,
        messageType: 'voice',
        metadata: {
          duration: Math.round(duration),
          file_type: 'audio/webm',
          // Store blob as base64 for now (temporary solution)
          audio_data: await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(audioBlob)
          })
        },
        recipientWallet
      })
      
      console.log('✅ Voice message sent successfully')
    } catch (error) {
      console.error('❌ Error sending voice message:', error)
    }
  }, [selectedChat, conversations, publicKey, sendMessage])

  // Image upload handlers
  const handleFileSelect = useCallback((file: File) => {
    console.log('🖼️ File selected:', {
      name: file.name,
      size: file.size,
      type: file.type
    })
    
    // Only allow 1 image at a time - replace any existing image
    setSelectedImages([file])
  }, [])

  const handleRemoveImage = useCallback((index: number) => {
    console.log('🗑️ Removing image at index:', index)
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleSendImagesWithText = useCallback(async (textContent: string, recipientWallet: string, chatId: string) => {
    console.log('🖼️ Sending images with text:', {
      textContent,
      imageCount: selectedImages.length,
      chatId
    })
    
    // Store selected images before clearing
    const imagesToUpload = [...selectedImages]
    
    // Create all upload entries BEFORE clearing images
    const uploadEntries = imagesToUpload.map(file => {
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return {
        id: uploadId,
        file,
        entry: {
          file,
          progress: 0,
          status: 'uploading' as const,
          chatId,
          recipientWallet
        }
      }
    })
    
    // Add all uploads to tracking state
    setUploadingImages(prev => {
      const newMap = new Map(prev)
      uploadEntries.forEach(({ id, entry }) => {
        newMap.set(id, entry)
      })
      return newMap
    })
    
    // Clear selected images from state immediately after starting uploads
    setSelectedImages([])
    
    // Process each image
    for (const { id: uploadId, file } of uploadEntries) {
      try {
        console.log(`📤 Processing image ${uploadId}:`, file.name)
        
        // Convert to base64
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
        })
        reader.readAsDataURL(file)
        const base64Data = await base64Promise
        
        // Update progress
        setUploadingImages(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(uploadId)
          if (existing) {
            newMap.set(uploadId, { ...existing, progress: 50 })
          }
          return newMap
        })
        
        // Send the image with metadata - only use custom text, no default text
        const messageContent = textContent.trim() || ""
        await sendMessage({
          chatId,
          content: messageContent,
          messageType: 'image',
          metadata: {
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            upload_id: uploadId,
            file_data: base64Data
          },
          recipientWallet
        })
        
        console.log(`✅ Image ${uploadId} sent successfully`)
        
        // Mark as complete and remove after a delay
        setUploadingImages(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(uploadId)
          if (existing) {
            newMap.set(uploadId, { ...existing, progress: 100, status: 'uploading' })
          }
          return newMap
        })
        
        // Remove from tracking after animation
        setTimeout(() => {
          setUploadingImages(prev => {
            const newMap = new Map(prev)
            newMap.delete(uploadId)
            return newMap
          })
        }, 2000)
        
      } catch (error) {
        console.error(`❌ Error uploading image ${uploadId}:`, error)
        
        // Mark as error
        setUploadingImages(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(uploadId)
          if (existing) {
            newMap.set(uploadId, { 
              ...existing, 
              status: 'error', 
              error: (error as Error).message || 'Upload failed' 
            })
          }
          return newMap
        })
        
        // Keep error state visible for longer
        setTimeout(() => {
          setUploadingImages(prev => {
            const newMap = new Map(prev)
            newMap.delete(uploadId)
            return newMap
          })
        }, 5000)
      }
    }
  }, [selectedImages, sendMessage])

  // Handle typing indicator functions
  const handleStartTyping = useCallback(() => {
    if (!selectedChat || isCurrentlyTypingRef.current) return
    
    console.log('⌨️ Starting typing indicator')
    isCurrentlyTypingRef.current = true
    startTyping(selectedChat)
  }, [selectedChat, startTyping])

  const handleExtendTyping = useCallback(() => {
    if (!selectedChat || !isCurrentlyTypingRef.current) return
    
    console.log('⌨️ Extending typing indicator')
    extendTyping(selectedChat)
  }, [selectedChat, extendTyping])

  const handleStopTyping = useCallback(() => {
    if (!selectedChat || !isCurrentlyTypingRef.current) return
    
    console.log('⌨️ Stopping typing indicator')
    isCurrentlyTypingRef.current = false
    stopTyping(selectedChat)
  }, [selectedChat, stopTyping])

  // Enhanced message input handler with typing detection
  const handleMessageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)
    
    if (value.length > 0) {
      // Start typing indicator if not already typing, extend if already typing
      if (!isCurrentlyTypingRef.current) {
        handleStartTyping()
      } else {
        // User is continuing to type - extend the typing indicator
        handleExtendTyping()
      }
      
      // Reset the typing timeout on EVERY keystroke when typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout - typing stops after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping()
      }, 3000)
    } else {
      // Stop typing when message is cleared
      if (isCurrentlyTypingRef.current) {
        handleStopTyping()
      }
    }
  }, [handleStartTyping, handleExtendTyping, handleStopTyping])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🎯 handleSendMessage called:', {
      message: message.trim(),
      selectedChatSticker,
      selectedChat,
      hasMessage: !!message.trim(),
      hasSticker: !!selectedChatSticker,
      hasImages: selectedImages.length > 0,
      imageCount: selectedImages.length
    })
    
    // Allow sending if there's a message OR images (images can be sent without text)
    if ((!message.trim() && selectedImages.length === 0) || !selectedChat) {
      console.log('❌ Message send blocked - insufficient data:', {
        hasMessage: !!message.trim(),
        hasImages: selectedImages.length > 0,
        hasSelectedChat: !!selectedChat
      })
      return
    }
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat)
      if (!selectedConversation) return
      
      const recipientWallet = selectedConversation.participants.find(p => p !== publicKey?.toString())
      if (!recipientWallet) return
      
      // Stop typing indicator before sending
      handleStopTyping()
      
      // Handle image sending if there are images
      if (selectedImages.length > 0) {
        console.log('📸 Sending message with images')
        await handleSendImagesWithText(message.trim(), recipientWallet, selectedChat)
        setMessage("")
        return
      }
      
      // Send regular text message
      if (message.trim()) {
        console.log('📤 Sending text message')
        await sendMessage({
          chatId: selectedChat,
          content: message.trim(),
          recipientWallet,
          messageType: 'text'
        })
        
        setMessage("")
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }, [message, selectedChat, conversations, publicKey, sendMessage, handleStopTyping, selectedImages, handleSendImagesWithText, selectedChatSticker])
  
  const handleCancelNewChat = useCallback(() => {
    setIsCreatingNewChat(false)
    setIsWaitingForSignature(false)
    setNewChatData({ to: "", from: connected && publicKey ? publicKey.toString() : "", message: "", selectedSticker: null })
    setIsStickerPickerOpen(false)
    stickerState.handleStickerSelect(null)
    stickerState.setCurrentMessage("")
  }, [connected, publicKey, stickerState])

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={isDarkMode ? "/Dark-1-min.png?v=2" : "/Light-1-min.webp?v=2"}
          alt="Background"
          fill
          className="object-cover md:object-cover object-left-bottom"
          priority
        />
      </div>

      {/* Paper Texture Behind Main Window */}
      <div 
        className="absolute inset-0 z-[5] pointer-events-none"
        style={{
          backgroundImage: 'url(/Paper-Texture-7.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'multiply',
          opacity: 0.6
        }}
      />

      {/* Mobile Welcome Screen - Logo (behind main app) */}
      {isMobile && !hideWelcomeScreen && (
        <div className="fixed inset-0 z-[8] flex flex-col items-center justify-center px-6 pointer-events-none">
          {/* Logo - bigger size */}
          <div className="mb-8">
            <Image src="/stork-logo.svg" alt="Stork Logo" width={240} height={80} className="h-24 w-auto" />
          </div>
        </div>
      )}

      {/* Mobile Welcome Screen - Connect wallet button (only show on initial load, never after auth) */}
      {isMobile && !hideWelcomeScreen && !hasEverAuthenticated && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center px-6 pointer-events-none">
          <div className="mb-8 invisible">
            {/* Invisible spacer to match logo position */}
            <div className="h-24 w-auto"></div>
          </div>
          
          {/* Connect wallet button */}
          <div className="pointer-events-auto">
            <WalletButton />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div 
        className="relative z-[100]"
        style={{
          transform: isAppLoaded ? 'translateY(0)' : `translateY(${isMobile ? '-100vh' : '-100vh'})`,
          transition: 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
      >
        <MobileHeader
          isMobileMenuOpen={isMobileMenuOpen}
          selectedChat={selectedChat}
          conversations={conversations}
          publicKey={publicKey ? publicKey.toString() : null}
          isDarkMode={isDarkMode}
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          showCopyToast={showCopyToast}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onCopyWalletAddress={handleCopyWalletAddress}
          onContactRefresh={refreshUserContacts}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 h-screen w-full md:p-8 md:flex md:justify-center">
        <div 
          className={`h-full w-full max-w-[2000px] md:border-4 flex relative ${isMobile ? '' : ''}`}
          style={{ 
            backgroundColor: colors.bg, 
            borderColor: colors.border,
            transform: isAppLoaded ? 'translateY(0)' : `translateY(${isMobile ? '-120vh' : '-60vh'})`,
            transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            opacity: isAppLoaded ? 1 : (isMobile ? 0 : 1)
          }}
        >
          {/* Paper Texture Over App Window */}
          <div 
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              backgroundImage: 'url(/Paper-Texture-7.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              mixBlendMode: 'multiply',
              opacity: isDarkMode ? 0.8 : 0.4
            }}
          />
          
          
          {/* Left Sidebar */}
          <ChatSidebar
            isMobile={isMobile}
            isMobileMenuOpen={isMobileMenuOpen}
            isDarkMode={isDarkMode}
            selectedChat={selectedChat}
            conversations={conversations}
            formattedChats={formattedChats}
            pendingChats={pendingChats}
            isLoadingConversations={isLoadingConversations}
            connectionStatus={connectionStatus}
            authError={authError}
            isAuthenticating={isAuthenticating}
            unreadThreads={unreadThreads}
            newlyCreatedChats={newlyCreatedChats}
            fadingChats={fadingChats}
            progress={progress}
            getCurrentStep={getCurrentStep}
            canCreate={!!canCreate}
            connected={connected}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
            onRetryPendingChat={handleRetryPendingChat}
            onContactRefresh={refreshUserContacts}
            formatRelativeTime={formatRelativeTime}
          />

          {/* Main Chat Area */}
          <div className={`flex-1 flex flex-col relative z-[1] ${isMobile ? 'w-full' : ''}`} style={{ overflow: 'hidden' }}>
            {/* Desktop Header with Chat Info and Connect Wallet */}
            <div 
              className="hidden md:flex items-center justify-between p-6 relative"
              style={{ 
                background: `linear-gradient(to bottom, ${colors.bg}, transparent)` 
              }}
            >
              {/* Chat Info - Left Side */}
              <div className="flex flex-col">
                {selectedChat && (() => {
                  const selectedConversation = conversations.find(c => c.id === selectedChat)
                  const otherParticipant = selectedConversation?.participants.find(p => p !== publicKey?.toString())
                  
                  if (!otherParticipant) return null
                  
                  const contact = findFullContactByAddress(otherParticipant)
                  
                  return (
                    <>
                      {contact ? (
                        <ContactHeader
                          contactName={contact.name}
                          contactAddress={otherParticipant}
                          profilePictureUrl={contact.pfp}
                          onClick={handleCopyWalletAddress}
                          showCopyToast={showCopyToast}
                          isDarkMode={isDarkMode}
                          className="text-lg font-medium"
                          style={{
                            fontFamily: "Helvetica Neue, sans-serif"
                          }}
                          isMobile={false}
                        />
                      ) : (
                        <DomainDisplay 
                          address={otherParticipant}
                          onClick={handleCopyWalletAddress}
                          showCopyToast={showCopyToast}
                          isDarkMode={isDarkMode}
                          className="text-lg font-medium"
                          style={{
                            fontFamily: "Helvetica Neue, sans-serif"
                          }}
                          showLoadingSkeleton={true}
                          maxLength={24}
                        />
                      )}
                      
                      {/* Online Status - positioned beneath receiver wallet address on far left */}
                      <OnlineStatus 
                        isOnline={onlineUsers.has(otherParticipant)}
                        isTyping={typingUsers.has(otherParticipant)}
                        showCopyFeedback={showCopyToast}
                        className="mt-1"
                      />
                    </>
                  )
                })()}
              </div>

              {/* Wallet Button - Right Side */}
              <WalletButton />
            </div>

            {/* Chat Content */}
            {selectedChat ? (
              <div className="flex-1 flex flex-col relative" style={{ overflow: 'visible', maxHeight: isMobile ? 'calc(100vh - 73px - 80px)' : 'calc(100vh - 168px)', gap: 0 }}>
                <MessageDisplay
                  selectedChat={selectedChat}
                  currentChatMessages={currentChatMessages}
                  isLoadingMessages={isLoadingMessages}
                  publicKey={publicKey ? publicKey.toString() : null}
                  connected={connected}
                  isAuthenticated={isAuthenticated}
                  isDarkMode={isDarkMode}
                  isMobile={isMobile}
                  messagesContainerRef={messagesContainerRef}
                  conversations={conversations}
                  readReceipts={readReceipts}
                  getStatusFromMessage={getStatusFromMessage}
                  isMessageEncrypted={isMessageEncrypted}
                  getMessageTimestamp={getMessageTimestamp}
                  retryMessage={retryMessage}
                />
                
                {/* MessageInput - Desktop only when chat selected */}
                {!isMobile && (
                  <MessageInput
                    message={message}
                    isInputFocused={isInputFocused}
                    isChatStickerPickerOpen={isChatStickerPickerOpen}
                    selectedImages={selectedImages}
                    isMobile={isMobile}
                    isDarkMode={isDarkMode}
                    connected={connected}
                    publicKey={publicKey ? publicKey.toString() : null}
                    isAuthenticated={isAuthenticated}
                    chatStickerButtonRef={chatStickerButtonRef}
                    onMessageChange={handleMessageInputChange}
                    onSendMessage={handleSendMessage}
                    onInputFocus={() => setIsInputFocused(true)}
                    onInputBlur={() => setIsInputFocused(false)}
                    onStickerPickerToggle={() => setIsChatStickerPickerOpen(!isChatStickerPickerOpen)}
                    onStickerPickerClose={() => setIsChatStickerPickerOpen(false)}
                    onStickerSend={handleSendSticker}
                    onFileSelect={handleFileSelect}
                    onRemoveImage={handleRemoveImage}
                    onSendVoice={handleSendVoice}
                    handleNewChat={handleNewChat}
                  />
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <Button
                  onClick={handleNewChat}
                  className="rounded-none h-12 px-8 hover:opacity-80"
                  style={{ 
                    fontFamily: "SelfWritten-Regular, Helvetica Neue, sans-serif", 
                    fontSize: "18px",
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `2px solid ${colors.border}`
                  }}
                >
                  Start a new chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile MessageInput - Only when chat selected, not loading, and sidebar closed */}
      {isMobile && selectedChat && !isLoadingMessages && !isMobileMenuOpen && (
        <MessageInput
          message={message}
          isInputFocused={isInputFocused}
          isChatStickerPickerOpen={isChatStickerPickerOpen}
          selectedImages={selectedImages}
          isMobile={isMobile}
          isDarkMode={isDarkMode}
          connected={connected}
          publicKey={publicKey ? publicKey.toString() : null}
          isAuthenticated={isAuthenticated}
          chatStickerButtonRef={chatStickerButtonRef}
          onMessageChange={handleMessageInputChange}
          onSendMessage={handleSendMessage}
          onInputFocus={() => setIsInputFocused(true)}
          onInputBlur={() => setIsInputFocused(false)}
          onStickerPickerToggle={() => setIsChatStickerPickerOpen(!isChatStickerPickerOpen)}
          onStickerPickerClose={() => setIsChatStickerPickerOpen(false)}
          onStickerSend={handleSendSticker}
          onFileSelect={handleFileSelect}
          onRemoveImage={handleRemoveImage}
          onSendVoice={handleSendVoice}
          handleNewChat={handleNewChat}
        />
      )}


      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isCreatingNewChat}
        isMobile={isMobile}
        isDarkMode={isDarkMode}
        connected={connected}
        publicKey={publicKey ? publicKey.toString() : null}
        isAuthenticated={isAuthenticated}
        isAuthenticating={isAuthenticating}
        isWaitingForSignature={isWaitingForSignature}
        newChatData={newChatData}
        stickerState={stickerState}
        onClose={handleCancelNewChat}
        onSubmit={handleSendInvitation}
        onChatDataChange={(data) => {
          setNewChatData(data)
          // Don't sync message back to sticker state - let NewChatModal handle it
          // to prevent circular updates that break sticker logic
        }}
        onStickerPickerOpen={() => setIsStickerPickerOpen(true)}
        onCanvasReady={setPreviewCanvasData}
      />

      {/* Sticker Picker Modal */}
      <StickerPicker
        selectedSticker={stickerState.selectedSticker}
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onStickerSelect={stickerState.handleStickerSelect}
        colors={colors}
      />

      {/* Development Test Button - Hidden */}
      {false && process.env.NODE_ENV === 'development' && subscription && permission === 'granted' && (
        <button
          onClick={sendTestNotification}
          className="fixed bottom-4 right-4 z-[200] px-4 py-2 bg-blue-500 text-white rounded border-2 border-white"
          style={{ fontFamily: "Helvetica Neue, sans-serif" }}
        >
          Test Push
        </button>
      )}

    </div>
  )
}