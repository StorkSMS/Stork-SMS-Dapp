'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { supabase, clearClientCache } from '@/lib/supabase'
import { 
  SessionManager, 
  ErrorHandler, 
  RetryManager, 
  AuthLogger, 
  ValidationUtils,
  AuthenticationError 
} from '@/lib/error-handling'

type AuthStatus = 'idle' | 'authenticating' | 'authenticated' | 'error'

interface AuthState {
  status: AuthStatus
  user: any | null
  error: string | null
  requiresSignature: boolean
}

interface SignatureData {
  message: string
  timestamp: number
  nonce: string
}

interface AuthContextType {
  // State
  isAuthenticated: boolean
  isAuthenticating: boolean
  user: any | null
  error: string | null
  requiresSignature: boolean
  authStatus: AuthStatus
  
  // Removed force re-render trigger - using stable context pattern instead
  
  // Computed values
  walletAddress: string | null
  isConnected: boolean
  signatureData: SignatureData | null
  
  // Methods
  authenticateWithWallet: () => Promise<void>
  signOut: () => Promise<void>
  setAwaitingSignature: (awaiting: boolean) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Global authentication promise to prevent concurrent requests
let globalAuthPromise: Promise<any> | null = null

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Unique instance ID to track this single auth instance
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  console.log('🏗️ AUTH PROVIDER CREATED WITH INSTANCE ID:', instanceId.current)
  
  const { publicKey, connected, signMessage } = useWallet()
  const [state, setState] = useState<AuthState>({
    status: 'idle',
    user: null,
    error: null,
    requiresSignature: false
  })
  
  // Removed force re-render counter - no longer needed
  
  // Ref to track if authentication is in progress (prevents race conditions)
  const authInProgressRef = useRef(false)
  
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null)
  
  // Debug: Track when state changes to authenticated
  useEffect(() => {
    if (state.status === 'authenticated') {
      console.log('🟢 AUTH PROVIDER STATE CHANGED TO AUTHENTICATED:', {
        instanceId: instanceId.current,
        status: state.status,
        hasUser: !!state.user,
        timestamp: new Date().toISOString()
      })
    }
  }, [state.status, state.user])

  // Removed force re-render system - causing infinite loops

  // Cleanup when wallet disconnects - only reset when both connected and publicKey are false
  useEffect(() => {
    console.log('🔍 AUTH PROVIDER WALLET CONNECTION CHECK:', {
      instanceId: instanceId.current,
      connected,
      hasPublicKey: !!publicKey,
      shouldReset: !connected && !publicKey,
      currentAuthStatus: state.status,
      timestamp: new Date().toISOString()
    })
    
    if (!connected && !publicKey) {
      console.log('🔌 Wallet fully disconnected, clearing auth state')
      // Clear all authentication tokens (we don't know which wallet was connected)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('auth_token_')) {
          localStorage.removeItem(key)
        }
      })
      // Clear Supabase client cache
      clearClientCache()
      // Clear global authentication promise
      globalAuthPromise = null
      // Reset auth state
      setState({
        status: 'idle',
        user: null,
        error: null,
        requiresSignature: false
      })
      authInProgressRef.current = false
      setSignatureData(null)
    }
  }, [connected, publicKey])

  // Request signature data from server - stable function
  const requestSignatureData = useCallback(async (walletAddress: string): Promise<SignatureData | null> => {
    try {
      const response = await fetch(`/api/auth/wallet-signin?wallet_address=${walletAddress}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get signature data')
      }
      
      return result.data as SignatureData
    } catch (error) {
      console.error('Failed to get signature data:', error)
      return null
    }
  }, []) // No dependencies - stable function

  // Get wallet signature - stable with signMessage dependency
  const getWalletSignature = useCallback(async (message: string): Promise<string | null> => {
    if (!signMessage) {
      throw new Error('Wallet does not support message signing')
    }
    
    try {
      const messageBytes = new TextEncoder().encode(message)
      const signature = await signMessage(messageBytes)
      return Buffer.from(signature).toString('base64')
    } catch (error) {
      console.error('Failed to sign message:', error)
      throw error
    }
  }, [signMessage]) // Only depends on signMessage

  // Signature-based wallet authentication
  const authenticateWithWallet = useCallback(async () => {
    if (!publicKey || !connected || !signMessage) {
      setState(prev => ({ ...prev, status: 'error', error: 'Wallet not connected or does not support signing' }))
      return
    }

    const walletAddress = publicKey.toString()
    
    // Validate wallet address
    if (!ValidationUtils.isValidSolanaAddress(walletAddress)) {
      setState(prev => ({ ...prev, status: 'error', error: 'Invalid wallet address format' }))
      return
    }

    // Prevent concurrent authentication attempts
    if (authInProgressRef.current || state.status === 'authenticating') {
      console.log('🚫 Authentication already in progress, skipping...')
      return
    }
    
    authInProgressRef.current = true
    setState(prev => ({ ...prev, status: 'authenticating', error: null, requiresSignature: false }))
    AuthLogger.logAuthAttempt(walletAddress, false, 'Starting authentication')

    try {
      console.log('🔐 AUTH PROVIDER Starting signature-based authentication for:', ValidationUtils.sanitizeWalletAddress(walletAddress))
      
      // Step 1: Get signature challenge from server
      const sigData = await requestSignatureData(walletAddress)
      if (!sigData) {
        throw new Error('Failed to get signature challenge from server')
      }
      
      setSignatureData(sigData)
      setState(prev => ({ ...prev, requiresSignature: true }))
      
      AuthLogger.logSignatureRequest(walletAddress)
      console.log('📝 Requesting wallet signature...')
      
      // Double-check wallet is still connected before requesting signature
      if (!connected || !signMessage) {
        throw new Error('Wallet disconnected before signature could be requested')
      }
      
      // Step 2: Request signature from wallet
      const signature = await getWalletSignature(sigData.message)
      if (!signature) {
        throw new Error('Failed to get signature from wallet')
      }
      
      console.log('✍️ Signature obtained, verifying with server...')
      
      // Step 3: Send signature to server for verification
      const response = await fetch('/api/auth/wallet-signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          signature,
          message: sigData.message,
          timestamp: sigData.timestamp,
          nonce: sigData.nonce
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed')
      }
      
      // Step 4: Store token for Supabase client
      const authData = {
        user: result.user,
        token: result.token,
        wallet_address: walletAddress,
        expires_at: Date.now() + (60 * 60 * 1000), // 1 hour from now
        created_at: Date.now()
      }
      
      // Store token for Supabase client access
      localStorage.setItem(`auth_token_${walletAddress}`, JSON.stringify(authData))
      console.log('💾 Auth token stored in localStorage:', {
        walletAddress: walletAddress.slice(0, 8) + '...',
        tokenLength: authData.token?.length || 0,
        expiresAt: new Date(authData.expires_at).toISOString()
      })
      
      // Use functional state update to ensure proper merging
      setState(prev => {
        const newState = {
          ...prev,
          status: 'authenticated' as AuthStatus,
          user: result.user,
          error: null,
          requiresSignature: false
        }
        console.log('🔄 AUTH PROVIDER SETTING STATE TO AUTHENTICATED:', {
          instanceId: instanceId.current,
          prevStatus: prev.status,
          newStatus: newState.status,
          timestamp: new Date().toISOString()
        })
        return newState
      })
      
      // Cleanup after successful authentication
      authInProgressRef.current = false
      setSignatureData(null)
      globalAuthPromise = null
      
      AuthLogger.logAuthAttempt(walletAddress, true)
      console.log('✅ AUTH PROVIDER Signature-based authentication successful!')
      console.log('🎯 AUTH PROVIDER Authentication state updated:', {
        instanceId: instanceId.current,
        isAuthenticated: true,
        walletAddress: walletAddress.slice(0, 8) + '...',
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      const authError = ErrorHandler.handleAuthError(error)
      
      AuthLogger.logAuthAttempt(walletAddress, false, authError.errorInfo.message)
      console.error('❌ AUTH PROVIDER Signature-based authentication failed:', authError.errorInfo.message)
      
      setState(prev => ({
        ...prev,
        status: 'error',
        requiresSignature: false,
        error: authError.errorInfo.message
      }))
      
      authInProgressRef.current = false
      setSignatureData(null)
      globalAuthPromise = null
    }
  }, [publicKey, connected, requestSignatureData, getWalletSignature])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      if (publicKey) {
        const walletAddress = publicKey.toString()
        
        // Clear authentication token
        localStorage.removeItem(`auth_token_${walletAddress}`)
        
        // Clear Supabase client cache
        clearClientCache(walletAddress)
        
        // Call sign-out endpoint
        await fetch('/api/auth/wallet-signin', { method: 'DELETE' })
      }
      
      setState({
        status: 'idle',
        user: null,
        error: null,
        requiresSignature: false
      })
      
      authInProgressRef.current = false
      setSignatureData(null)
      globalAuthPromise = null
      console.log('✅ AUTH PROVIDER Sign out successful')
    } catch (error) {
      console.error('AUTH PROVIDER Sign out error:', error)
      // Still update state even if API call fails
      setState({
        status: 'idle',
        user: null,
        error: null,
        requiresSignature: false
      })
      
      authInProgressRef.current = false
    }
  }, [publicKey])

  // Method to set awaiting signature state during delays
  const setAwaitingSignature = useCallback((awaiting: boolean) => {
    setState(prev => ({
      ...prev,
      requiresSignature: awaiting,
      status: awaiting ? 'authenticating' : (prev.status === 'authenticating' ? 'idle' : prev.status)
    }))
  }, [])

  const contextValue = useMemo(() => ({
    // State
    isAuthenticated: state.status === 'authenticated',
    isAuthenticating: state.status === 'authenticating',
    user: state.user,
    error: state.error,
    requiresSignature: state.requiresSignature,
    authStatus: state.status,
    
    // Computed values
    walletAddress: publicKey?.toString() || null,
    isConnected: connected,
    signatureData,
    
    // Methods
    authenticateWithWallet,
    signOut,
    setAwaitingSignature
  }), [
    state.status,
    state.user,
    state.error,
    state.requiresSignature,
    publicKey,
    connected,
    signatureData,
    authenticateWithWallet,
    signOut,
    setAwaitingSignature
  ])

  // Log only important auth state changes
  if (state.status === 'authenticated' || state.status === 'error') {
    console.log('🔍 AUTH PROVIDER STATUS:', {
      instanceId: instanceId.current,
      status: state.status,
      isAuthenticated: contextValue.isAuthenticated,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}