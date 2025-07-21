// Frontend message encryption utilities for Stork SMS
import { useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'

// Simple AES-based encryption for messages (client-side)
// Note: This is a basic implementation. In production, use more robust encryption libraries

interface EncryptionResult {
  encryptedContent: string
  encryptionMeta: {
    encrypted: boolean
    method: string
    timestamp: string
  }
}

interface DecryptionResult {
  decryptedContent: string
  success: boolean
  error?: string
}

class MessageEncryption {
  // Simple cache for generated keys to avoid repeated key generation
  private static keyCache = new Map<string, CryptoKey>()
  
  private static async generateKey(password: string): Promise<CryptoKey> {
    // Check cache first
    if (this.keyCache.has(password)) {
      return this.keyCache.get(password)!
    }
    
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    
    const key = await crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    )
    
    // Cache the key for future use
    this.keyCache.set(password, key)
    
    // Clear cache if it gets too large (prevent memory leaks)
    if (this.keyCache.size > 100) {
      const firstKey = this.keyCache.keys().next().value
      if (firstKey) {
        this.keyCache.delete(firstKey)
      }
    }
    
    return key
  }

  private static generatePassword(chatId: string, participants: string[]): string {
    // Create a deterministic password based on chat and participants
    const sortedParticipants = [...participants].sort()
    return `stork-chat-${chatId}-${sortedParticipants.join('-')}`
  }

  /**
   * Encrypt a message for storage
   */
  static async encryptMessage(
    content: string,
    chatId: string,
    participants: string[]
  ): Promise<EncryptionResult> {
    try {
      // Validate inputs
      if (!content || !chatId || !participants.length) {
        throw new Error('Missing required parameters for encryption')
      }

      // Generate encryption key from chat context
      const password = this.generatePassword(chatId, participants)
      const key = await this.generateKey(password)
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt the content
      const encoder = new TextEncoder()
      const data = encoder.encode(content)
      
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      )
      
      // Combine IV and encrypted data
      const encryptedArray = new Uint8Array(encrypted)
      const combined = new Uint8Array(iv.length + encryptedArray.length)
      combined.set(iv)
      combined.set(encryptedArray, iv.length)
      
      // Convert to base64
      const encryptedContent = btoa(String.fromCharCode.apply(null, Array.from(combined)))
      
      return {
        encryptedContent,
        encryptionMeta: {
          encrypted: true,
          method: 'aes-gcm-browser',
          timestamp: new Date().toISOString()
        }
      }
      
    } catch (error) {
      console.error('Message encryption failed:', error)
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Decrypt a message from storage
   */
  static async decryptMessage(
    encryptedContent: string,
    chatId: string,
    participants: string[]
  ): Promise<DecryptionResult> {
    try {
      // Validate inputs
      if (!encryptedContent || !chatId || !participants.length) {
        throw new Error('Missing required parameters for decryption')
      }

      // Generate decryption key from chat context
      const password = this.generatePassword(chatId, participants)
      const key = await this.generateKey(password)
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedContent)
          .split('')
          .map(char => char.charCodeAt(0))
      )
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12)
      const encryptedData = combined.slice(12)
      
      // Decrypt the content
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedData
      )
      
      // Convert back to string
      const decoder = new TextDecoder()
      const decryptedContent = decoder.decode(decrypted)
      
      return {
        decryptedContent,
        success: true
      }
      
    } catch (error) {
      console.error('Message decryption failed:', error)
      return {
        decryptedContent: '[Decryption Failed]',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check if content appears to be encrypted
   */
  static isEncrypted(content: string): boolean {
    try {
      // Check if it's valid base64 and has reasonable length
      if (!content || content.length < 20) return false
      
      // Try to decode as base64
      const decoded = atob(content)
      
      // Should have at least IV (12 bytes) + some encrypted content
      return decoded.length >= 20
      
    } catch {
      return false
    }
  }

  /**
   * Validate wallet addresses for encryption
   */
  static validateParticipants(participants: string[]): boolean {
    if (!participants || participants.length === 0) return false
    
    return participants.every(participant => {
      try {
        new PublicKey(participant)
        return true
      } catch {
        return false
      }
    })
  }

  /**
   * Generate a secure chat ID for encryption context
   */
  static generateSecureChatId(senderWallet: string, recipientWallet: string): string {
    // Create deterministic chat ID based on participants
    const participants = [senderWallet, recipientWallet].sort()
    const combined = participants.join('-')
    
    // Simple hash function for chat ID
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `chat-${Math.abs(hash)}-${Date.now()}`
  }
}

// Hook for message encryption/decryption
export const useMessageEncryption = () => {
  // Use useCallback to prevent function recreation on every render
  const encryptForChat = useCallback(async (
    content: string,
    chatId: string,
    participants: string[]
  ): Promise<EncryptionResult> => {
    return MessageEncryption.encryptMessage(content, chatId, participants)
  }, [])

  const decryptFromChat = useCallback(async (
    encryptedContent: string,
    chatId: string,
    participants: string[]
  ): Promise<DecryptionResult> => {
    return MessageEncryption.decryptMessage(encryptedContent, chatId, participants)
  }, [])

  const checkIfEncrypted = useCallback((content: string): boolean => {
    return MessageEncryption.isEncrypted(content)
  }, [])

  const validateChatParticipants = useCallback((participants: string[]): boolean => {
    return MessageEncryption.validateParticipants(participants)
  }, [])

  return {
    encryptForChat,
    decryptFromChat,
    checkIfEncrypted,
    validateChatParticipants,
    generateChatId: MessageEncryption.generateSecureChatId
  }
}

export { MessageEncryption }