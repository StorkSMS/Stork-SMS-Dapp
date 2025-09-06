/**
 * Dedicated .skr Domain Service
 * 
 * Efficiently checks .skr domain ownership using TldParser with aggressive caching
 * to avoid 429 rate limit errors while supporting thousands of .skr domain holders.
 */

import { TldParser } from '@onsol/tldparser'
import { getMainnetConnection } from './solana-connection'
import { PublicKey } from '@solana/web3.js'

export interface SkrDomainResult {
  hasSkr: boolean
  domain?: string
  source: 'cache' | 'api' | 'error'
  error?: string
}

export interface SkrDomainCacheEntry {
  hasSkr: boolean
  domain?: string
  timestamp: number
  source: 'api'
}

export interface SkrDomainServiceStats {
  totalChecks: number
  cacheHits: number
  apiCalls: number
  errors: number
  lastApiCall?: string
}

class SkrDomainService {
  private cache = new Map<string, SkrDomainCacheEntry>()
  private tldParser: TldParser
  private readonly CACHE_TTL = parseInt(process.env.SKR_DOMAIN_CACHE_TTL_HOURS || '24') * 60 * 60 * 1000
  private readonly ENABLED = process.env.ENABLE_SKR_DOMAIN_CHECK !== 'false' // Enabled by default
  private stats: SkrDomainServiceStats

  private pendingRequests = new Map<string, Promise<SkrDomainResult>>()

  constructor() {
    this.tldParser = new TldParser(getMainnetConnection())
    this.stats = {
      totalChecks: 0,
      cacheHits: 0,
      apiCalls: 0,
      errors: 0
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🟢 SkrDomainService initialized:', {
        enabled: this.ENABLED,
        cacheTtlHours: this.CACHE_TTL / (60 * 60 * 1000)
      })
    }
  }

  /**
   * Main method to check if a wallet address has .skr domain
   */
  async hasSkrDomain(walletAddress: string): Promise<SkrDomainResult> {
    if (!this.ENABLED) {
      return {
        hasSkr: false,
        source: 'error',
        error: '.skr domain checking disabled'
      }
    }

    this.stats.totalChecks++

    if (!walletAddress || walletAddress.trim().length === 0) {
      return {
        hasSkr: false,
        source: 'error',
        error: 'Invalid wallet address'
      }
    }

    const cleanAddress = walletAddress.trim()

    // Check cache first
    const cached = this.cache.get(cleanAddress)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.stats.cacheHits++
      return {
        hasSkr: cached.hasSkr,
        domain: cached.domain,
        source: 'cache'
      }
    }

    // Check for duplicate pending request
    const pendingRequest = this.pendingRequests.get(cleanAddress)
    if (pendingRequest) {
      return await pendingRequest
    }

    // Create and cache the promise
    const resultPromise = this.performSkrCheck(cleanAddress)
    this.pendingRequests.set(cleanAddress, resultPromise)

    try {
      const result = await resultPromise
      return result
    } finally {
      this.pendingRequests.delete(cleanAddress)
    }
  }

  /**
   * Perform the actual .skr domain check using TldParser
   */
  private async performSkrCheck(walletAddress: string): Promise<SkrDomainResult> {
    try {
      // Validate wallet address format
      let publicKey: PublicKey
      try {
        publicKey = new PublicKey(walletAddress)
      } catch {
        return {
          hasSkr: false,
          source: 'error',
          error: 'Invalid wallet address format'
        }
      }

      this.stats.apiCalls++
      this.stats.lastApiCall = new Date().toISOString()

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 SkrDomainService: Checking ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)} for .skr domains`)
      }

      // Use TldParser to get domains for this owner, filtered by .skr TLD
      // Using getParsedAllUserDomainsFromTld to get actual domain names (not just PublicKeys)
      const domains = await this.tldParser.getParsedAllUserDomainsFromTld(publicKey, 'skr')

      // Debug logging to understand the return format
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 SkrDomainService: Raw TldParser response for ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}:`, {
          domains,
          domainsLength: domains?.length || 0,
          firstDomain: domains?.[0] ? {
            keys: Object.keys(domains[0]),
            values: domains[0]
          } : null
        })
      }

      const hasSkr = domains && domains.length > 0
      
      // Handle different possible return formats from TldParser
      let domain: string | undefined = undefined
      if (hasSkr && domains[0]) {
        const firstDomain = domains[0] as any
        // Try different property names that might contain the domain name
        domain = firstDomain.domain || 
                 firstDomain.name || 
                 firstDomain.domainName || 
                 (typeof firstDomain === 'string' ? firstDomain : undefined)
      }

      // Cache the result
      const cacheEntry: SkrDomainCacheEntry = {
        hasSkr,
        domain,
        timestamp: Date.now(),
        source: 'api'
      }
      this.cache.set(walletAddress, cacheEntry)

      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 SkrDomainService: Final result for ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}:`, {
          hasSkr,
          domain,
          domainsFound: domains?.length || 0,
          source: 'api'
        })
      }

      return {
        hasSkr,
        domain,
        source: 'api'
      }

    } catch (error) {
      this.stats.errors++
      
      console.error('SkrDomainService: Error checking .skr domains:', error)

      // Don't cache errors, allow retries
      return {
        hasSkr: false,
        source: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Batch check multiple wallet addresses
   */
  async batchCheckSkrDomains(walletAddresses: string[]): Promise<Map<string, SkrDomainResult>> {
    const results = new Map<string, SkrDomainResult>()

    // Process in parallel but with some batching to avoid overwhelming
    const BATCH_SIZE = 5
    const batches: string[][] = []
    
    for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
      batches.push(walletAddresses.slice(i, i + BATCH_SIZE))
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (address) => {
        const result = await this.hasSkrDomain(address)
        results.set(address, result)
      })

      await Promise.all(batchPromises)

      // Small delay between batches to be nice to the API
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * Get service statistics
   */
  getStats(): SkrDomainServiceStats {
    return { ...this.stats }
  }

  /**
   * Clear cache (for testing/admin purposes)
   */
  clearCache(): void {
    this.cache.clear()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 SkrDomainService: Cache cleared')
    }
  }

  /**
   * Clear cache for specific address (for testing)
   */
  clearAddressCache(walletAddress: string): void {
    const removed = this.cache.delete(walletAddress.trim())
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 SkrDomainService: Cache cleared for ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)} - ${removed ? 'found and removed' : 'not found'}`)
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Preload common addresses (for performance)
   */
  async preloadAddresses(addresses: string[]): Promise<void> {
    if (!this.ENABLED) return

    const uncachedAddresses = addresses.filter(address => {
      const cached = this.cache.get(address)
      return !cached || Date.now() - cached.timestamp >= this.CACHE_TTL
    })

    if (uncachedAddresses.length === 0) return

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 SkrDomainService: Preloading ${uncachedAddresses.length} addresses`)
    }

    await this.batchCheckSkrDomains(uncachedAddresses)
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.ENABLED
  }

  /**
   * Get cached result without making API call
   */
  getCachedResult(walletAddress: string): SkrDomainResult | null {
    const cached = this.cache.get(walletAddress.trim())
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        hasSkr: cached.hasSkr,
        domain: cached.domain,
        source: 'cache'
      }
    }
    return null
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [address, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        toDelete.push(address)
      }
    }

    for (const address of toDelete) {
      this.cache.delete(address)
    }

    if (process.env.NODE_ENV === 'development' && toDelete.length > 0) {
      console.log(`🧹 SkrDomainService: Cleaned up ${toDelete.length} expired cache entries`)
    }
  }

  /**
   * Start periodic cache cleanup
   */
  startPeriodicCleanup(): void {
    // Clean up every hour
    setInterval(() => {
      this.cleanupExpiredEntries()
    }, 60 * 60 * 1000)
  }
}

// Create singleton instance
export const skrDomainService = new SkrDomainService()

// Start periodic cleanup
if (typeof window !== 'undefined') {
  skrDomainService.startPeriodicCleanup()
}

// Convenience functions
export const checkSkrDomain = (walletAddress: string): Promise<SkrDomainResult> =>
  skrDomainService.hasSkrDomain(walletAddress)

export const batchCheckSkrDomains = (walletAddresses: string[]): Promise<Map<string, SkrDomainResult>> =>
  skrDomainService.batchCheckSkrDomains(walletAddresses)

export const getCachedSkrResult = (walletAddress: string): SkrDomainResult | null =>
  skrDomainService.getCachedResult(walletAddress)

export const clearSkrAddressCache = (walletAddress: string): void =>
  skrDomainService.clearAddressCache(walletAddress)