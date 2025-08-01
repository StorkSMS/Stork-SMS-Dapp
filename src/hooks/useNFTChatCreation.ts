import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { v4 as uuidv4 } from 'uuid'

interface NFTChatCreationState {
  isCreating: boolean
  isGeneratingImage: boolean
  isCreatingNFT: boolean
  progress: number
  error: string | null
  success: boolean
  result: NFTChatResult | null
}

interface NFTChatResult {
  chatId: string
  senderNftMintAddress: string
  recipientNftMintAddress: string
  senderTransactionSignature: string
  recipientTransactionSignature: string
  senderImageUrl: string
  recipientImageUrl: string
  senderMetadataUrl: string
  recipientMetadataUrl: string
  feeTransactionSignature: string
}

interface CreateNFTChatParams {
  recipientWallet: string
  messageContent: string
  selectedSticker?: string | null
  theme?: string
  customization?: {
    backgroundColor?: string
    textColor?: string
    fontFamily?: string
  }
}

const CREATION_STEPS = [
  { name: 'Generating sender NFT image...', weight: 15 },
  { name: 'Generating recipient NFT image...', weight: 15 },
  { name: 'Collecting creation fee...', weight: 10 },
  { name: 'Creating NFTs on blockchain...', weight: 35 }, // 0-60%
  { name: 'Verifying NFTs in collection...', weight: 15 }, // 60-75%
  { name: 'Encrypting message...', weight: 5 }, // 75-80%
  { name: 'Creating chat...', weight: 10 } // 80-90%
]

// Animation configuration for smooth progress after fee collection
const ANIMATION_CONFIG = {
  duration: 22000, // 22 seconds
  maxProgress: 98, // Stop at 98%
  steps: [
    { name: 'Creating NFTs on blockchain...', endProgress: 60 },
    { name: 'Verifying NFTs in collection...', endProgress: 75 },
    { name: 'Encrypting message...', endProgress: 80 },
    { name: 'Creating chat...', endProgress: 98 }
  ]
}

export const useNFTChatCreation = () => {
  const { publicKey, connected, sendTransaction } = useWallet()
  const [state, setState] = useState<NFTChatCreationState>({
    isCreating: false,
    isGeneratingImage: false,
    isCreatingNFT: false,
    progress: 0,
    error: null,
    success: false,
    result: null
  })
  
  const [previewCanvasData, setPreviewCanvasData] = useState<string | null>(null)
  const [senderPreviewCanvasData, setSenderPreviewCanvasData] = useState<string | null>(null)
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null)
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null)

  const updateProgress = useCallback((stepIndex: number, stepProgress: number = 100) => {
    const completedSteps = CREATION_STEPS.slice(0, stepIndex)
    const completedWeight = completedSteps.reduce((sum, step) => sum + step.weight, 0)
    const currentStepWeight = CREATION_STEPS[stepIndex]?.weight || 0
    const currentProgress = (currentStepWeight * stepProgress) / 100
    const newProgress = Math.min(100, completedWeight + currentProgress)
    
    // Progress update logic - removed verbose logging
    
    setState(prev => ({
      ...prev,
      progress: newProgress
    }))
  }, [])

  // Smooth animation function that starts after fee collection
  const startSmoothAnimation = useCallback(() => {
    // Clear any existing animation
    if (animationInterval) {
      clearInterval(animationInterval)
    }
    
    const startTime = Date.now()
    setAnimationStartTime(startTime)
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min((elapsed / ANIMATION_CONFIG.duration) * ANIMATION_CONFIG.maxProgress, ANIMATION_CONFIG.maxProgress)
      
      setState(prev => ({
        ...prev,
        progress: 40 + (progress * 0.59) // Start from 40% and animate to 98% (40 + 58% range)
      }))
      
      // Stop animation when we reach max progress or time limit
      if (progress >= ANIMATION_CONFIG.maxProgress || elapsed >= ANIMATION_CONFIG.duration) {
        clearInterval(interval)
        setAnimationInterval(null)
      }
    }, 100) // Update every 100ms for smooth animation
    
    setAnimationInterval(interval)
  }, [animationInterval])

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval)
      }
    }
  }, [animationInterval])

  const generateNFTImage = async (
    messageContent: string, 
    recipientWallet: string, 
    nftType: 'sender' | 'recipient',
    theme: string = 'default',
    selectedSticker?: string | null
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected')
    }
    
    // For recipients, we'll use the preview canvas data instead of backend generation
    if (nftType === 'recipient') {
      console.log(`🎯 Using preview canvas data for recipient NFT`)
      if (!previewCanvasData) {
        throw new Error('Preview canvas data not available - please wait for preview to load')
      }
      console.log(`📷 Canvas data URL length:`, previewCanvasData.length)
      console.log(`📷 Canvas data preview:`, previewCanvasData.substring(0, 50) + '...')
      return previewCanvasData
    }
    
    // For senders, use the preview canvas data (like recipients)
    if (nftType === 'sender') {
      console.log(`🎯 Using sender preview canvas data for sender NFT`)
      if (!senderPreviewCanvasData) {
        throw new Error('Sender preview canvas data not available - please wait for preview to load')
      }
      console.log(`📷 Sender canvas data URL length:`, senderPreviewCanvasData.length)
      console.log(`📷 Sender canvas data preview:`, senderPreviewCanvasData.substring(0, 50) + '...')
      return senderPreviewCanvasData
    }
    
    // Fallback for other types - use the simple system
    console.log(`🎯 Generating NFT using SIMPLE system...`)
    
    const response = await fetch('/api/generate-nft-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageContent,
        senderWallet: publicKey.toString(),
        recipientWallet,
        nftType,
        theme,
        selectedSticker
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate NFT image')
    }

    const result = await response.json()
    if (!result.success || !result.imageUrl) {
      throw new Error(result.error || 'Image generation failed')
    }
    return result.imageUrl
  }

  const generateBothNFTImages = async (
    messageContent: string, 
    recipientWallet: string, 
    theme: string = 'default',
    selectedSticker?: string | null
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected')
    }

    // Use sender preview canvas data (like recipients)
    const senderImageUrl = senderPreviewCanvasData // Frontend-generated high-quality canvas data
    
    // Use preview canvas data for recipient if available
    const recipientImageUrl = previewCanvasData || await generateNFTImage(messageContent, recipientWallet, 'recipient', theme, selectedSticker)

    return {
      senderImageUrl,
      recipientImageUrl
    }
  }

  const collectFee = async (messageId: string) => {
    if (!publicKey || !connected || !sendTransaction) {
      throw new Error('Wallet not connected or does not support transactions')
    }

    // Use public RPC for transaction creation (sensitive operations happen server-side)
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')
    const companyWalletPubkey = new PublicKey(process.env.NEXT_PUBLIC_COMPANY_WALLET_PUB || process.env.COMPANY_WALLET_PUB || 'EwktyJpVe1ge9K4CP6hBq7w755RWgZ2z6c9zP2Stork')
    
    // Skip payment collection if the sender is the company wallet
    if (publicKey.equals(companyWalletPubkey)) {
      console.log('💰 Company wallet detected - skipping payment collection')
      return 'company-wallet-exempt'
    }
    
    // Total cost for dual NFT creation
    const totalAmount = 0.0033 // SOL for both NFTs
    
    console.log('💰 Payment collection details:', {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      companyWallet: companyWalletPubkey.toBase58(),
      totalAmount: `${totalAmount} SOL`,
      description: 'Dual NFT creation (sender + recipient)'
    })
    
    const totalAmountLamports = totalAmount * LAMPORTS_PER_SOL

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: companyWalletPubkey,
        lamports: totalAmountLamports,
      })
    )

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = publicKey

    // Send transaction for user signing
    console.log('💳 Sending transaction for user signature...')
    const signature = await sendTransaction(transaction, connection)
    console.log('📝 Transaction sent, signature:', signature)

    // Wait for confirmation with timeout
    console.log('⏳ Waiting for transaction confirmation...')
    try {
      await connection.confirmTransaction(signature, 'confirmed')
      console.log('✅ Transaction confirmed successfully')
    } catch (confirmError) {
      console.error('❌ Transaction confirmation failed:', confirmError)
      // Still return the signature even if confirmation fails
      console.log('⚠️ Continuing with unconfirmed transaction - this is often normal')
    }

    console.log('💰 Fee collection function returning signature:', signature)
    return signature
  }

  const createChatNFT = async (params: {
    messageContent: string
    senderWallet: string
    recipientWallet: string
    senderImageUrl?: string // Optional - let server generate if not provided
    recipientImageUrl: string
    messageId: string
    feeTransactionSignature: string
    theme?: string
    selectedSticker?: string | null
    customization?: any
  }) => {
    if (!publicKey) {
      throw new Error('Wallet not connected')
    }

    // Get auth token from local storage (same pattern as message sending)
    const walletAddress = publicKey.toString()
    const storedData = localStorage.getItem(`auth_token_${walletAddress}`)
    
    if (!storedData) {
      throw new Error('No authentication token available')
    }
    
    const authData = JSON.parse(storedData)
    const authToken = authData.token

    if (!authToken) {
      throw new Error('No authentication token available')
    }

    const response = await fetch('/api/create-chat-nft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Wallet-Address': walletAddress
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create chat NFT')
    }

    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'NFT creation failed')
    }

    return result
  }

  const createNFTChat = useCallback(async (params: CreateNFTChatParams) => {
    if (!connected || !publicKey) {
      throw new Error('Wallet not connected')
    }

    if (!params.recipientWallet || !params.messageContent) {
      throw new Error('Recipient wallet and message content are required')
    }

    setState({
      isCreating: true,
      isGeneratingImage: false,
      isCreatingNFT: false,
      progress: 0,
      error: null,
      success: false,
      result: null
    })

    try {
      const messageId = uuidv4()
      const senderWallet = publicKey.toString()

      // Step 1: Generate sender NFT image
      setState(prev => ({ ...prev, isGeneratingImage: true }))
      updateProgress(0, 0)
      
      // Don't generate sender image URL here - let /api/create-chat-nft decide which system to use
      const senderImageUrl = undefined // This will trigger server-side generation with correct system
      
      updateProgress(0, 100)

      // Step 2: Generate recipient NFT image
      updateProgress(1, 0)
      
      const recipientImageUrl = await generateNFTImage(
        params.messageContent,
        params.recipientWallet,
        'recipient',
        params.theme || 'default',
        params.selectedSticker
      )
      
      updateProgress(1, 100)
      setState(prev => ({ ...prev, isGeneratingImage: false }))

      // Step 3: Collect fee with wallet signing
      updateProgress(2, 0)
      
      console.log('💰 Starting fee collection for messageId:', messageId)
      const feeTransactionSignature = await collectFee(messageId)
      console.log('✅ Fee collection completed, signature:', feeTransactionSignature)
      updateProgress(2, 100)
      console.log('✅ Progress updated to step 3 (fee collection complete)')

      // Start smooth animation immediately after fee collection
      setState(prev => ({ ...prev, isCreatingNFT: true }))
      startSmoothAnimation()

      console.log('📝 Starting NFT creation API call...')
      const nftResult = await createChatNFT({
        messageContent: params.messageContent,
        senderWallet,
        recipientWallet: params.recipientWallet,
        senderImageUrl,
        recipientImageUrl,
        messageId,
        feeTransactionSignature,
        theme: params.theme,
        selectedSticker: params.selectedSticker,
        customization: params.customization
      })
      console.log('✅ NFT creation API call completed')

      // API call is complete, but animation continues until 90%
      // The animation will stop itself at 90% or after 20 seconds

      const result: NFTChatResult = {
        chatId: nftResult.chatRecordId,
        senderNftMintAddress: nftResult.senderNftMintAddress,
        recipientNftMintAddress: nftResult.recipientNftMintAddress,
        senderTransactionSignature: nftResult.senderTransactionSignature,
        recipientTransactionSignature: nftResult.recipientTransactionSignature,
        senderImageUrl: nftResult.senderImageUrl,
        recipientImageUrl: nftResult.recipientImageUrl,
        senderMetadataUrl: nftResult.senderMetadataUrl,
        recipientMetadataUrl: nftResult.recipientMetadataUrl,
        feeTransactionSignature: nftResult.feeTransactionSignature
      }

      setState({
        isCreating: false,
        isGeneratingImage: false,
        isCreatingNFT: false,
        progress: 100,
        error: null,
        success: true,
        result
      })

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setState({
        isCreating: false,
        isGeneratingImage: false,
        isCreatingNFT: false,
        progress: 0,
        error: errorMessage,
        success: false,
        result: null
      })

      throw error
    }
  }, [connected, publicKey, updateProgress])

  // New method for immediate transaction signing flow
  const createNFTChatWithImmediateSignature = useCallback(async (params: CreateNFTChatParams, onPendingChatCreated?: (pendingChat: any) => void) => {
    if (!connected || !publicKey) {
      throw new Error('Wallet not connected')
    }

    if (!params.recipientWallet || !params.messageContent) {
      throw new Error('Recipient wallet and message content are required')
    }

    try {
      const messageId = uuidv4()
      const senderWallet = publicKey.toString()

      // Immediately collect fee signature (this will trigger wallet popup)
      const feeTransactionSignature = await collectFee(messageId)

      // Create pending chat object to show in sidebar
      const pendingChat = {
        id: messageId,
        type: 'pending',
        recipient: params.recipientWallet,
        message: params.messageContent,
        theme: params.theme || 'default',
        selectedSticker: params.selectedSticker,
        customization: params.customization,
        createdAt: new Date(),
        feeTransactionSignature,
        senderWallet,
        status: 'processing' as const
      }

      // Notify parent component about pending chat creation
      if (onPendingChatCreated) {
        onPendingChatCreated(pendingChat)
      }

      // Start background processing
      setState({
        isCreating: true,
        isGeneratingImage: true,
        isCreatingNFT: false,
        progress: 10, // Show some initial progress
        error: null,
        success: false,
        result: null
      })

      // Process everything in background
      const backgroundProcess = async () => {
        try {
          // Step 1: Generate sender NFT image
          updateProgress(0, 0)
          // Don't generate sender image URL here - let /api/create-chat-nft decide which system to use
          const senderImageUrl = undefined // This will trigger server-side generation with correct system
          updateProgress(0, 100)

          // Step 2: Generate recipient NFT image
          updateProgress(1, 0)
          const recipientImageUrl = await generateNFTImage(
            params.messageContent,
            params.recipientWallet,
            'recipient',
            params.theme || 'default',
            params.selectedSticker
          )
          updateProgress(1, 100)
          setState(prev => ({ ...prev, isGeneratingImage: false, isCreatingNFT: true }))

          // Start smooth animation after fee collection and image generation
          startSmoothAnimation()
          
          console.log('📝 Starting NFT creation API call...')
          const nftResult = await createChatNFT({
            messageContent: params.messageContent,
            senderWallet,
            recipientWallet: params.recipientWallet,
            senderImageUrl,
            recipientImageUrl,
            messageId,
            feeTransactionSignature,
            theme: params.theme,
            selectedSticker: params.selectedSticker,
            customization: params.customization
          })
          console.log('✅ NFT creation API call completed')
          
          // API call is complete, but animation continues until 90%

          const result: NFTChatResult = {
            chatId: nftResult.chatRecordId,
            senderNftMintAddress: nftResult.senderNftMintAddress,
            recipientNftMintAddress: nftResult.recipientNftMintAddress,
            senderTransactionSignature: nftResult.senderTransactionSignature,
            recipientTransactionSignature: nftResult.recipientTransactionSignature,
            senderImageUrl: nftResult.senderImageUrl,
            recipientImageUrl: nftResult.recipientImageUrl,
            senderMetadataUrl: nftResult.senderMetadataUrl,
            recipientMetadataUrl: nftResult.recipientMetadataUrl,
            feeTransactionSignature: nftResult.feeTransactionSignature
          }

          setState({
            isCreating: false,
            isGeneratingImage: false,
            isCreatingNFT: false,
            progress: 100,
            error: null,
            success: true,
            result
          })

          return { ...pendingChat, status: 'completed' as const, result }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          
          setState({
            isCreating: false,
            isGeneratingImage: false,
            isCreatingNFT: false,
            progress: 0,
            error: errorMessage,
            success: false,
            result: null
          })

          return { ...pendingChat, status: 'failed' as const, error: errorMessage }
        }
      }

      // Return the pending chat and background process
      return {
        pendingChat,
        backgroundProcess: backgroundProcess()
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setState({
        isCreating: false,
        isGeneratingImage: false,
        isCreatingNFT: false,
        progress: 0,
        error: errorMessage,
        success: false,
        result: null
      })

      throw error
    }
  }, [connected, publicKey, updateProgress, collectFee, generateNFTImage, createChatNFT])

  const resetState = useCallback(() => {
    setState({
      isCreating: false,
      isGeneratingImage: false,
      isCreatingNFT: false,
      progress: 0,
      error: null,
      success: false,
      result: null
    })
  }, [])

  const getCurrentStep = useCallback(() => {
    
    if (!state.isCreating) return null
    
    if (state.isGeneratingImage) {
      // Step 0: 0-15%, Step 1: 15-30%
      if (state.progress < 15) {
        return CREATION_STEPS[0].name // Generating sender NFT
      }
      return CREATION_STEPS[1].name // Generating recipient NFT
    }
    
    if (state.isCreatingNFT) {
      // If animation is running, use animation-based steps
      if (animationStartTime !== null) {
        // Animation steps based on progress: 40-60%, 60-75%, 75-80%, 80-98%
        if (state.progress < 60) {
          return 'Creating NFTs on blockchain...'
        }
        if (state.progress < 75) {
          return 'Verifying NFTs in collection...'
        }
        if (state.progress < 80) {
          return 'Encrypting message...'
        }
        return 'Creating chat...'
      }
      
      // Original logic for fee collection phase
      if (state.progress < 40) {
        return CREATION_STEPS[2].name // Collecting fee
      }
      
      // Default to creating NFTs if not in animation yet
      return 'Creating NFTs on blockchain...'
    }
    
    return null
  }, [state, animationStartTime])

  return {
    ...state,
    createNFTChat,
    startSmoothAnimation,
    createNFTChatWithImmediateSignature,
    resetState,
    getCurrentStep,
    canCreate: connected && publicKey,
    estimatedCost: '0.002 SOL', // Fee amount for dual NFT creation from backend
    steps: CREATION_STEPS,
    setPreviewCanvasData,
    setSenderPreviewCanvasData
  }
}