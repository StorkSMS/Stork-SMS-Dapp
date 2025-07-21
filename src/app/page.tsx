"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef, useReducer } from "react"
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
import type { Conversation, Message } from "@/types/messaging"
import "@/lib/debug-auth" // Import debug functions for testing

interface NewChatData {
  to: string
  from: string
  message: string
  selectedSticker?: string | null
}

interface ChatMessage {
  id: string
  content: string
  sender: string
  timestamp: string
  type: 'text' | 'nft'
  nft_image_url?: string
}

export default function ChatApp() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false)
  const [isWaitingForSignature, setIsWaitingForSignature] = useState(false)
  const [isChatStickerPickerOpen, setIsChatStickerPickerOpen] = useState(false)
  const [selectedChatSticker, setSelectedChatSticker] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [pendingChats, setPendingChats] = useState<any[]>([])
  const [timestampUpdate, setTimestampUpdate] = useState(0)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [newlyCreatedChats, setNewlyCreatedChats] = useState<Set<string>>(new Set())
  const [fadingChats, setFadingChats] = useState<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedChatRef = useRef<string | null>(null)
  const chatStickerButtonRef = useRef<HTMLButtonElement>(null)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [newChatData, setNewChatData] = useState<NewChatData>({
    to: "",
    from: "",
    message: "",
    selectedSticker: null,
  })
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false)
  
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
  
  const { checkChatAccess, verifyNFTOwnership, ownedNFTs, refreshOwnedNFTs } = useNFTVerification()
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
    clearCurrentChat,
    refreshConversations,
    clearUnreadStatus,
    addUnreadStatus,
    error: messagingError,
    onNewMessage
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
              
              // Pause at top for 500ms, then smooth scroll to bottom
              setTimeout(() => {
                if (messagesContainerRef.current) {
                  messagesContainerRef.current.scrollTo({
                    top: messagesContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                  })
                }
              }, 500)
            }
          })
        })
      } else {
        // Not a fresh load - just scroll to bottom instantly (for new messages)
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }
  }, [currentChatMessages, isLoadingMessages])

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
    timestampUpdate
    
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
    
    // Clear unread status for this thread (FIX: This was missing!)
    console.log('🔵 Clearing unread status for chat:', chatId)
    clearUnreadStatus(chatId)
    
    if (isMobile) {
      setIsMobileMenuOpen(false)
    }
  }, [clearCurrentChat, loadChatMessages, subscribeToMessageUpdates, subscribeToReadReceiptsUpdates, isMobile])

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

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🎯 handleSendMessage called:', {
      message: message.trim(),
      selectedChatSticker,
      selectedChat,
      hasMessage: !!message.trim(),
      hasSticker: !!selectedChatSticker
    })
    
    // Allow sending if there's a message (no sticker logic needed here since stickers send immediately)
    if (!message.trim() || !selectedChat) {
      console.log('❌ Message send blocked - insufficient data')
      return
    }
    
    try {
      const selectedConversation = conversations.find(c => c.id === selectedChat)
      if (!selectedConversation) return
      
      const recipientWallet = selectedConversation.participants.find(p => p !== publicKey?.toString())
      if (!recipientWallet) return
      
      // Text message only (stickers are handled separately)
      const messageContent = message.trim()
      const messageType: 'text' | 'image' | 'file' | 'system' | 'nft' | 'sticker' = 'text'
      const metadata = {}
      
      // Clear input immediately for instant feedback - this is key for optimistic UX!
      setMessage("")
      
      // Send message (this now creates optimistic message immediately)
      await sendMessage({
        chatId: selectedChat,
        content: messageContent,
        recipientWallet,
        messageType,
        metadata
      })
      
    } catch (error) {
      console.error('Failed to send message:', error)
      // Don't restore the message content on error - user can retype if needed
      // This keeps the optimistic UX consistent
      alert('Failed to send message. Please try again.')
    }
  }, [message, selectedChat, conversations, publicKey, sendMessage])
  
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
          backgroundColor: colors.bg, 
          borderBottom: `4px solid ${colors.border}` 
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
        
        <div className="flex items-center">
          <Image src="/stork-logo.svg" alt="Stork Logo" width={100} height={33} className="h-8 w-auto" />
        </div>

        <WalletButton />
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
          {isMobile && isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
          
          {/* Left Sidebar */}
          <div 
            className={`
              w-80 border-r-4 flex flex-col relative z-[0]
              ${isMobile ? `
                fixed top-[73px] left-0 h-[calc(100vh-73px)] z-40
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
              ` : ''}
              md:relative md:transform-none md:transition-none
            `}
            style={{ 
              backgroundColor: colors.bg, 
              borderRightColor: colors.border 
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
          <div className="flex-1 flex flex-col relative z-[1]" style={{ overflow: 'hidden' }}>
            {/* Desktop Header with Connect Wallet */}
            <div 
              className="hidden md:flex items-center justify-end p-6 relative"
              style={{ 
                background: `linear-gradient(to bottom, ${colors.bg}, transparent)` 
              }}
            >
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
                  <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto relative" style={{ overflowX: 'visible', paddingLeft: '50px', paddingRight: '50px', minHeight: 0 }}>
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
                            
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`${
                                    msg.type === 'sticker' || msg.type === 'voice'
                                      ? '' // No styling for sticker and voice messages (they handle their own styling)
                                      : `max-w-[70%] p-3 border-2 ${isOwnMessage ? 'bg-blue-50' : ''}`
                                  }`}
                                  style={msg.type === 'sticker' || msg.type === 'voice' ? {} : {
                                    borderColor: colors.border,
                                    backgroundColor: isOwnMessage ? (isDarkMode ? '#1E3A8A20' : '#EFF6FF') : colors.bg
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
                                      status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                      isReadByRecipient={isReadByRecipient}
                                    />
                                  )}

                                  {/* Only show message text for non-sticker/voice messages or special messages with custom text */}
                                  {(msg.type !== 'sticker' && msg.type !== 'voice' || (msg.type === 'sticker' && msg.message_content !== 'Sent a sticker')) && (
                                    <p 
                                      className="text-sm"
                                      style={{ 
                                        fontFamily: "Helvetica Neue, sans-serif",
                                        color: colors.text 
                                      }}
                                    >
                                      {msg.message_content}
                                    </p>
                                  )}
                                  {/* Show timestamp/status for all messages except voice (they handle their own) */}
                                  {msg.type !== 'voice' && (
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
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input Area - Fixed Container */}
                  <div className="relative flex items-center justify-center flex-shrink-0 z-[5]" style={{ 
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
                      <div className="flex items-center gap-3 w-full relative z-[3]">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3 flex-1">
                          <div className="flex-1 flex items-center" style={{ border: `2px solid ${colors.border}` }}>
                            <Input
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
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
                              disabled={!message.trim() || !connected || !publicKey || !isAuthenticated}
                              className="rounded-none h-12 w-12 p-0 hover:opacity-80 disabled:opacity-50"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                borderTop: 'none',
                                borderRight: 'none',
                                borderBottom: 'none',
                                borderLeft: `2px solid ${colors.border}`
                              }}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Chat Sticker Button - kept inside form */}
                          <ChatStickerButton
                            ref={chatStickerButtonRef}
                            isOpen={isChatStickerPickerOpen}
                            onClick={() => setIsChatStickerPickerOpen(!isChatStickerPickerOpen)}
                            colors={colors}
                          />
                        </form>

                        {/* Voice Recorder - moved OUTSIDE form to prevent interference */}
                        <ExpandingVoiceRecorder
                          onSend={handleSendVoice}
                          colors={colors}
                          isDarkMode={isDarkMode}
                        />
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
