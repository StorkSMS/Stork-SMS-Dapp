import { Connection, PublicKey } from '@solana/web3.js'
import { resolve, getDomainKey, NameRegistryState } from '@bonfida/spl-name-service'
import { TldParser } from '@onsol/tldparser'
import { getMainnetConnection } from './solana-connection'

export interface DomainResolutionResult {
  address: string
  domain?: string
  isValid: boolean
  error?: string
  type: 'wallet' | 'domain'
}

export interface DomainValidation {
  isDomain: boolean
  isValidFormat: boolean
  domainType?: 'sol' | 'skr' | 'unknown'
}

export interface DomainInfo {
  domain: string | null
  type: 'sol' | 'skr' | null
}

export interface ReverseDomainResult {
  displayName: string
  actualAddress: string
  isDomain: boolean
  domainInfo: DomainInfo | null
  isLoading: boolean
}

class DomainResolver {
  private connection: Connection
  private cache = new Map<string, { result: DomainResolutionResult; timestamp: number }>()
  private reverseCache = new Map<string, { result: DomainInfo; timestamp: number }>()
  private readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour - longer cache due to rate limits
  private tldParser: TldParser
  
  // Rate limiting
  private requestQueue: string[] = []
  private isProcessing = false
  private readonly MAX_REQUESTS_PER_SECOND = 2
  private readonly REQUEST_DELAY = 1000 / this.MAX_REQUESTS_PER_SECOND // 500ms between requests
  private lastRequestTime = 0
  
  // Circuit breaker for rate limit failures
  private rateLimitFailures = 0
  private readonly MAX_RATE_LIMIT_FAILURES = 5
  private circuitBreakerResetTime = 0
  private readonly CIRCUIT_BREAKER_DURATION = 30 * 1000 // 30 seconds

  constructor() {
    // Use centralized connection factory for consistent RPC configuration
    this.connection = getMainnetConnection()
    this.tldParser = new TldParser(this.connection)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 DomainResolver: Initialized with centralized connection:', {
        rpcEndpoint: this.connection.rpcEndpoint,
        commitment: this.connection.commitment
      })
    }
  }

  /**
   * Validates if input looks like a domain and what type
   */
  validateDomainFormat(input: string): DomainValidation {
    const trimmed = input.trim().toLowerCase()
    
    // Check if it's a domain format
    const isDomain = /^[a-z0-9][a-z0-9-]*[a-z0-9]*\.(sol|skr)$/i.test(trimmed)
    
    if (!isDomain) {
      return {
        isDomain: false,
        isValidFormat: this.isValidWalletAddress(input)
      }
    }

    // Determine domain type
    let domainType: 'sol' | 'skr' | 'unknown' = 'unknown'
    if (trimmed.endsWith('.sol')) {
      domainType = 'sol'
    } else if (trimmed.endsWith('.skr')) {
      domainType = 'skr'
    }

    return {
      isDomain: true,
      isValidFormat: true,
      domainType
    }
  }

  /**
   * Validates if input is a valid Solana wallet address
   */
  private isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  /**
   * Resolves .sol domain using SNS (Solana Name Service)
   */
  private async resolveSolDomain(domain: string): Promise<DomainResolutionResult> {
    try {
      // Remove .sol suffix for the resolution
      const domainName = domain.replace('.sol', '')
      
      // Use the recommended resolve function from SNS SDK
      const resolvedAddress = await resolve(this.connection, domainName)
      
      if (!resolvedAddress) {
        return {
          address: '',
          domain,
          isValid: false,
          error: 'Domain not found or not registered',
          type: 'domain'
        }
      }

      return {
        address: resolvedAddress.toBase58(),
        domain,
        isValid: true,
        type: 'domain'
      }
    } catch (error) {
      console.error(`Error resolving .sol domain ${domain}:`, error)
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to resolve domain'
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          errorMessage = 'Domain not registered or does not exist'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please try again'
        } else {
          errorMessage = error.message
        }
      }

      return {
        address: '',
        domain,
        isValid: false,
        error: errorMessage,
        type: 'domain'
      }
    }
  }

  /**
   * .skr domain resolution using AllDomains TLD Parser
   * AllDomains SDK supports any TLD including newly supported .skr domains
   */
  private async resolveSkrDomain(domain: string): Promise<DomainResolutionResult> {
    try {
      // AllDomains TldParser works with full domain names including TLD
      const ownerResult = await this.tldParser.getOwnerFromDomainTld(domain)
      
      if (!ownerResult) {
        return {
          address: '',
          domain,
          isValid: false,
          error: 'Domain not found or not registered',
          type: 'domain'
        }
      }

      // Handle both string and PublicKey return types
      const address = typeof ownerResult === 'string' 
        ? ownerResult 
        : ownerResult.toBase58()

      return {
        address,
        domain,
        isValid: true,
        type: 'domain'
      }
    } catch (error) {
      console.error(`Error resolving .skr domain ${domain}:`, error)
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to resolve .skr domain'
      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('Account does not exist')) {
          errorMessage = 'Domain not registered or does not exist'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error - please try again'
        } else {
          errorMessage = error.message
        }
      }

      return {
        address: '',
        domain,
        isValid: false,
        error: errorMessage,
        type: 'domain'
      }
    }
  }

  /**
   * Main resolution function that handles both domains and wallet addresses
   */
  async resolveInput(input: string): Promise<DomainResolutionResult> {
    if (!input || input.trim().length === 0) {
      return {
        address: '',
        isValid: false,
        error: 'Input is required',
        type: 'wallet'
      }
    }

    const trimmed = input.trim()

    // Check cache first
    const cached = this.cache.get(trimmed)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result
    }

    // Validate input format
    const validation = this.validateDomainFormat(trimmed)

    if (!validation.isDomain) {
      // Treat as wallet address
      const isValidWallet = this.isValidWalletAddress(trimmed)
      const result: DomainResolutionResult = {
        address: isValidWallet ? trimmed : '',
        isValid: isValidWallet,
        error: isValidWallet ? undefined : 'Invalid wallet address format',
        type: 'wallet'
      }
      
      // Cache the result
      this.cache.set(trimmed, { result, timestamp: Date.now() })
      return result
    }

    // Handle domain resolution based on type
    let result: DomainResolutionResult

    switch (validation.domainType) {
      case 'sol':
        result = await this.resolveSolDomain(trimmed)
        break
      case 'skr':
        result = await this.resolveSkrDomain(trimmed)
        break
      default:
        result = {
          address: '',
          domain: trimmed,
          isValid: false,
          error: 'Unsupported domain type',
          type: 'domain'
        }
    }

    // Cache the result
    this.cache.set(trimmed, { result, timestamp: Date.now() })
    return result
  }

  /**
   * Check if input is a domain format (for UI feedback)
   */
  isDomainFormat(input: string): boolean {
    return this.validateDomainFormat(input).isDomain
  }

  /**
   * Check if circuit breaker is open (too many rate limit failures)
   */
  private isCircuitBreakerOpen(): boolean {
    if (this.rateLimitFailures >= this.MAX_RATE_LIMIT_FAILURES) {
      if (Date.now() < this.circuitBreakerResetTime) {
        return true // Circuit breaker still open
      } else {
        // Reset circuit breaker
        this.rateLimitFailures = 0
        this.circuitBreakerResetTime = 0
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 DomainResolver: Circuit breaker reset')
        }
      }
    }
    return false
  }
  
  /**
   * Rate limited API call wrapper
   */
  private async makeRateLimitedCall<T>(operation: () => Promise<T>): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Domain resolution temporarily disabled due to rate limits')
    }
    
    // Enforce rate limiting
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      const delayNeeded = this.REQUEST_DELAY - timeSinceLastRequest
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ DomainResolver: Rate limiting - waiting ${delayNeeded}ms`)
      }
      await new Promise(resolve => setTimeout(resolve, delayNeeded))
    }
    
    this.lastRequestTime = Date.now()
    
    try {
      const result = await operation()
      // Reset rate limit failure counter on success
      this.rateLimitFailures = 0
      return result
    } catch (error) {
      // Check if this is a rate limit error
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
        this.rateLimitFailures++
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 DomainResolver: Rate limit failure ${this.rateLimitFailures}/${this.MAX_RATE_LIMIT_FAILURES}`)
        }
        
        if (this.rateLimitFailures >= this.MAX_RATE_LIMIT_FAILURES) {
          this.circuitBreakerResetTime = Date.now() + this.CIRCUIT_BREAKER_DURATION
          if (process.env.NODE_ENV === 'development') {
            console.log(`⛔ DomainResolver: Circuit breaker activated for ${this.CIRCUIT_BREAKER_DURATION / 1000}s`)
          }
        }
      }
      throw error
    }
  }

  /**
   * Reverse resolve: get domain name from wallet address
   * Uses AllDomains SDK to find all domains owned by an address
   * Priority: .skr domains > .sol domains > null
   */
  async reverseResolveAddress(address: string): Promise<DomainInfo> {
    if (!address || address.trim().length === 0) {
      return { domain: null, type: null }
    }

    const trimmed = address.trim()

    // Check cache first
    const cached = this.reverseCache.get(trimmed)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result
    }

    try {
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 DomainResolver: Starting reverse resolution for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
      }

      // Validate address format
      const ownerPublicKey = new PublicKey(trimmed)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ DomainResolver: Valid PublicKey created for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
      }
      
      // Check AllDomains SDK setup first
      if (process.env.NODE_ENV === 'development') {
        console.log(`📞 DomainResolver: About to call AllDomains SDK for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
        console.log(`📞 DomainResolver: SDK setup check:`, {
          hasTldParser: !!this.tldParser,
          hasConnection: !!this.connection,
          rpcEndpoint: this.connection?.rpcEndpoint,
          publicKeyValid: !!ownerPublicKey
        })
      }
      
      let allDomains
      try {
        // Test if the method exists before calling it
        if (!this.tldParser || typeof this.tldParser.getParsedAllUserDomains !== 'function') {
          throw new Error('AllDomains TldParser not properly initialized or method not available')
        }
        
        // Use rate limited call to prevent API abuse
        allDomains = await this.makeRateLimitedCall(async () => {
          return await this.tldParser.getParsedAllUserDomains(ownerPublicKey)
        })
      } catch (sdkError) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ DomainResolver: AllDomains SDK call failed for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
          console.log(`❌ DomainResolver: SDK Error type:`, sdkError instanceof Error ? sdkError.constructor.name : typeof sdkError)
          if (sdkError instanceof Error) {
            console.log(`❌ DomainResolver: SDK Error message:`, sdkError.message)
          }
        }
        throw sdkError // Re-throw to be caught by outer try-catch
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📦 DomainResolver: AllDomains SDK response:`, {
          address: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`,
          domainsFound: allDomains ? allDomains.length : 0,
          domains: allDomains?.map(d => d.domain) || []
        })
      }
      
      if (!allDomains || allDomains.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ DomainResolver: No domains found for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
        }
        const result: DomainInfo = { domain: null, type: null }
        this.reverseCache.set(trimmed, { result, timestamp: Date.now() })
        return result
      }

      // Filter and prioritize domains: .skr > .sol > others
      const skrDomains = allDomains.filter(d => d.domain && d.domain.endsWith('.skr'))
      const solDomains = allDomains.filter(d => d.domain && d.domain.endsWith('.sol'))
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 DomainResolver: Domain filtering results:`, {
          address: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`,
          totalDomains: allDomains.length,
          skrDomains: skrDomains.map(d => d.domain),
          solDomains: solDomains.map(d => d.domain)
        })
      }
      
      let selectedDomain: string | null = null
      let selectedType: 'sol' | 'skr' | null = null
      
      if (skrDomains.length > 0) {
        selectedDomain = skrDomains[0].domain
        selectedType = 'skr'
      } else if (solDomains.length > 0) {
        selectedDomain = solDomains[0].domain
        selectedType = 'sol'
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 DomainResolver: Selected domain:`, {
          address: `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`,
          selectedDomain,
          selectedType
        })
      }

      const result: DomainInfo = {
        domain: selectedDomain,
        type: selectedType
      }

      // Cache the result
      this.reverseCache.set(trimmed, { result, timestamp: Date.now() })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ DomainResolver: Resolution completed and cached for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`, result)
      }
      
      return result

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // Safe error logging to avoid recursive errors
        try {
          console.log(`❌ DomainResolver: Error reverse resolving ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
          console.log(`❌ DomainResolver: Basic error info:`, {
            hasError: !!error,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            errorMessage: error instanceof Error ? error.message : 'Non-error object'
          })
          
          // Try to safely log connection details
          console.log(`❌ DomainResolver: Context:`, {
            rpcEndpoint: this.connection?.rpcEndpoint || 'undefined',
            tldParserExists: !!this.tldParser,
            addressLength: trimmed?.length || 0
          })
        } catch (logError) {
          console.log(`❌ DomainResolver: Error logging failed, basic fallback for ${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`)
        }
      }
      
      // Return null result for invalid addresses or API errors
      const result: DomainInfo = { domain: null, type: null }
      this.reverseCache.set(trimmed, { result, timestamp: Date.now() })
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 DomainResolver: Returning null result (will show truncated address)`)
      }
      
      return result
    }
  }

  /**
   * Batch reverse resolve multiple addresses for efficiency
   * Used by sidebar that shows many addresses at once
   */
  async batchReverseResolve(addresses: string[]): Promise<Map<string, DomainInfo>> {
    const results = new Map<string, DomainInfo>()
    
    // Process addresses in parallel for better performance
    const promises = addresses.map(async (address) => {
      const result = await this.reverseResolveAddress(address)
      return { address, result }
    })

    const resolvedResults = await Promise.all(promises)
    
    resolvedResults.forEach(({ address, result }) => {
      results.set(address, result)
    })

    return results
  }

  /**
   * Get display name for an address (domain or truncated address)
   */
  getDisplayName(address: string, domainInfo: DomainInfo | null): string {
    if (domainInfo?.domain) {
      return domainInfo.domain
    }
    
    // Fallback to truncated address
    if (address.length > 12) {
      return `${address.slice(0, 8)}...${address.slice(-4)}`
    }
    
    return address
  }

  /**
   * Clear both forward and reverse resolution caches
   */
  clearCache(): void {
    this.cache.clear()
    this.reverseCache.clear()
  }

  /**
   * Get total cache size for debugging
   */
  getCacheSize(): number {
    return this.cache.size + this.reverseCache.size
  }

  /**
   * Get supported domain types
   */
  getSupportedDomainTypes(): string[] {
    return ['sol', 'skr'] // Now supporting .skr domains via AllDomains SDK
  }
}

// Create a singleton instance
export const domainResolver = new DomainResolver()

// Export utility functions for convenience
export const resolveInput = (input: string) => domainResolver.resolveInput(input)
export const isDomainFormat = (input: string) => domainResolver.isDomainFormat(input)
export const validateDomainFormat = (input: string) => domainResolver.validateDomainFormat(input)
export const reverseResolveAddress = (address: string) => domainResolver.reverseResolveAddress(address)
export const batchReverseResolve = (addresses: string[]) => domainResolver.batchReverseResolve(addresses)
export const getDisplayName = (address: string, domainInfo: DomainInfo | null) => domainResolver.getDisplayName(address, domainInfo)