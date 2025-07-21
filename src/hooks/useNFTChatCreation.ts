import { useState, useCallback } from 'react'
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
  { name: 'Creating NFTs on blockchain...', weight: 40 },
  { name: 'Storing chat record...', weight: 20 }
]

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

  const updateProgress = useCallback((stepIndex: number, stepProgress: number = 100) => {
    const completedSteps = CREATION_STEPS.slice(0, stepIndex)
    const completedWeight = completedSteps.reduce((sum, step) => sum + step.weight, 0)
    const currentStepWeight = CREATION_STEPS[stepIndex]?.weight || 0
    const currentProgress = (currentStepWeight * stepProgress) / 100
    
    setState(prev => ({
      ...prev,
      progress: Math.min(100, completedWeight + currentProgress)
    }))
  }, [])

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
    
    // For senders, use the simple system
    console.log(`🎯 Generating sender NFT using SIMPLE system...`)
    
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

    // Generate sender image and use preview canvas data for recipient
    const senderImageUrl = await generateNFTImage(messageContent, recipientWallet, 'sender', theme, selectedSticker)
    
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

    // Create fee transaction for dual NFT creation
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com')
    const companyWalletPubkey = new PublicKey('ELY9hWRL9UeoFiip9eVU6y68vG12DZTwVPk9bmV3FcSw')
    
    // Fee for dual NFT creation: (0.01 SOL * 2 NFTs) * 10% fee = 0.002 SOL
    const baseCost = 0.01 // SOL per NFT
    const dualNFTCost = baseCost * 2 // Two NFTs
    const feePercentage = 0.1 // 10%
    const totalFeeAmount = dualNFTCost * feePercentage
    const feeAmountLamports = totalFeeAmount * LAMPORTS_PER_SOL

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: companyWalletPubkey,
        lamports: feeAmountLamports,
      })
    )

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = publicKey

    // Send transaction for user signing
    const signature = await sendTransaction(transaction, connection)

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')

    return signature
  }

  const createChatNFT = async (params: {
    messageContent: string
    senderWallet: string
    recipientWallet: string
    senderImageUrl: string
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
      
      const senderImageUrl = await generateNFTImage(
        params.messageContent,
        params.recipientWallet,
        'sender',
        params.theme || 'default',
        params.selectedSticker
      )
      
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
      
      const feeTransactionSignature = await collectFee(messageId)
      
      updateProgress(2, 100)

      // Step 4-5: Create NFTs and chat (handled by API)
      setState(prev => ({ ...prev, isCreatingNFT: true }))
      updateProgress(3, 0)

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

      updateProgress(4, 100)

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
          const senderImageUrl = await generateNFTImage(
            params.messageContent,
            params.recipientWallet,
            'sender',
            params.theme || 'default',
            params.selectedSticker
          )
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

          // Step 3-4: Create NFTs and chat (handled by API)
          updateProgress(3, 0)
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
          updateProgress(4, 100)

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
      if (state.progress < 15) return CREATION_STEPS[0].name // Generating sender NFT
      return CREATION_STEPS[1].name // Generating recipient NFT
    }
    
    if (state.isCreatingNFT) {
      if (state.progress < 40) return CREATION_STEPS[2].name // Collecting fee
      if (state.progress < 80) return CREATION_STEPS[3].name // Creating NFTs
      return CREATION_STEPS[4].name // Storing chat record
    }
    
    return null
  }, [state])

  return {
    ...state,
    createNFTChat,
    createNFTChatWithImmediateSignature,
    resetState,
    getCurrentStep,
    canCreate: connected && publicKey,
    estimatedCost: '0.002 SOL', // Fee amount for dual NFT creation from backend
    steps: CREATION_STEPS,
    setPreviewCanvasData
  }
}