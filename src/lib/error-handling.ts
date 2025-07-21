// Comprehensive error handling for the simplified authentication system

export interface AuthError {
  code: string
  message: string
  statusCode: number
  retryable: boolean
}

export const AUTH_ERRORS = {
  WALLET_NOT_CONNECTED: {
    code: 'WALLET_NOT_CONNECTED',
    message: 'Please connect your wallet to continue',
    statusCode: 401,
    retryable: true
  },
  SIGNATURE_REQUIRED: {
    code: 'SIGNATURE_REQUIRED',
    message: 'Wallet signature required for authentication',
    statusCode: 401,
    retryable: true
  },
  INVALID_SIGNATURE: {
    code: 'INVALID_SIGNATURE',
    message: 'Invalid wallet signature provided',
    statusCode: 401,
    retryable: false
  },
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    statusCode: 401,
    retryable: true
  },
  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    message: 'Authentication token is invalid',
    statusCode: 401,
    retryable: false
  },
  NO_AUTH_TOKEN: {
    code: 'NO_AUTH_TOKEN',
    message: 'No authentication token provided',
    statusCode: 401,
    retryable: true
  },
  SIGNATURE_VERIFICATION_FAILED: {
    code: 'SIGNATURE_VERIFICATION_FAILED',
    message: 'Failed to verify wallet signature',
    statusCode: 500,
    retryable: true
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error during authentication',
    statusCode: 503,
    retryable: true
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many authentication attempts, please try again later',
    statusCode: 429,
    retryable: true
  }
} as const

export class AuthenticationError extends Error {
  constructor(
    public errorInfo: AuthError,
    public originalError?: Error
  ) {
    super(errorInfo.message)
    this.name = 'AuthenticationError'
  }
}

// Session management utilities
export class SessionManager {
  private static readonly SESSION_KEY_PREFIX = 'auth_token_'
  private static readonly SESSION_DURATION = 3600 * 1000 // 1 hour

  static storeSession(walletAddress: string, authData: any): void {
    if (typeof window === 'undefined') return

    const sessionData = {
      ...authData,
      expires_at: Date.now() + this.SESSION_DURATION,
      created_at: Date.now()
    }

    localStorage.setItem(
      `${this.SESSION_KEY_PREFIX}${walletAddress}`,
      JSON.stringify(sessionData)
    )
  }

  static getSession(walletAddress: string): any | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(`${this.SESSION_KEY_PREFIX}${walletAddress}`)
      if (!stored) return null

      const sessionData = JSON.parse(stored)
      
      // Check if session is expired
      if (Date.now() > sessionData.expires_at) {
        this.clearSession(walletAddress)
        return null
      }

      return sessionData
    } catch (error) {
      console.error('Failed to retrieve session:', error)
      this.clearSession(walletAddress)
      return null
    }
  }

  static clearSession(walletAddress: string): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(`${this.SESSION_KEY_PREFIX}${walletAddress}`)
  }

  static clearAllSessions(): void {
    if (typeof window === 'undefined') return

    Object.keys(localStorage)
      .filter(key => key.startsWith(this.SESSION_KEY_PREFIX))
      .forEach(key => localStorage.removeItem(key))
  }

  static isSessionValid(walletAddress: string): boolean {
    const session = this.getSession(walletAddress)
    return session !== null
  }

  static getActiveWallets(): string[] {
    if (typeof window === 'undefined') return []

    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.SESSION_KEY_PREFIX))
      .map(key => key.replace(this.SESSION_KEY_PREFIX, ''))
      .filter(walletAddress => this.isSessionValid(walletAddress))
  }
}

// Error handling utilities
export class ErrorHandler {
  static handleAuthError(error: unknown): AuthenticationError {
    if (error instanceof AuthenticationError) {
      return error
    }

    if (error instanceof Error) {
      // Map common error messages to auth errors
      if (error.message.includes('signature')) {
        return new AuthenticationError(AUTH_ERRORS.INVALID_SIGNATURE, error)
      }
      
      if (error.message.includes('expired')) {
        return new AuthenticationError(AUTH_ERRORS.TOKEN_EXPIRED, error)
      }
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new AuthenticationError(AUTH_ERRORS.NETWORK_ERROR, error)
      }
      
      if (error.message.includes('rate limit')) {
        return new AuthenticationError(AUTH_ERRORS.RATE_LIMITED, error)
      }
    }

    // Default to signature verification failed for unknown errors
    return new AuthenticationError(
      AUTH_ERRORS.SIGNATURE_VERIFICATION_FAILED,
      error instanceof Error ? error : new Error(String(error))
    )
  }

  static getRetryDelay(errorCode: string, attemptNumber: number): number {
    const baseDelays: Record<string, number> = {
      [AUTH_ERRORS.NETWORK_ERROR.code]: 1000,
      [AUTH_ERRORS.SIGNATURE_VERIFICATION_FAILED.code]: 2000,
      [AUTH_ERRORS.RATE_LIMITED.code]: 30000,
      default: 5000
    }

    const baseDelay = baseDelays[errorCode] || baseDelays.default
    return Math.min(baseDelay * Math.pow(2, attemptNumber - 1), 30000) // Exponential backoff, max 30s
  }

  static shouldRetry(error: AuthenticationError, attemptNumber: number): boolean {
    if (attemptNumber >= 3) return false
    return error.errorInfo.retryable
  }
}

// Retry mechanism for authentication operations
export class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    errorHandler: (error: unknown) => AuthenticationError = ErrorHandler.handleAuthError
  ): Promise<T> {
    let lastError: AuthenticationError

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = errorHandler(error)
        
        if (!ErrorHandler.shouldRetry(lastError, attempt)) {
          throw lastError
        }

        if (attempt < maxRetries) {
          const delay = ErrorHandler.getRetryDelay(lastError.errorInfo.code, attempt)
          console.log(`Authentication attempt ${attempt} failed, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError!
  }
}

// Validation utilities
export class ValidationUtils {
  static isValidSolanaAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false
    
    // Basic Solana address validation
    return address.length >= 32 && 
           address.length <= 50 && 
           /^[1-9A-HJ-NP-Za-km-z]+$/.test(address)
  }

  static isValidSignature(signature: string): boolean {
    if (!signature || typeof signature !== 'string') return false
    
    // Check if it's valid base64
    try {
      const decoded = atob(signature)
      return decoded.length === 64 // ed25519 signature length
    } catch {
      return false
    }
  }

  static sanitizeWalletAddress(address: string): string {
    return address.slice(0, 8) + '...' + address.slice(-4)
  }
}

// Logging utilities with privacy considerations
export class AuthLogger {
  static logAuthAttempt(walletAddress: string, success: boolean, error?: string): void {
    const sanitizedWallet = ValidationUtils.sanitizeWalletAddress(walletAddress)
    const timestamp = new Date().toISOString()
    
    if (success) {
      console.log(`✅ [${timestamp}] Auth successful for ${sanitizedWallet}`)
    } else {
      console.log(`❌ [${timestamp}] Auth failed for ${sanitizedWallet}: ${error}`)
    }
  }

  static logSignatureRequest(walletAddress: string): void {
    const sanitizedWallet = ValidationUtils.sanitizeWalletAddress(walletAddress)
    const timestamp = new Date().toISOString()
    
    console.log(`📝 [${timestamp}] Signature requested for ${sanitizedWallet}`)
  }

  static logSessionActivity(walletAddress: string, action: 'create' | 'retrieve' | 'clear'): void {
    const sanitizedWallet = ValidationUtils.sanitizeWalletAddress(walletAddress)
    const timestamp = new Date().toISOString()
    
    console.log(`💾 [${timestamp}] Session ${action} for ${sanitizedWallet}`)
  }
}