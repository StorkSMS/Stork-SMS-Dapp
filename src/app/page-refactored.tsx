"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { flushSync } from "react-dom"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useWallet } from "@solana/wallet-adapter-react"
import { useNFTChatCreation } from "@/hooks/useNFTChatCreation"
import { useRealtimeMessaging } from "@/hooks/useRealtimeMessaging"
import { useAuth } from "@/contexts/AuthContext"
import { useNFTVerification } from "@/hooks/useNFTVerification"
import { useMessageStatus } from "@/components/MessageStatus"
import StickerPicker, { useStickerState } from "@/components/StickerPicker"
import { WalletButton } from "@/components/wallet-button"
import OnlineStatus from "@/components/OnlineStatus"
import "@/lib/debug-auth" // Import debug functions for testing

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
}

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

  // Trigger app drop-down animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoaded(true)
    }, 100) // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timer)
  }, [])

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
  }, [selectedChat])
  
  // Subscribe to new message events
  useEffect(() => {
    const cleanup = onNewMessage((chatId: string, message: any) => {
      console.log('📬 New message event:', { chatId, message, selectedChat: selectedChatRef.current })
      
      // If the message is for the currently selected chat and user isn't sender
      if (selectedChatRef.current === chatId && message.sender_wallet !== publicKey?.toString()) {
        console.log('📍 New message in current chat from other user')
        // Mark as read immediately since user is viewing the chat
        if (unreadThreads.has(chatId)) {
          clearUnreadStatus(chatId)
        }
      } else if (selectedChatRef.current !== chatId && message.sender_wallet !== publicKey?.toString()) {
        // If message is for a different chat, mark it as unread
        console.log('🔴 New message in different chat - marking as unread')
        addUnreadStatus(chatId)
        
        // Play notification sound if audio is initialized and user has interacted
        if (audioInitialized && userInteracted && audioRef.current) {
          console.log('🔔 Playing notification sound for message in background chat')
          audioRef.current.play()
            .then(() => console.log('✅ Notification sound played'))
            .catch(err => console.error('❌ Failed to play notification sound:', err))
        }
      }
    })
    
    return cleanup
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
      setOnlineStatus('online', selectedChat)
      
      return () => {
        console.log('🌐 Cleaning up presence subscriptions for chat:', selectedChat)
        setOnlineStatus('offline', selectedChat)
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
      // Start fade animation after 2.5 seconds
      const fadeTimer = setTimeout(() => {
        setFadingChats(new Set(newlyCreatedChats))
      }, 2500)
      
      // Remove from sets after animation completes
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
    
    if (loadingJustFinished && messagesContainerRef.current) {
      console.log('📜 Messages loaded, initiating scroll animation')
      
      // Immediately hide all messages
      const messageElements = messagesContainerRef.current.querySelectorAll('.space-y-4 > div')
      messageElements.forEach((el) => {
        (el as HTMLElement).style.opacity = '0'
        ;(el as HTMLElement).style.transform = 'translateY(20px)'
      })
      
      // Use flushSync to ensure DOM updates are applied immediately
      flushSync(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      })
      
      // Then animate them in sequence
      messageElements.forEach((el, index) => {
        setTimeout(() => {
          (el as HTMLElement).style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
          ;(el as HTMLElement).style.opacity = '1'
          ;(el as HTMLElement).style.transform = 'translateY(0)'
        }, index * 50) // 50ms delay between each message
      })
    }
    
    // Update the previous state
    prevIsLoadingMessages.current = isLoadingMessages
  }, [isLoadingMessages])
  
  // Auto-scroll when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (messagesContainerRef.current && currentChatMessages.length > 0) {
      const container = messagesContainerRef.current
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
      
      if (isNearBottom) {
        // Only animate the newest message (last one)
        const messageElements = container.querySelectorAll('.space-y-4 > div')
        const newestMessage = messageElements[messageElements.length - 1] as HTMLElement
        
        if (newestMessage && !newestMessage.style.transition) {
          // Set initial state
          newestMessage.style.opacity = '0'
          newestMessage.style.transform = 'translateY(20px)'
          
          // Scroll to bottom
          container.scrollTop = container.scrollHeight
          
          // Animate in
          setTimeout(() => {
            newestMessage.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out'
            newestMessage.style.opacity = '1'
            newestMessage.style.transform = 'translateY(0)'
          }, 50)
        }
      }
    }
  }, [currentChatMessages])
  
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
      .map(chat => ({
        id: chat.id,
        title: chat.participants.find(p => p !== publicKey?.toString())?.slice(0, 8) + '...' + 
               chat.participants.find(p => p !== publicKey?.toString())?.slice(-4) || 'Unknown',
        lastMessage: chat.last_message_preview || 'No messages yet',
        lastActivity: chat.last_activity || new Date().toISOString()
      }))
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
    
    setIsWaitingForSignature(true)
    
    // Create a new pending chat entry
    const pendingChatId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newPendingChat: PendingChat = {
      id: pendingChatId,
      status: 'processing',
      recipient: newChatData.to,
      message: stickerState.getEffectiveMessage(),
      theme: 'light',
    }
    
    setPendingChats(prev => [...prev, newPendingChat])
    
    // Process the request
    createNFTChatWithImmediateSignature({
      recipientWallet: newChatData.to,
      theme: 'light',
      message: stickerState.getEffectiveMessage(),
      selectedSticker: stickerState.selectedSticker
    }).then((chatId) => {
      console.log('NFT Chat created successfully with ID:', chatId)
      
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
      
      // Close modal and reset form
      setIsCreatingNewChat(false)
      setIsWaitingForSignature(false)
      setNewChatData({ to: "", from: connected && publicKey ? publicKey.toString() : "", message: "", selectedSticker: null })
      stickerState.handleStickerSelect(null)
      stickerState.setCurrentMessage("")
      
      // Select the new chat after a short delay to ensure it's loaded
      setTimeout(() => {
        setSelectedChat(chatId)
        loadChatMessages(chatId)
        subscribeToMessageUpdates(chatId)
        subscribeToReadReceiptsUpdates(chatId)
        clearUnreadStatus(chatId)
      }, 1000)
    }).catch((error) => {
      console.error('Error creating NFT chat:', error)
      
      // Update pending chat to failed
      setPendingChats(prev => 
        prev.map(chat => 
          chat.id === pendingChatId 
            ? { ...chat, status: 'failed', error: error.message || 'Failed to create chat' }
            : chat
        )
      )
      
      setIsWaitingForSignature(false)
    })
  }
  
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
      const chatId = await createNFTChatWithImmediateSignature({
        recipientWallet: pendingChat.recipient,
        theme: pendingChat.theme,
        message: pendingChat.message
      })

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
    setOnlineStatus('online', chatId)
    
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
        type: 'sticker',
        metadata: {
          sticker_name: stickerName
        }
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
      
      // Convert blob to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        
        // Send voice message with audio data
        await sendMessage({
          chatId: selectedChat,
          content: `Voice message (${Math.round(duration)}s)`,
          type: 'voice',
          file_data: base64Audio,
          metadata: {
            message_id: messageId,
            duration: Math.round(duration),
            mime_type: audioBlob.type || 'audio/webm'
          }
        })
        
        console.log('✅ Voice message sent successfully')
      }
      
      reader.readAsDataURL(audioBlob)
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
        
        // Send the image with metadata
        const messageContent = textContent || `Sent an image: ${file.name}`
        await sendMessage({
          chatId,
          content: messageContent,
          type: 'image',
          file_data: base64Data,
          metadata: {
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            upload_id: uploadId
          }
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
      
      // Set a new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        handleStopTyping()
      }, 3000)
    } else {
      // If input is empty, stop typing immediately
      handleStopTyping()
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
          type: 'text'
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
        style={{
          transform: isAppLoaded ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isAppLoaded ? 1 : 0,
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out'
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
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 h-screen w-full md:p-8 md:flex md:justify-center">
        <div 
          className={`border-0 md:border-4 h-full relative flex ${isMobile ? 'w-full' : 'w-full max-w-6xl'}`}
          style={{ 
            backgroundColor: colors.bg, 
            borderColor: colors.border,
            transform: isAppLoaded ? 'translateY(0)' : 'translateY(-100vh)',
            opacity: isAppLoaded ? 1 : 0,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out'
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
            canCreate={canCreate}
            connected={connected}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
            onRetryPendingChat={handleRetryPendingChat}
            formatRelativeTime={formatRelativeTime}
          />

          {/* Main Chat Area */}
          <div className={`flex-1 flex flex-col relative z-[1] ${isMobile ? 'w-full' : ''}`} style={{ overflow: 'hidden' }}>
            {/* Desktop Header with Chat Info and Connect Wallet */}
            <div 
              className="hidden md:flex items-center justify-between p-6 relative"
              style={{ 
                backgroundColor: colors.bg,
                borderBottom: `4px solid ${colors.border}`
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
            {selectedChat ? (
              <>
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
                  onStickerSend={handleSendSticker}
                  onFileSelect={handleFileSelect}
                  onRemoveImage={handleRemoveImage}
                  onSendVoice={handleSendVoice}
                  handleNewChat={handleNewChat}
                />
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
        onChatDataChange={setNewChatData}
        onStickerPickerOpen={() => setIsStickerPickerOpen(true)}
        onCanvasReady={setPreviewCanvasData}
      />

      {/* Sticker Picker Modal */}
      <StickerPicker
        selectedSticker={stickerState.selectedSticker}
        isOpen={isStickerPickerOpen}
        onClose={() => setIsStickerPickerOpen(false)}
        onSelect={stickerState.handleStickerSelect}
        colors={colors}
      />

    </div>
  )
}