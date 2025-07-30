"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Menu, X, Send, AlertCircle } from "lucide-react"
import Image from "next/image"
import { WalletButton } from "@/components/wallet-button"
import { useWallet } from "@solana/wallet-adapter-react"
import { useNFTChatCreation } from "@/hooks/useNFTChatCreation"
import { useRealtimeMessaging } from "@/hooks/useRealtimeMessaging"
import { useAuth } from "@/contexts/AuthContext"
import { useNFTVerification } from "@/hooks/useNFTVerification"
import { MessageStatus, useMessageStatus } from "@/components/MessageStatus"
import StickerPicker, { useStickerState } from "@/components/StickerPicker"
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

interface NewChatData {
  to: string
  from: string
  message: string
  selectedSticker?: string | null
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
  const [pendingChats, setPendingChats] = useState<unknown[]>([])
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
  
  // Access properties directly from the context
  const isAuthenticated = authState.isAuthenticated
  const isAuthenticating = authState.isAuthenticating
  const authError = authState.error
  
  // Single authentication check to prevent multiple reactive dependencies
  const isActuallyAuthenticated = authState.authStatus === 'authenticated'
  
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
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
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
  }, [selectedChat])

  // Handle new messages from realtime subscription (fixed stale closure issue)
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
        // Only mark as unread if it's NOT the currently selected chat
        if (message.chat_id !== currentSelectedChat) {
          console.log('🔵 Marking chat as unread:', message.chat_id)
          addUnreadStatus(message.chat_id)
        }
        
        // Always play notification sound for received messages (even in open chats)
        if (audioInitialized && userInteracted && audioRef.current) {
          console.log('🔊 Playing notification sound for received message')
          audioRef.current.play().catch(err => {
            console.error('❌ Failed to play notification sound:', err)
            console.log('Audio state:', {
              audioInitialized,
              userInteracted,
              hasAudioRef: !!audioRef.current,
              audioSrc: audioRef.current?.src
            })
          })
        } else {
          console.log('🔇 Notification sound skipped:', {
            audioInitialized,
            userInteracted,
            hasAudioRef: !!audioRef.current
          })
        }
      } else {
        console.log('✅ Message is from current user, no notification needed (detected by hook)')
      }
    })
    
    return unsubscribe
  }, [onNewMessage, audioInitialized, userInteracted]) // Removed selectedChat to fix stale closure

  // Auto-populate the From field when wallet is connected
  useEffect(() => {
    if (connected && publicKey) {
      setNewChatData((prev) => ({
        ...prev,
        from: publicKey.toString(),
      }))
    } else {
      setNewChatData((prev) => ({
        ...prev,
        from: "",
      }))
    }
  }, [connected, publicKey])

  // Sync sticker state with newChatData
  useEffect(() => {
    if (stickerState.currentMessage !== newChatData.message) {
      setNewChatData(prev => ({
        ...prev,
        message: stickerState.currentMessage
      }))
    }
  }, [stickerState.currentMessage, newChatData.message])

  // Sync selected sticker with newChatData
  useEffect(() => {
    if (stickerState.selectedSticker !== newChatData.selectedSticker) {
      setNewChatData(prev => ({
        ...prev,
        selectedSticker: stickerState.selectedSticker
      }))
    }
  }, [stickerState.selectedSticker, newChatData.selectedSticker])

  // Clean up completed pending chats after 5 seconds OR immediately if they exist in conversations
  useEffect(() => {
    const completedChats = pendingChats.filter(chat => 
      chat.status === 'completed' || chat.status === 'failed'
    )
    
    if (completedChats.length > 0) {
      // Check if any completed chats now exist in the conversations list
      const conversationIds = new Set(conversations.map(conv => conv.id))
      const shouldCleanupImmediately = pendingChats.some(chat => 
        chat.status === 'completed' && 
        chat.result?.chatId && 
        conversationIds.has(chat.result.chatId)
      )
      
      if (shouldCleanupImmediately) {
        // Immediate cleanup for chats that now exist in conversations
        setPendingChats(prev => 
          prev.filter(chat => {
            if (chat.status === 'completed' && chat.result?.chatId && conversationIds.has(chat.result.chatId)) {
              return false // Remove this chat immediately
            }
            return chat.status === 'processing' || chat.status === 'failed' // Keep processing and failed chats
          })
        )
      } else {
        // Standard 10-second cleanup for completed/failed chats not yet in conversations
        const timer = setTimeout(() => {
          setPendingChats(prev => 
            prev.filter(chat => 
              chat.status === 'processing' // Keep only processing chats
            )
          )
        }, 10000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [pendingChats, conversations])

  // Start fade animation and remove chats from newly created set
  useEffect(() => {
    if (newlyCreatedChats.size > 0) {
      // Start fade animation after 2.5 seconds
      const fadeTimer = setTimeout(() => {
        setFadingChats(new Set(newlyCreatedChats))
      }, 2500)
      
      // Remove completely after 3 seconds
      const removeTimer = setTimeout(() => {
        setNewlyCreatedChats(new Set())
        setFadingChats(new Set())
      }, 3000)
      
      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(removeTimer)
      }
    }
  }, [newlyCreatedChats])

  // Trigger chat loading when authentication completes - prevent multiple loads
  useEffect(() => {
    const currentWallet = publicKey?.toString() || null
    
    // Only trigger when:
    // 1. Authentication is complete
    // 2. Wallet is connected  
    // 3. Not already loading
    // 4. Haven't loaded for this wallet yet
    if (isActuallyAuthenticated && connected && publicKey && !isLoadingConversations) {
      // Check if this is a new authentication session
      if (!hasLoadedConversationsRef.current || lastAuthenticatedWalletRef.current !== currentWallet) {
        console.log('🎯 Authentication completed - loading conversations for wallet:', currentWallet?.slice(0, 8) + '...')
        hasLoadedConversationsRef.current = true
        lastAuthenticatedWalletRef.current = currentWallet
        refreshConversations()
      } else {
        console.log('🔄 Authentication state changed but conversations already loaded for this wallet')
      }
    }
    
    // Reset loaded flag when authentication is lost
    if (!isActuallyAuthenticated) {
      hasLoadedConversationsRef.current = false
      lastAuthenticatedWalletRef.current = null
    }
  }, [isActuallyAuthenticated, connected, publicKey, isLoadingConversations, refreshConversations])
  
  // Separate effect to handle wallet connection/disconnection
  useEffect(() => {
    if (!connected || !publicKey) {
      console.log('🔌 Wallet disconnected - clearing conversations if any exist')
      // Wallet disconnected, conversations will be cleared by the auth hook
    }
  }, [connected, publicKey])


  // Update relative timestamps every minute
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

  // Handle OS theme detection
  useEffect(() => {
    const checkTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(isDark)
    }

    checkTheme()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)
    
    return () => mediaQuery.removeEventListener('change', checkTheme)
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
  }, [currentChatMessages, isLoadingMessages])

  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    if (messagesContainerRef.current && typingUsers.size > 0) {
      // Scroll to bottom smoothly when someone starts typing
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100) // Small delay to allow the typing indicator to render
    }
  }, [typingUsers.size])

  // Theme colors helper
  const getThemeColors = () => ({
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  })

  const colors = getThemeColors()

  // Helper function to format relative time
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

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d`
    } else {
      return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

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
        const title = otherParticipant ? `${otherParticipant.slice(0, 8)}...${otherParticipant.slice(-4)}` : 'Unknown'
        const lastMessage = conv.last_message?.message_content || 'No messages yet'
        
        return {
          id: conv.id,
          title,
          lastMessage: lastMessage.length > 50 ? `${lastMessage.slice(0, 50)}...` : lastMessage,
          lastActivity: conv.last_activity
        }
      })
  }, [conversations, publicKey, timestampUpdate])

  const handleNewChat = () => {
    setIsCreatingNewChat(true)
  }

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!newChatData.to || !newChatData.message) {
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
    
    if (!isAuthenticated) {
      alert('Please sign with your wallet to create NFT chats')
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
      
      // Use new immediate signature flow - wallet signature will popup immediately
      const { pendingChat, backgroundProcess } = await createNFTChatWithImmediateSignature(
        {
          recipientWallet: newChatData.to,
          messageContent: effectiveMessage,
          selectedSticker: stickerState.selectedSticker,
          theme: 'default'
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
      
      // Check if this is a user rejection
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isUserRejection = errorMessage.includes('User rejected') || 
                               errorMessage.includes('rejected') || 
                               errorMessage.includes('cancelled') ||
                               errorMessage.includes('denied')
      
      if (isUserRejection) {
        // Show rejection message in modal instead of alert
        alert('User rejected transaction')
      } else {
        // Show other errors
        alert(`Failed to create chat: ${errorMessage}`)
      }
    }
  }, [newChatData, createNFTChatWithImmediateSignature, publicKey])

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

      // Retry the NFT creation using the stored data
      const { backgroundProcess } = await createNFTChatWithImmediateSignature({
        recipientWallet: pendingChat.recipient,
        messageContent: pendingChat.message,
        theme: pendingChat.theme
      })

      // Handle the retry result
      backgroundProcess.then((finalResult) => {
        setPendingChats(prev => 
          prev.map(chat => 
            chat.id === pendingChatId 
              ? finalResult 
              : chat
          )
        )
      }).catch((error) => {
        console.error('Retry failed:', error)
        setPendingChats(prev => 
          prev.map(chat => 
            chat.id === pendingChatId 
              ? { ...chat, status: 'failed', error: error.message }
              : chat
          )
        )
      })

    } catch (error) {
      console.error('Retry initiation failed:', error)
      setPendingChats(prev => 
        prev.map(chat => 
          chat.id === pendingChatId 
            ? { ...chat, status: 'failed', error: error instanceof Error ? error.message : 'Retry failed' }
            : chat
        )
      )
    }
  }, [pendingChats, createNFTChatWithImmediateSignature])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancelNewChat()
    }
  }

  const handleChatSelect = useCallback((chatId: string) => {
    console.log('💬 Selecting chat:', chatId)
    
    // Clear previous chat
    clearCurrentChat()
    
    // Set new chat - the loading state will trigger the animation
    setSelectedChat(chatId)
    loadChatMessages(chatId)
    subscribeToMessageUpdates(chatId)
    
    console.log('🔔 About to call subscribeToReadReceiptsUpdates with:', chatId)
    subscribeToReadReceiptsUpdates(chatId)
    console.log('✅ Called subscribeToReadReceiptsUpdates')
    
    console.log('👥 About to call subscribeToPresenceUpdates with:', chatId)
    subscribeToPresenceUpdates(chatId)
    console.log('✅ Called subscribeToPresenceUpdates')
    
    // Set online status when joining chat
    setOnlineStatus(chatId, true)
    
    // Clear unread status for this thread (FIX: This was missing!)
    console.log('🔵 Clearing unread status for chat:', chatId)
    clearUnreadStatus(chatId)
    
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
        recipientWallet,
        messageType: 'sticker',
        metadata: {
          sticker_name: stickerName,
          sticker_url: `/Message-Stickers/${stickerName}`
        }
      })
      
      console.log('✅ Sticker sent successfully:', stickerName)
      
    } catch (error) {
      console.error('❌ Failed to send sticker:', error)
    }
  }, [selectedChat, conversations, publicKey, sendMessage])

  const handleSendVoice = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!selectedChat) return
    
    console.log('🎤 handleSendVoice called:', {
      duration,
      size: audioBlob.size,
      selectedChat
    })
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat)
      if (!selectedConversation) return
      
      const recipientWallet = selectedConversation.participants.find(p => p !== publicKey?.toString())
      if (!recipientWallet) return

      // Generate unique message ID for this voice message
      const messageId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Upload voice file to R2 storage
      const formData = new FormData()
      formData.append('audio', audioBlob, 'voice_message.mp4')
      formData.append('messageId', messageId)
      formData.append('duration', duration.toString())

      const walletAddress = publicKey?.toString()
      if (!walletAddress) throw new Error('Wallet not connected')

      // Get auth token
      const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
      if (!storedData) throw new Error('No authentication token available')
      
      const authData = JSON.parse(storedData)
      const authToken = authData.token

      console.log('📤 Uploading voice message to R2...')
      
      const uploadResponse = await fetch('/api/voice-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Wallet-Address': walletAddress
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || 'Failed to upload voice message')
      }

      const uploadResult = await uploadResponse.json()
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed')
      }

      console.log('✅ Voice file uploaded successfully:', uploadResult.data)

      // Send voice message with file information
      await sendMessage({
        chatId: selectedChat,
        content: "",
        recipientWallet,
        messageType: 'voice',
        // File fields for voice message
        file_url: uploadResult.data.file_url,
        file_name: uploadResult.data.file_name,
        file_size: uploadResult.data.file_size,
        file_type: uploadResult.data.file_type,
        metadata: {
          duration: uploadResult.data.duration,
          expires_at: uploadResult.data.expires_at,
          upload_key: uploadResult.data.upload_key
        }
      })

      console.log('✅ Voice message sent successfully')
      
    } catch (error) {
      console.error('❌ Failed to send voice message:', error)
      throw error // Re-throw so VoiceRecorder can handle the error
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
    const newUploads = new Map()
    const uploadIds: string[] = []
    
    imagesToUpload.forEach(file => {
      const uploadId = `upload_${Date.now()}_${Math.random()}`
      uploadIds.push(uploadId)
      newUploads.set(uploadId, {
        file,
        progress: 0,
        url: '', // Don't create blob URL yet - not needed for skeleton
        chatId,
        recipientWallet,
        status: 'uploading'
      })
    })
    
    // Use flushSync to force immediate render
    flushSync(() => {
      // Clear selected images and add upload placeholders in same render
      setSelectedImages([])
      setUploadingImages(prev => new Map([...prev, ...newUploads]))
    })
    
    // Use requestAnimationFrame to ensure UI updates before any other work
    requestAnimationFrame(() => {
      try {
        // Do everything else asynchronously after UI updates
        setTimeout(async () => {
        // Create blob URLs asynchronously
        uploadIds.forEach((uploadId, index) => {
          const file = imagesToUpload[index]
          const localBlobUrl = URL.createObjectURL(file)
          
          setUploadingImages(prev => {
            const updated = new Map(prev)
            const uploadData = updated.get(uploadId)
            if (uploadData) {
              updated.set(uploadId, {
                ...uploadData,
                url: localBlobUrl
              })
            }
            return updated
          })
        })
        
        // Calculate dimensions asynchronously
        imagesToUpload.forEach(async (file, index) => {
          try {
            const originalDimensions = await getSimpleImageDimensions(file)
            const imageDimensions = calculateSimpleResize(originalDimensions.width, originalDimensions.height, 400, 300)
            
            // Update with proper dimensions
            setUploadingImages(prev => {
              const updated = new Map(prev)
              const uploadData = updated.get(uploadIds[index])
              if (uploadData) {
                updated.set(uploadIds[index], {
                  ...uploadData,
                  // Store dimensions for later use if needed
                })
              }
              return updated
            })
          } catch (dimensionError) {
            console.warn(`⚠️ Failed to get image dimensions for ${file.name}, using fallback:`, dimensionError)
          }
        })
        // If there's text content, send it as a separate text message first
        if (textContent.trim()) {
          await sendMessage({
            chatId,
            content: textContent.trim(),
            recipientWallet,
            messageType: 'text',
            metadata: {}
          })
        }

        // Send each image as a separate message
        for (const file of imagesToUpload) {
          try {
            console.log(`🖼️ Processing image: ${file.name}`)
            
            // Upload and process image directly (no placeholder message)
            uploadAndUpdateImageMessage(file, chatId, recipientWallet)
            
          } catch (error) {
            console.error(`❌ Failed to send image ${file.name}:`, error)
            // Continue with other images
          }
        }
        
        console.log('✅ All images queued for upload')
      }, 0)
      } catch (error) {
        console.error('❌ Failed to send images with text:', error)
        throw error
      }
    })
  }, [selectedImages, sendMessage])

  const uploadAndUpdateImageMessage = useCallback(async (file: File, chatId: string, recipientWallet: string) => {
    let uploadBlob: Blob = file
    let retryCount = 0
    const maxRetries = 2
    
    // Find existing upload placeholder for this file (if it was pre-created)
    let uploadId: string | null = null
    let existingUploadEntry = false
    let imageDimensions = { width: 300, height: 200 } // fallback dimensions
    
    // Check if upload placeholder already exists for this file
    uploadingImages.forEach((uploadData, id) => {
      if (uploadData.file === file && uploadData.chatId === chatId) {
        uploadId = id
        existingUploadEntry = true
      }
    })
    
    try {
      // Skip client-side WebP conversion - let server handle it
      console.log('📤 Uploading original image format to server for processing')
      uploadBlob = file

      // Validate authentication
      const walletAddress = publicKey?.toString()
      if (!walletAddress) {
        throw new Error('Please connect your wallet to upload images')
      }
      
      // Only create placeholder if not already done
      if (!existingUploadEntry) {
        // Get image dimensions for proper placeholder sizing
        try {
          const originalDimensions = await getSimpleImageDimensions(file)
          imageDimensions = calculateSimpleResize(originalDimensions.width, originalDimensions.height, 400, 300)
          console.log('📐 Image dimensions calculated:', { original: originalDimensions, display: imageDimensions })
        } catch (dimensionError) {
          console.warn('⚠️ Failed to get image dimensions, using fallback:', dimensionError)
        }
        
        // Generate unique upload ID
        uploadId = `upload_${Date.now()}_${Math.random()}`
        const localBlobUrl = URL.createObjectURL(file)
        
        // Add file to uploading state for UI display
        setUploadingImages(prev => new Map(prev).set(uploadId, {
          file,
          progress: 0,
          url: localBlobUrl,
          chatId,
          recipientWallet,
          status: 'uploading'
        }))
        
        console.log('📝 Added image to uploading state:', { uploadId, fileName: file.name })
      } else {
        console.log('📝 Using existing upload placeholder:', { uploadId, fileName: file.name })
        // Get dimensions from the URL if we skipped calculating them
        try {
          const originalDimensions = await getSimpleImageDimensions(file)
          imageDimensions = calculateSimpleResize(originalDimensions.width, originalDimensions.height, 400, 300)
        } catch (dimensionError) {
          console.warn('⚠️ Failed to get image dimensions for existing upload, using fallback:', dimensionError)
        }
      }
      
      const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
      if (!storedData) {
        throw new Error('Authentication expired. Please reconnect your wallet')
      }
      
      let authData
      try {
        authData = JSON.parse(storedData)
      } catch (parseError) {
        throw new Error('Invalid authentication data. Please reconnect your wallet')
      }
      
      const authToken = authData.token
      if (!authToken) {
        throw new Error('No authentication token found. Please reconnect your wallet')
      }

      // Generate unique message ID
      const messageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Upload with retry logic
      while (retryCount <= maxRetries) {
        try {
          console.log(`🔄 Uploading image (attempt ${retryCount + 1}/${maxRetries + 1})...`)
          
          // Prepare upload data
          const formData = new FormData()
          // Keep the original filename to preserve extension and avoid confusion
          // The server will handle renaming for storage
          formData.append('image', uploadBlob, file.name)
          formData.append('messageId', messageId)

          const response = await fetch('/api/image-upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'X-Wallet-Address': walletAddress
            },
            body: formData
          })

          let errorData
          if (!response.ok) {
            try {
              errorData = await response.json()
            } catch (jsonError) {
              errorData = { error: `Upload failed with status ${response.status}` }
            }

            // Handle specific error types
            if (response.status === 401) {
              throw new Error('Authentication failed. Please reconnect your wallet')
            } else if (response.status === 403) {
              throw new Error('Access denied. Please check your permissions')
            } else if (response.status === 413) {
              throw new Error('Image file is too large. Please use a smaller image')
            } else if (response.status >= 500) {
              // Server error - retry might help
              if (retryCount < maxRetries) {
                console.warn(`⚠️ Server error (${response.status}), retrying...`)
                retryCount++
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Progressive delay
                continue
              } else {
                throw new Error('Server error. Please try again later')
              }
            } else {
              throw new Error(errorData.error || `Upload failed with status ${response.status}`)
            }
          }

          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || 'Upload processing failed')
          }

          // Upload successful - create database message and clean up uploading state
          console.log('✅ Image upload successful, creating database message...')
          
          await sendMessage({
            chatId,
            content: "",
            recipientWallet,
            messageType: 'image',
            file_url: result.data.imageUrl,
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            metadata: {
              thumbnail_url: result.data.thumbnailUrl,
              original_name: file.name,
              upload_timestamp: new Date().toISOString(),
              compression_ratio: result.data.compressionRatio,
              processed_format: result.data.fileType,
              display_width: imageDimensions.width,
              display_height: imageDimensions.height
            }
          })
          
          // Remove from uploading state and clean up blob URL
          if (uploadId) {
            setUploadingImages(prev => {
              const updated = new Map(prev)
              const uploadData = updated.get(uploadId)
              if (uploadData?.url) {
                URL.revokeObjectURL(uploadData.url)
              }
              updated.delete(uploadId)
              return updated
            })
          }

          console.log(`✅ Image uploaded and message sent successfully: ${file.name}`)
          return // Success - exit the function
          
        } catch (uploadError) {
          if (retryCount >= maxRetries) {
            throw uploadError // Re-throw if we've exhausted retries
          }
          
          // Check if this is a retryable error
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError)
          if (errorMessage.includes('Network') || errorMessage.includes('timeout') || errorMessage.includes('Server error')) {
            console.warn(`⚠️ Retryable error: ${errorMessage}. Retrying...`)
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Progressive delay
          } else {
            throw uploadError // Non-retryable error
          }
        }
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error(`❌ Failed to upload image ${file.name}:`, error)
      
      // Clean up uploading state and blob URL on error
      if (uploadId) {
        setUploadingImages(prev => {
          const updated = new Map(prev)
          const uploadData = updated.get(uploadId)
          if (uploadData?.url) {
            URL.revokeObjectURL(uploadData.url)
          }
          // Mark as error instead of removing, so UI can show error state
          if (uploadData) {
            updated.set(uploadId, {
              ...uploadData,
              status: 'error',
              error: errorMessage
            })
          }
          return updated
        })
      }
      
      console.error(`❌ Upload failed for ${file.name}: ${errorMessage}`)
      // Don't throw error - let UI handle error state display
    }
  }, [publicKey, sendMessage, setUploadingImages, uploadingImages])

  // Typing detection functions
  const handleStartTyping = useCallback(() => {
    if (!selectedChat || isCurrentlyTypingRef.current) return
    
    console.log('⌨️ Starting typing for chat:', selectedChat)
    isCurrentlyTypingRef.current = true
    startTyping(selectedChat)
  }, [selectedChat, startTyping])

  const handleExtendTyping = useCallback(() => {
    if (!selectedChat) return
    
    console.log('⌨️ Extending typing for chat:', selectedChat)
    extendTyping(selectedChat)
  }, [selectedChat, extendTyping])

  const handleStopTyping = useCallback(() => {
    if (!selectedChat || !isCurrentlyTypingRef.current) return
    
    console.log('⌨️ Stopping typing for chat:', selectedChat)
    isCurrentlyTypingRef.current = false
    stopTyping(selectedChat)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
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
      
      // Get the message content
      const messageContent = message.trim()
      
      // Handle different message types
      if (selectedImages.length > 0) {
        // Handle image messages
        await handleSendImagesWithText(messageContent, recipientWallet, selectedChat)
      } else {
        // Text message only (stickers are handled separately)
        const messageType: 'text' | 'image' | 'file' | 'system' | 'nft' | 'sticker' = 'text'
        const metadata = {}
        
        // Send message (this now creates optimistic message immediately)
        await sendMessage({
          chatId: selectedChat,
          content: messageContent,
          recipientWallet,
          messageType,
          metadata
        })
      }
      
      // Clear input immediately for instant feedback - this is key for optimistic UX!
      setMessage("")
      // Note: selectedImages are already cleared in handleSendImagesWithText
      
    } catch (error) {
      console.error('Failed to send message:', error)
      // Don't restore the message content on error - user can retype if needed
      // This keeps the optimistic UX consistent
      alert('Failed to send message. Please try again.')
    }
  }, [message, selectedChat, conversations, publicKey, sendMessage, handleStopTyping])
  
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
          src={isDarkMode ? "/Dark-1-min.png?v=2" : "/Light-1-min.png?v=2"}
          alt="Background"
          fill
          className="object-cover"
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

      {/* Mobile Header */}
      <div 
        className="md:hidden relative z-20 flex items-center justify-between px-4 py-3"
        style={{ 
          backgroundColor: colors.bg
        }}
      >
        <Button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                      onClick={() => handleCopyWalletAddress(otherParticipant)}
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
        
        {/* Paper Texture Overlay */}
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
      </div>

      {/* Main Container */}
      <div className="relative z-10 h-screen w-full md:p-8 md:flex md:justify-center">
        <div 
          className="h-full w-full max-w-[2000px] md:border-4 flex relative"
          style={{ 
            backgroundColor: colors.bg, 
            borderColor: colors.border 
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
          {/* Mobile Sidebar Overlay */}
          
          {/* Left Sidebar */}
          <div 
            className={`
              ${isMobile ? `
                ${isMobileMenuOpen ? 'w-full' : 'w-0'}
                fixed top-0 left-0 h-[calc(100vh-73px)] z-40
                transform transition-all duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                overflow-hidden p-0
              ` : 'w-80 border-r-4 h-full'}
              flex flex-col relative z-[0]
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
              className="hidden md:flex p-6 border-b-4 items-center gap-4"
              style={{ borderBottomColor: colors.border }}
            >
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
                      {pendingChat.recipient.slice(0, 8)}...{pendingChat.recipient.slice(-4)}
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
                              // Retry the chat creation
                              handleRetryPendingChat(pendingChat.id)
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
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
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
                            {chat.title}
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
                onClick={handleNewChat}
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
          </div>

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
                  
                  return (
                    <>
                      <h2 
                        className="text-lg font-medium cursor-pointer transition-colors duration-200"
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
                        onClick={() => handleCopyWalletAddress(otherParticipant)}
                        title="Click to copy wallet address"
                      >
                        {otherParticipant.slice(0, 8)}...{otherParticipant.slice(-4)}
                      </h2>
                      
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
            <div className="flex-1 flex flex-col relative" style={{ overflow: 'visible', maxHeight: 'calc(100vh - 168px)', gap: 0 }}>
              
              {/* Gradient Fade Overlay */}
              <div 
                className="absolute top-0 left-0 z-10 pointer-events-none"
                style={{ 
                  background: `linear-gradient(to bottom, #F7F7F7, transparent)`,
                  height: '10px',
                  width: 'calc(100% - 17px)'
                }}
              />
              {selectedChat ? (
                <>
                  {/* Messages Area */}
                  <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto relative" style={{ overflowX: 'visible', paddingLeft: isMobile ? '16px' : '50px', paddingRight: isMobile ? '16px' : '50px', minHeight: 0 }}>
                    {isLoadingMessages ? (
                      <div className="text-center mt-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colors.border }}></div>
                        <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>Loading messages...</p>
                      </div>
                    ) : currentChatMessages.length === 0 ? (
                      <div className="text-center mt-20">
                        <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>No messages yet</p>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Send your first message!</p>
                      </div>
                    ) : (
                      <div className="relative max-w-6xl mx-auto">
                        {/* Pinned First NFT Message */}
                        {(() => {
                          const firstMsg = currentChatMessages[0]
                          if (!firstMsg) return null
                          
                          // Check if it's an NFT message
                          const shouldShow = firstMsg.type === 'nft'
                          
                          if (!shouldShow) {
                            return null
                          }
                          
                          return (
                          <div className="flex flex-col items-center mb-8 relative">
                            <div 
                              className="group relative transform rotate-3 hover:rotate-1 transition-transform duration-300 cursor-pointer hover:scale-105"
                              style={{
                                filter: 'drop-shadow(8px 12px 16px rgba(0, 0, 0, 0.25))',
                                overflow: 'visible',
                                margin: '20px'
                              }}
                              onClick={() => {
                                // TODO: Open NFT details modal
                              }}
                            >
                              {firstMsg.nft_image_url ? (
                                <img 
                                  src={firstMsg.nft_image_url} 
                                  alt="Pinned NFT Message" 
                                  className="w-64 h-64 object-cover rounded-sm hover:shadow-2xl transition-shadow duration-300"
                                  style={{ 
                                    backgroundColor: 'transparent'
                                  }}
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div 
                                  className="w-64 h-64 rounded-sm hover:shadow-2xl transition-shadow duration-300 flex items-center justify-center p-4"
                                  style={{ 
                                    backgroundColor: colors.bg
                                  }}
                                >
                                  <p 
                                    className="text-center text-sm"
                                    style={{ 
                                      fontFamily: "Helvetica Neue, sans-serif",
                                      color: colors.text 
                                    }}
                                  >
                                    {firstMsg.message_content}
                                  </p>
                                </div>
                              )}
                              {/* Pin shadow effect */}
                              <img 
                                src="/pin-shadow.png"
                                alt=""
                                className="absolute -top-2 -left-2 w-10 h-10 opacity-80 transition-all duration-300 group-hover:translate-y-2 group-hover:translate-x-2 group-hover:scale-y-150 group-hover:opacity-20"
                                style={{ 
                                  objectFit: 'contain',
                                  zIndex: 10
                                }}
                              />
                              {/* Pin effect */}
                              <img 
                                src="/pin.png"
                                alt="Pin"
                                className="absolute -top-2 -left-2 w-10 h-10 transition-all duration-300 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:scale-110"
                                style={{ 
                                  objectFit: 'contain',
                                  zIndex: 9999
                                }}
                              />
                              {/* Paper texture overlay */}
                              <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  backgroundImage: 'url(/Paper-Texture-7.jpg)',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                  mixBlendMode: 'multiply',
                                  opacity: isDarkMode ? 0.3 : 0.1
                                }}
                              />
                            </div>
                            
                            {/* Faint timestamp and sender info that hides on hover */}
                            <div 
                              className="mt-3 text-center opacity-50 text-xs group-hover:opacity-0 transition-opacity duration-300"
                              style={{ 
                                fontFamily: "Helvetica Neue, sans-serif",
                                color: colors.textSecondary
                              }}
                            >
                              <div>
                                {new Date(firstMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {firstMsg.sender_wallet}
                              </div>
                              <div>
                                started a chat
                              </div>
                            </div>
                          </div>
                          )
                        })()}
                        
                        {/* Regular Messages */}
                        <div className="space-y-4">
                          {(!connected || !publicKey) && (
                            <div className="p-4 text-center" style={{ 
                              backgroundColor: colors.bg,
                              border: `2px solid ${colors.border}`,
                              color: colors.textSecondary
                            }}>
                              <p className="text-sm" style={{ fontFamily: "Helvetica Neue, sans-serif" }}>
                                Please connect your wallet to view messages
                              </p>
                            </div>
                          )}
                          
                          {connected && publicKey && !isAuthenticated && (
                            <div className="p-4 text-center" style={{ 
                              backgroundColor: colors.bg,
                              border: `2px solid ${colors.border}`,
                              color: colors.textSecondary
                            }}>
                              <p className="text-sm" style={{ fontFamily: "Helvetica Neue, sans-serif" }}>
                                Please sign with your wallet to view messages
                              </p>
                            </div>
                          )}
                          
                          
                          {connected && publicKey && isAuthenticated && currentChatMessages.map((msg, index) => {
                            const isOwnMessage = msg.sender_wallet === publicKey?.toString()
                            const isFirstMessage = index === 0
                            
                            // Determine if message has been read by recipient via read receipts
                            const currentConversation = conversations.find(c => c.id === selectedChat)
                            const recipientWallet = currentConversation?.participants.find(p => p !== publicKey?.toString())
                            const isReadByRecipient = !!(isOwnMessage && recipientWallet && readReceipts[msg.id] === recipientWallet)
                            
                            // Skip displaying the first NFT message in normal format since it's pinned above
                            if (isFirstMessage && msg.type === 'nft') {
                              return null
                            }
                            
                            // Check if message has a link preview
                            const hasLinkPreview = msg.type === 'text' && detectUrls(msg.message_content).length > 0;
                            
                            // Check if message is optimistic (temporary/pending)
                            const isOptimisticMessage = msg.id.startsWith('optimistic_') || (msg as any).optimistic === true;
                            
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`${msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image' ? '' : hasLinkPreview ? (isMobile ? 'max-w-[85%]' : 'max-w-[50%]') : (isMobile ? 'max-w-[90%]' : 'max-w-[60%]')}`}>
                                  {/* Link Preview - Rendered outside and above the message box */}
                                  {hasLinkPreview && (() => {
                                    const url = detectUrls(msg.message_content)[0];
                                    const skeletonDimensions = calculateSkeletonDimensions(url);
                                    
                                    // Calculate priority based on message recency (newest messages get higher priority)
                                    const totalMessages = currentChatMessages.length;
                                    const isNewest = index >= totalMessages - 5; // Last 5 messages
                                    const messagePriority = isNewest ? PRIORITY_LEVELS.NEWEST : PRIORITY_LEVELS.NORMAL;
                                    
                                    return (
                                      <LinkPreview 
                                        url={url} 
                                        isDarkMode={isDarkMode}
                                        colors={colors}
                                        initialDimensions={skeletonDimensions}
                                        priority={messagePriority}
                                        isOptimistic={isOptimisticMessage}
                                      />
                                    );
                                  })()}
                                  
                                  <div
                                    className={`${
                                      msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image'
                                        ? '' // No styling for sticker, voice, and image messages (they handle their own styling)
                                        : `p-3 border-2 ${isOwnMessage ? 'bg-blue-50' : ''}`
                                    }`}
                                    style={msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image' ? {} : {
                                      borderColor: colors.border,
                                      backgroundColor: isOwnMessage ? (isDarkMode ? '#1E3A8A20' : '#EFF6FF') : colors.bg,
                                      // Remove top border if there's a link preview
                                      ...(hasLinkPreview ? { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {})
                                    }}
                                  >
                                    {msg.type === 'nft' && msg.nft_image_url && (
                                      <div className="mb-2">
                                        <img 
                                          src={msg.nft_image_url} 
                                          alt="NFT Message" 
                                          className="w-full max-w-[200px] rounded-sm"
                                        />
                                      </div>
                                    )}
                                    
                                    {msg.type === 'sticker' && ((msg as any).sticker_name || msg.metadata?.sticker_name) && (
                                      <div>
                                        <img 
                                          src={`/Message-Stickers/${(msg as any).sticker_name || msg.metadata?.sticker_name}`} 
                                          alt="Sticker" 
                                          className="w-64 h-64"
                                          style={{ imageRendering: 'crisp-edges' }}
                                        />
                                      </div>
                                    )}

                                    {/* Voice Message */}
                                    {msg.type === 'voice' && (
                                      <VoiceMessageBubble
                                        message={msg as any}
                                        isOwnMessage={isOwnMessage}
                                        colors={colors}
                                        isDarkMode={isDarkMode}
                                        isMobile={isMobile}
                                        status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                        isReadByRecipient={isReadByRecipient}
                                      />
                                    )}

                                    {/* Image Message */}
                                    {msg.type === 'image' && (
                                      <ImageMessageBubble
                                        message={msg}
                                        onImageClick={(imageUrl) => window.open(imageUrl, '_blank')}
                                        onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                        isDarkMode={isDarkMode}
                                      />
                                    )}

                                    {/* Text content for image messages - show after image */}
                                    {msg.type === 'image' && msg.message_content && msg.message_content.trim() && (
                                      <p 
                                        className="text-sm mt-2"
                                        style={{ 
                                          fontFamily: "Helvetica Neue, sans-serif",
                                          color: colors.text 
                                        }}
                                      >
                                        {msg.message_content}
                                      </p>
                                    )}

                                  {/* Only show message text for non-sticker/voice/image messages or special messages with custom text */}
                                  {(msg.type !== 'sticker' && msg.type !== 'voice' && msg.type !== 'image' || (msg.type === 'sticker' && msg.message_content !== 'Sent a sticker')) && (
                                    <p 
                                      className="text-sm"
                                      style={{ 
                                        fontFamily: "Helvetica Neue, sans-serif",
                                        color: colors.text 
                                      }}
                                    >
                                      {msg.type === 'text' && detectUrls(msg.message_content).length > 0 ? (
                                        // Parse message and make URLs clickable
                                        (() => {
                                          const urls = detectUrls(msg.message_content);
                                          let lastIndex = 0;
                                          const parts: React.ReactNode[] = [];
                                          
                                          urls.forEach((url, index) => {
                                            const urlIndex = msg.message_content.indexOf(url, lastIndex);
                                            
                                            // Add text before URL
                                            if (urlIndex > lastIndex) {
                                              parts.push(msg.message_content.slice(lastIndex, urlIndex));
                                            }
                                            
                                            // Add URL as clickable link
                                            parts.push(
                                              <a
                                                key={`url-${index}`}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="break-all overflow-wrap-anywhere"
                                                style={{
                                                  color: '#3388FF',
                                                  textDecoration: 'underline',
                                                  cursor: 'pointer',
                                                  overflowWrap: 'anywhere',
                                                  wordBreak: 'break-all'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {url}
                                              </a>
                                            );
                                            
                                            lastIndex = urlIndex + url.length;
                                          });
                                          
                                          // Add remaining text
                                          if (lastIndex < msg.message_content.length) {
                                            parts.push(msg.message_content.slice(lastIndex));
                                          }
                                          
                                          return <>{parts}</>;
                                        })()
                                      ) : (
                                        msg.message_content
                                      )}
                                    </p>
                                  )}
                                  {/* Show timestamp/status for all messages except voice (they handle their own) and images without file_url */}
                                  {msg.type !== 'voice' && !(msg.type === 'image' && !msg.file_url) && (
                                    <div 
                                      className={`flex items-center mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                      style={{ opacity: msg.type === 'sticker' ? 0.8 : 1 }}
                                    >
                                      <MessageStatus
                                        status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                        encrypted={isMessageEncrypted(msg)}
                                        timestamp={getMessageTimestamp(msg)}
                                        size="sm"
                                        isDarkMode={isDarkMode}
                                        onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                        showStatusIcon={isOwnMessage}
                                        isReadByRecipient={isReadByRecipient}
                                      />
                                    </div>
                                  )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input Area - Fixed Container */}
                  <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0' : 'relative'} flex items-center justify-center flex-shrink-0 z-[5]`} style={{ 
                    backgroundColor: colors.bg, 
                    borderTop: `4px solid ${colors.border}`,
                    height: '80px',
                    padding: '0 20px'
                  }}>
                    
                    {/* Solid white background layer - above sticker picker */}
                    <div 
                      className="absolute z-[1]"
                      style={{
                        backgroundColor: '#ffffff',
                        top: '0',
                        left: '-2px',
                        right: '-2px',
                        bottom: '-2px'
                      }}
                    />
                    {/* Chat Sticker Picker - Positioned above input, full width */}
                    <ChatStickerPicker
                      isOpen={isChatStickerPickerOpen}
                      onStickerSend={handleSendSticker}
                      onClose={() => setIsChatStickerPickerOpen(false)}
                      colors={colors}
                      isDarkMode={isDarkMode}
                      buttonRef={chatStickerButtonRef}
                    />
                    
                    {/* Image Previews - positioned above input area */}
                    {selectedImages.length > 0 && (
                      <div 
                        className="absolute bottom-full left-0 right-0 p-3 flex flex-wrap gap-3 z-[2]"
                        style={{
                          backgroundColor: colors.bg,
                          borderTop: `2px solid ${colors.border}`
                        }}
                      >
                        {selectedImages.map((file, index) => (
                          <ImagePreview
                            key={`${file.name}-${file.lastModified}-${index}`}
                            file={file}
                            onRemove={() => handleRemoveImage(index)}
                            colors={colors}
                            isDarkMode={isDarkMode}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Paper Texture Overlay */}
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
                    <div className="w-full" style={{ maxWidth: 'calc(72rem - 5px)' }}>
                      
                      {/* Input Controls Container - moved outside form to isolate voice recorder */}
                      <div className="flex items-center gap-1 w-full relative z-[3] transition-all duration-300 ease-in-out">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3 flex-1 transition-all duration-300 ease-in-out">
                          <div className="flex-1 flex items-center transition-all duration-300 ease-in-out" style={{ border: `2px solid ${colors.border}` }}>
                            <Input
                              value={message}
                              onChange={handleMessageInputChange}
                              onFocus={() => setIsInputFocused(true)}
                              onBlur={() => setIsInputFocused(false)}
                              placeholder="Type your message..."
                              disabled={!connected || !publicKey || !isAuthenticated}
                              className="flex-1 border-none rounded-none focus:ring-0 focus:border-none h-12 disabled:opacity-50"
                              style={{ 
                                fontFamily: "Helvetica Neue, sans-serif",
                                backgroundColor: colors.bg,
                                color: colors.text
                              }}
                            />
                            <Button
                              type="submit"
                              onClick={(e) => {
                                if ((!message.trim() && selectedImages.length === 0) || !connected || !publicKey || !isAuthenticated) {
                                  e.preventDefault();
                                  return;
                                }
                              }}
                              className="rounded-none h-12 w-12 p-0 hover:opacity-80"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                borderTop: 'none',
                                borderRight: 'none',
                                borderBottom: 'none',
                                borderLeft: `2px solid ${colors.border}`
                              }}
                            >
                              <Send 
                                className="w-4 h-4 transition-opacity duration-200" 
                                style={{ 
                                  opacity: ((!message.trim() && selectedImages.length === 0) || !connected || !publicKey || !isAuthenticated) ? 0.3 : 1 
                                }} 
                              />
                            </Button>
                          </div>

                          {/* Chat Sticker Button - kept inside form */}
                          {!(isMobile && isInputFocused) && (
                            <ChatStickerButton
                              ref={chatStickerButtonRef}
                              isOpen={isChatStickerPickerOpen}
                              onClick={() => setIsChatStickerPickerOpen(!isChatStickerPickerOpen)}
                              colors={colors}
                            />
                          )}
                        </form>

                        {/* File Upload Button - outside form to prevent interference */}
                        {!(isMobile && isInputFocused) && (
                          <FileUploadButton
                            onFileSelect={handleFileSelect}
                            colors={colors}
                            disabled={!connected || !publicKey || !isAuthenticated}
                          />
                        )}

                        {/* Voice Recorder - moved OUTSIDE form to prevent interference */}
                        {!isMobile && (
                          <ExpandingVoiceRecorder
                            onSend={handleSendVoice}
                            colors={colors}
                            isDarkMode={isDarkMode}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
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
      </div>

      {/* New Chat Modal Overlay */}
      {isCreatingNewChat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleOverlayClick}
        >
          <div
            className={`border-4 relative ${
              isMobile ? 'w-[320px] h-[480px] flex flex-col' : 'w-[850px] h-[400px] flex'
            }`}
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Paper Texture Over Modal */}
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
            {isMobile ? (
              <>
                {/* Mobile: Chat Preview on Top - Perfect Square */}
                <div 
                  className="w-[200px] h-[200px] mx-auto border-b-4 flex items-center justify-center flex-shrink-0 relative z-[2]"
                  style={{
                    backgroundColor: colors.bg,
                    borderBottomColor: colors.border
                  }}
                >
                  <NFTPreviewCanvas
                    messageContent={stickerState.getEffectiveMessage()}
                    selectedSticker={stickerState.selectedSticker}
                    isStickerHidden={stickerState.isStickerHidden}
                    isTextFaded={stickerState.isTextFaded}
                    width={180}
                    height={180}
                    className="rounded-sm"
                    onCanvasReady={setPreviewCanvasData}
                  />
                </div>

                {/* Mobile: Form Section Below */}
                <div className="flex-1 p-3 flex flex-col relative z-[2]">
                  <form onSubmit={handleSendInvitation} className="flex flex-col gap-2 h-full">
                    {/* To Field */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        To
                      </label>
                      <div 
                        className="border-2"
                        style={{ borderColor: colors.border }}
                      >
                        <Input
                          value={newChatData.to}
                          onChange={(e) => setNewChatData({ ...newChatData, to: e.target.value })}
                          placeholder="Enter wallet address or username..."
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                            fontFamily: "Helvetica Neue, sans-serif",
                            backgroundColor: colors.bg,
                            color: colors.text
                          }}
                        />
                      </div>
                    </div>

                    {/* From Field */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        From
                      </label>
                      <div 
                        className="border-2"
                        style={{ borderColor: colors.border }}
                      >
                        <Input
                          value={newChatData.from}
                          onChange={(e) => setNewChatData({ ...newChatData, from: e.target.value })}
                          placeholder={connected ? "Auto-filled from connected wallet" : "Connect wallet to auto-fill"}
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                          disabled={connected}
                        />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        Message
                      </label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex-1 transition-opacity duration-300"
                          style={{ 
                            border: `2px solid ${colors.border}`,
                            opacity: stickerState.isTextFaded ? 0.5 : 1
                          }}
                        >
                          <Input
                            value={stickerState.currentMessage}
                            onChange={(e) => stickerState.handleMessageChange(e.target.value)}
                            placeholder="Type your invitation message..."
                            className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                            style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                          />
                        </div>

                        {/* Sticker Button */}
                        <Button
                          type="button"
                          onClick={() => setIsStickerPickerOpen(true)}
                          className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                            stickerState.selectedSticker ? 'bg-blue-50 border-blue-500' : ''
                          }`}
                          style={{
                            backgroundColor: stickerState.selectedSticker ? '#EFF6FF' : colors.bg,
                            color: stickerState.selectedSticker ? '#3B82F6' : colors.text,
                            border: `2px solid ${stickerState.selectedSticker ? '#3B82F6' : colors.border}`
                          }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M16 8l-4 4-4-4" />
                            <path d="M20 4l-4 4" />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1 mt-auto">
                      <Button
                        type="submit"
                        className="flex-1 bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-10 disabled:opacity-50"
                        style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                        disabled={!connected || !publicKey || !isAuthenticated || isAuthenticating || isWaitingForSignature || !newChatData.to || !stickerState.getEffectiveMessage()}
                      >
                        {!connected ? "Connect Wallet First" : 
                         !publicKey ? "Wallet Connection Required" :
                         isAuthenticating ? "Authenticating..." :
                         !isAuthenticated ? "Authentication Required" :
                         isWaitingForSignature ? "Waiting for Signature..." :
                         "Create NFT Chat"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelNewChat}
                        className="flex-1 rounded-none h-10 hover:opacity-80"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif", 
                          fontWeight: 500,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `2px solid ${colors.border}`
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <>
                {/* Desktop: Preview Box - Perfect Square */}
                <div 
                  className="w-[400px] h-full border-r-4 flex items-center justify-center flex-shrink-0 relative z-[2]"
                  style={{
                    backgroundColor: colors.bg,
                    borderRightColor: colors.border
                  }}
                >
                  <NFTPreviewCanvas
                    messageContent={stickerState.getEffectiveMessage()}
                    selectedSticker={stickerState.selectedSticker}
                    isStickerHidden={stickerState.isStickerHidden}
                    isTextFaded={stickerState.isTextFaded}
                    width={360}
                    height={360}
                    className="rounded-sm"
                    onCanvasReady={setPreviewCanvasData}
                  />
                </div>

                {/* Desktop: Form Section */}
                <div className="flex-1 p-4 flex flex-col relative z-[2]">
                  <form onSubmit={handleSendInvitation} className="flex flex-col gap-3 h-full">
                    {/* To Field */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        To
                      </label>
                      <div 
                        className="border-2"
                        style={{ borderColor: colors.border }}
                      >
                        <Input
                          value={newChatData.to}
                          onChange={(e) => setNewChatData({ ...newChatData, to: e.target.value })}
                          placeholder="Enter wallet address or username..."
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                        />
                      </div>
                    </div>

                    {/* From Field */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        From
                      </label>
                      <div 
                        className="border-2"
                        style={{ borderColor: colors.border }}
                      >
                        <Input
                          value={newChatData.from}
                          onChange={(e) => setNewChatData({ ...newChatData, from: e.target.value })}
                          placeholder={connected ? "Auto-filled from connected wallet" : "Connect wallet to auto-fill"}
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                          disabled={connected}
                        />
                      </div>
                    </div>

                    {/* Message Input */}
                    <div>
                      <label
                        className="block text-sm font-medium mb-1"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                      >
                        Message
                      </label>
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex-1 transition-opacity duration-300"
                          style={{ 
                            border: `2px solid ${colors.border}`,
                            opacity: stickerState.isTextFaded ? 0.5 : 1
                          }}
                        >
                          <Input
                            value={stickerState.currentMessage}
                            onChange={(e) => stickerState.handleMessageChange(e.target.value)}
                            placeholder="Type your invitation message..."
                            className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                            style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                          />
                        </div>

                        {/* Sticker Button */}
                        <Button
                          type="button"
                          onClick={() => setIsStickerPickerOpen(true)}
                          className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                            stickerState.selectedSticker ? 'bg-blue-50 border-blue-500' : ''
                          }`}
                          style={{
                            backgroundColor: stickerState.selectedSticker ? '#EFF6FF' : colors.bg,
                            color: stickerState.selectedSticker ? '#3B82F6' : colors.text,
                            border: `2px solid ${stickerState.selectedSticker ? '#3B82F6' : colors.border}`
                          }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M16 8l-4 4-4-4" />
                            <path d="M20 4l-4 4" />
                          </svg>
                        </Button>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-2 mt-auto">
                      <Button
                        type="submit"
                        className="flex-1 bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-12 disabled:opacity-50"
                        style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                        disabled={!connected || !publicKey || !isAuthenticated || isAuthenticating || isWaitingForSignature || !newChatData.to || !stickerState.getEffectiveMessage()}
                      >
                        {!connected ? "Connect Wallet First" : 
                         !publicKey ? "Wallet Connection Required" :
                         isAuthenticating ? "Authenticating..." :
                         !isAuthenticated ? "Authentication Required" :
                         isWaitingForSignature ? "Waiting for Signature..." :
                         "Create NFT Chat"}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelNewChat}
                        className="flex-1 rounded-none h-12 hover:opacity-80"
                        style={{ 
                          fontFamily: "Helvetica Neue, sans-serif", 
                          fontWeight: 500,
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `2px solid ${colors.border}`
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Sticker Picker Modal */}
      <StickerPicker
        selectedSticker={stickerState.selectedSticker}
        onStickerSelect={stickerState.handleStickerSelect}
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
      />

    </div>
  )
}
