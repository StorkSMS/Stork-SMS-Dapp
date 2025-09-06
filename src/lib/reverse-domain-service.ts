/**
 * New Reverse Domain Service
 * 
 * Lightweight, efficient reverse domain resolver that eliminates "too many requests" errors
 * by using direct RPC calls, aggressive caching, and intelligent fallback strategies.
 */

import { rateLimitedRpcCall } from './solana-connection'
import { domainRegistry, getDomainFromRegistry } from './domain-registry'
import { domainCache, getCachedDomain, setCachedDomain } from './domain-cache'
import { PublicKey } from '@solana/web3.js'

export interface ReverseDomainResult {
  address: string
  domain: string | null
  source: 'registry' | 'cache' | 'api' | 'truncated'
  isLoading: boolean
  error?: string
}

export interface BatchReverseLookupResult {
  results: Map<string, ReverseDomainResult>
  summary: {
    total: number
    fromRegistry: number
    fromCache: number
    fromApi: number
    errors: number
    rateLimited: number
  }
}

export interface ReverseDomainServiceStats {
  totalRequests: number
  registryHits: number
  cacheHits: number
  apiCalls: number
  rateLimitErrors: number
  lastApiCall: string | null
  averageResponseTime: number
}

class ReverseDomainService {
  private stats: ReverseDomainServiceStats
  private pendingRequests = new Map<string, Promise<ReverseDomainResult>>()
  private readonly MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '10')
  private readonly ENABLE_NEW_RESOLVER = process.env.ENABLE_NEW_REVERSE_RESOLVER !== 'false' // Enabled by default

  // SNS Program IDs and constants
  private readonly SNS_PROGRAM_ID = 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX'
  private readonly SNS_REVERSE_LOOKUP_CLASS = new PublicKey('33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPSHoquXi2Z')
  
  constructor() {
    this.stats = {
      totalRequests: 0,
      registryHits: 0,
      cacheHits: 0,
      apiCalls: 0,
      rateLimitErrors: 0,
      lastApiCall: null,
      averageResponseTime: 0
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🆕 New Reverse Domain Service initialized:', {
        enabled: this.ENABLE_NEW_RESOLVER,
        maxBatchSize: this.MAX_BATCH_SIZE,
        registryEntries: domainRegistry.getStats().totalEntries
      })
    }
  }

  /**
   * Main reverse domain lookup function
   */
  async getDomain(address: string): Promise<ReverseDomainResult> {
    if (!this.ENABLE_NEW_RESOLVER) {
      return this.createTruncatedResult(address, 'New resolver disabled')
    }

    const startTime = Date.now()
    this.stats.totalRequests++

    try {
      // Validate address
      if (!address || address.trim().length === 0) {
        return this.createTruncatedResult(address, 'Empty address')
      }

      const cleanAddress = address.trim()

      // Check for duplicate pending request
      const pendingRequest = this.pendingRequests.get(cleanAddress)
      if (pendingRequest) {
        return await pendingRequest
      }

      // Create and cache the promise
      const resultPromise = this.performLookup(cleanAddress)
      this.pendingRequests.set(cleanAddress, resultPromise)

      try {
        const result = await resultPromise
        this.updateResponseTime(Date.now() - startTime)
        return result
      } finally {
        this.pendingRequests.delete(cleanAddress)
      }

    } catch (error) {
      console.error('Reverse domain lookup error:', error)
      this.updateResponseTime(Date.now() - startTime)
      return this.createTruncatedResult(address, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Perform the actual lookup with cascading fallbacks
   */
  private async performLookup(address: string): Promise<ReverseDomainResult> {
    // Step 1: Check local registry (instant)
    const registryDomain = getDomainFromRegistry(address)
    if (registryDomain) {
      this.stats.registryHits++
      return {
        address,
        domain: registryDomain,
        source: 'registry',
        isLoading: false
      }
    }

    // Step 2: Check cache (instant)
    const cachedDomain = await getCachedDomain(address)
    if (cachedDomain !== undefined) {
      this.stats.cacheHits++
      return {
        address,
        domain: cachedDomain,
        source: 'cache',
        isLoading: false
      }
    }

    // Step 3: Make API call (rate limited)
    try {
      const apiDomain = await this.performApiLookup(address)
      
      // Cache the result (whether success or null)
      await setCachedDomain(address, apiDomain, 'api')
      
      this.stats.apiCalls++
      this.stats.lastApiCall = new Date().toISOString()

      return {
        address,
        domain: apiDomain,
        source: 'api',
        isLoading: false
      }

    } catch (error) {
      if (this.isRateLimitError(error)) {
        this.stats.rateLimitErrors++
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`⚠️ Rate limited for address ${address.slice(0, 8)}...${address.slice(-4)}`)
        }

        // Return truncated result instead of failing
        return this.createTruncatedResult(address, 'Rate limited - showing truncated address')
      }

      throw error
    }
  }

  /**
   * Perform API lookup using direct RPC calls
   */
  private async performApiLookup(address: string): Promise<string | null> {
    try {
      // Validate address format
      let publicKey: PublicKey
      try {
        publicKey = new PublicKey(address)
      } catch {
        return null // Invalid address format
      }

      // Try .skr domain lookup first (simpler check)
      const skrDomain = await this.performSkrDomainLookup(publicKey)
      if (skrDomain) {
        return skrDomain
      }

      // Try SNS reverse lookup for .sol domains
      const snsDomain = await this.performSnsReverseLookup(publicKey)
      if (snsDomain) {
        return snsDomain
      }

      return null

    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw error // Re-throw rate limit errors
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`API lookup failed for ${address.slice(0, 8)}...${address.slice(-4)}:`, error)
      }

      return null
    }
  }

  /**
   * Single .skr domain lookup using controlled AllDomains API call
   * This checks if a wallet has any .skr domains using ONE rate-limited call
   */
  private async performSkrDomainLookup(publicKey: PublicKey): Promise<string | null> {
    try {
      // Use single rate-limited RPC call to check for .skr domains
      const requestData = {
        jsonrpc: '2.0',
        id: 'skr-domain-check',
        method: 'getProgramAccounts',
        params: [
          'AD7cPZHAGgX6LZz56SkvwgSm6gecGLJZNcxvw48y5fKm', // AllDomains program ID for .skr
          {
            filters: [
              {
                memcmp: {
                  offset: 32, // Owner field offset
                  bytes: publicKey.toBase58()
                }
              },
              {
                memcmp: {
                  offset: 0, // Check for .skr TLD identifier
                  bytes: '3' // .skr TLD identifier in AllDomains
                }
              }
            ],
            dataSlice: {
              offset: 96,
              length: 32 // Get domain name data
            }
          }
        ]
      }

      const response = await rateLimitedRpcCall(requestData, {
        priority: 'high', // .skr domain checks get priority
        requestId: `skr-domain-${publicKey.toBase58()}`
      })

      if (response.error) {
        console.log('SKR domain check failed:', response.error.message)
        return null
      }

      const accounts = response.result
      if (!accounts || accounts.length === 0) {
        return null // No .skr domains found
      }

      // Process the first valid .skr domain found
      for (const account of accounts) {
        try {
          const accountData = account.account.data
          if (!accountData) continue

          // Decode the domain name from AllDomains account data
          let buffer: Buffer
          if (typeof accountData === 'string') {
            buffer = Buffer.from(accountData, 'base64')
          } else {
            buffer = Buffer.from(accountData)
          }

          // Extract domain name (simplified decoding)
          const nameLength = buffer.readUInt32LE(0)
          if (nameLength > 0 && nameLength <= 63) {
            const domainName = buffer.slice(4, 4 + nameLength).toString('utf8')
            if (domainName && domainName.length > 0) {
              return `${domainName}.skr`
            }
          }
        } catch (decodeError) {
          continue // Try next account if this one fails
        }
      }

      return null

    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw error // Re-throw rate limit errors
      }
      
      console.log('SKR domain lookup error:', error)
      return null
    }
  }

  /**
   * Perform SNS reverse lookup using direct RPC calls
   */
  private async performSnsReverseLookup(publicKey: PublicKey): Promise<string | null> {
    try {
      // Get program accounts owned by the public key in SNS
      const requestData = {
        jsonrpc: '2.0',
        id: 'sns-reverse-lookup',
        method: 'getProgramAccounts',
        params: [
          this.SNS_PROGRAM_ID,
          {
            filters: [
              {
                memcmp: {
                  offset: 32, // Owner field offset in SNS account
                  bytes: publicKey.toBase58()
                }
              }
            ],
            dataSlice: {
              offset: 0,
              length: 96 // Enough to get the name data
            }
          }
        ]
      }

      const response = await rateLimitedRpcCall(requestData, {
        priority: 'normal',
        requestId: `sns-reverse-${publicKey.toBase58()}`,
      })

      if (response.error) {
        throw new Error(`SNS RPC error: ${response.error.message}`)
      }

      const accounts = response.result
      if (!accounts || accounts.length === 0) {
        return null
      }

      // Process the first valid account
      for (const account of accounts) {
        try {
          const accountData = account.account.data
          if (!accountData) continue

          // Decode the SNS account data to get the domain name
          // This is a simplified version - full implementation would
          // properly decode the SNS account structure
          const domain = await this.decodeSnsAccountData(accountData)
          if (domain && domain.endsWith('.sol')) {
            return domain
          }
        } catch (decodeError) {
          // Continue to next account if this one fails
          continue
        }
      }

      return null

    } catch (error) {
      if (this.isRateLimitError(error)) {
        throw error
      }
      
      // For other errors, return null (no domain found)
      return null
    }
  }

  /**
   * Decode SNS account data to extract domain name
   * This is a simplified implementation
   */
  private async decodeSnsAccountData(accountData: string | number[]): Promise<string | null> {
    try {
      // Convert base64 or array to buffer
      let buffer: Buffer
      if (typeof accountData === 'string') {
        buffer = Buffer.from(accountData, 'base64')
      } else {
        buffer = Buffer.from(accountData)
      }

      // SNS account structure (simplified):
      // - First 32 bytes: parent domain key
      // - Next 32 bytes: owner key
      // - Next 32 bytes: class key
      // - Following bytes: domain name data

      if (buffer.length < 96) {
        return null
      }

      // Extract name data starting from byte 96
      const nameData = buffer.slice(96)
      
      // Find null terminator
      let nameLength = nameData.indexOf(0)
      if (nameLength === -1) {
        nameLength = nameData.length
      }

      if (nameLength === 0) {
        return null
      }

      // Extract domain name
      const domainName = nameData.slice(0, nameLength).toString('utf8')
      
      // Validate domain format
      if (domainName.length > 0 && domainName.length <= 64) {
        return `${domainName}.sol`
      }

      return null

    } catch (error) {
      return null
    }
  }

  /**
   * Batch lookup for multiple addresses
   */
  async batchGetDomains(addresses: string[]): Promise<BatchReverseLookupResult> {
    if (!this.ENABLE_NEW_RESOLVER) {
      const results = new Map<string, ReverseDomainResult>()
      for (const address of addresses) {
        results.set(address, this.createTruncatedResult(address, 'New resolver disabled'))
      }
      
      return {
        results,
        summary: {
          total: addresses.length,
          fromRegistry: 0,
          fromCache: 0,
          fromApi: 0,
          errors: addresses.length,
          rateLimited: 0
        }
      }
    }

    const results = new Map<string, ReverseDomainResult>()
    const summary = {
      total: addresses.length,
      fromRegistry: 0,
      fromCache: 0,
      fromApi: 0,
      errors: 0,
      rateLimited: 0
    }

    // Process in batches to avoid overwhelming the system
    const batches = this.createBatches(addresses, this.MAX_BATCH_SIZE)

    for (const batch of batches) {
      // Process batch concurrently
      const batchPromises = batch.map(async (address) => {
        try {
          const result = await this.getDomain(address)
          results.set(address, result)

          // Update summary
          switch (result.source) {
            case 'registry': summary.fromRegistry++; break
            case 'cache': summary.fromCache++; break
            case 'api': summary.fromApi++; break
            case 'truncated': 
              if (result.error?.includes('Rate limited')) {
                summary.rateLimited++
              } else {
                summary.errors++
              }
              break
          }
        } catch (error) {
          const errorResult = this.createTruncatedResult(address, error instanceof Error ? error.message : 'Unknown error')
          results.set(address, errorResult)
          summary.errors++
        }
      })

      await Promise.all(batchPromises)

      // Small delay between batches to avoid overwhelming the API
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { results, summary }
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Create truncated address result
   */
  private createTruncatedResult(address: string, error?: string): ReverseDomainResult {
    return {
      address,
      domain: null,
      source: 'truncated',
      isLoading: false,
      error
    }
  }

  /**
   * Check if error is a rate limiting error
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false

    const errorStr = error.toString().toLowerCase()
    const errorMessage = error.message?.toLowerCase() || ''

    return errorStr.includes('429') ||
           errorStr.includes('rate limit') ||
           errorMessage.includes('rate limit') ||
           errorMessage.includes('too many requests') ||
           (error.status === 429)
  }

  /**
   * Update average response time
   */
  private updateResponseTime(responseTime: number): void {
    if (this.stats.totalRequests === 1) {
      this.stats.averageResponseTime = responseTime
    } else {
      // Moving average
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / this.stats.totalRequests
    }
  }

  /**
   * Get service statistics
   */
  getStats(): ReverseDomainServiceStats {
    return { ...this.stats }
  }

  /**
   * Clear all pending requests (emergency use)
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🆕 Cleared all pending reverse domain requests')
    }
  }

  /**
   * Check if new resolver is enabled
   */
  isEnabled(): boolean {
    return this.ENABLE_NEW_RESOLVER
  }

  /**
   * Warm up cache with common addresses
   */
  async warmupCache(addresses: string[]): Promise<void> {
    if (!this.ENABLE_NEW_RESOLVER) return

    const uncachedAddresses: string[] = []

    // Check which addresses are not cached
    for (const address of addresses) {
      const cached = await getCachedDomain(address)
      if (cached === undefined && !getDomainFromRegistry(address)) {
        uncachedAddresses.push(address)
      }
    }

    if (uncachedAddresses.length === 0) return

    if (process.env.NODE_ENV === 'development') {
      console.log(`🆕 Warming up cache for ${uncachedAddresses.length} addresses`)
    }

    // Batch lookup uncached addresses
    await this.batchGetDomains(uncachedAddresses)
  }

  /**
   * Get display name for an address (with truncation fallback)
   */
  async getDisplayName(address: string, maxLength = 8): Promise<string> {
    if (!address) return ''

    const result = await this.getDomain(address)
    
    if (result.domain) {
      return result.domain
    }

    // Return truncated address
    if (address.length <= maxLength * 2) {
      return address
    }

    return `${address.slice(0, maxLength)}...${address.slice(-maxLength)}`
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      registryHits: 0,
      cacheHits: 0,
      apiCalls: 0,
      rateLimitErrors: 0,
      lastApiCall: null,
      averageResponseTime: 0
    }
  }
}

// Create singleton instance
export const reverseDomainService = new ReverseDomainService()

// Convenience functions
export const getReverseDomain = (address: string): Promise<ReverseDomainResult> =>
  reverseDomainService.getDomain(address)

export const batchGetReverseDomains = (addresses: string[]): Promise<BatchReverseLookupResult> =>
  reverseDomainService.batchGetDomains(addresses)

export const getDisplayName = (address: string, maxLength?: number): Promise<string> =>
  reverseDomainService.getDisplayName(address, maxLength)

export const warmupReverseCache = (addresses: string[]): Promise<void> =>
  reverseDomainService.warmupCache(addresses)