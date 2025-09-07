import { getMainnetConnection, rateLimitedRpcCall } from './solana-connection'
import { resolveInput, reverseResolveAddress } from './domain-resolver'
import { getDomainFromRegistry } from './domain-registry'
import { skrDomainService } from './skr-domain-service'
import { PublicKey } from '@solana/web3.js'

// Genesis Token Collection Addresses
// Note: Seeker Genesis Token collection address not yet available (launches August 2025)
// For now, we'll consider .skr domain holders as eligible since .skr domains are exclusive to Seeker devices
const SEEKER_GENESIS_COLLECTION = 'TBD' // Will be available after August 2025 launch

export interface AirdropEligibilityResult {
  isEligible: boolean
  reason?: string
  address: string
  domain?: string
  error?: string
}

export interface WhitelistEntry {
  address: string
  reason: string
  addedDate: string
}

export interface WhitelistData {
  manualWallets: WhitelistEntry[]
  lastUpdated: string
  notes?: string
}

interface GenesisTokenCache {
  hasSeeker: boolean
  timestamp: number
}

class AirdropService {
  private connection = getMainnetConnection()
  private whitelistCache: WhitelistData | null = null
  private whitelistCacheTime = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  // Genesis Token caching
  private genesisTokenCache = new Map<string, GenesisTokenCache>()
  private readonly GENESIS_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (NFT ownership changes rarely)
  
  // Global rate limiter coordination (local rate limiting removed)

  /**
   * Load the manual whitelist from JSON file
   */
  private async loadWhitelist(): Promise<WhitelistData> {
    // Check cache first
    if (this.whitelistCache && Date.now() - this.whitelistCacheTime < this.CACHE_DURATION) {
      return this.whitelistCache
    }

    try {
      const response = await fetch('/airdrop-eligible-wallets.json')
      if (!response.ok) {
        throw new Error(`Failed to load whitelist: ${response.status}`)
      }
      
      const whitelist: WhitelistData = await response.json()
      
      // Validate the structure
      if (!whitelist.manualWallets || !Array.isArray(whitelist.manualWallets)) {
        throw new Error('Invalid whitelist format: manualWallets array not found')
      }

      // Cache the result
      this.whitelistCache = whitelist
      this.whitelistCacheTime = Date.now()
      
      return whitelist
    } catch (error) {
      console.error('Error loading airdrop whitelist:', error)
      
      // Return empty whitelist on error
      return {
        manualWallets: [],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * Check if wallet participated in the 7-Day Developer Updates promotional campaign
   */
  private async isPromotionalParticipant(address: string): Promise<{ isParticipant: boolean; reason?: string }> {
    try {
      console.log(`🎉 Checking promotional participation for wallet: ${address.slice(0, 8)}...${address.slice(-4)}`)
      
      // Make API call to check promotional participation
      const response = await fetch(`/api/check-promotional-participant?wallet=${encodeURIComponent(address)}`)
      
      if (!response.ok) {
        console.error('❌ API error checking promotional participation:', response.status)
        return { isParticipant: false }
      }

      const result = await response.json()

      if (result.isParticipant) {
        console.log('✅ Found promotional participant:', {
          firstChatAt: result.firstChatAt,
          chatCount: result.chatCount
        })
        
        return {
          isParticipant: true,
          reason: `7-Day Developer Updates Campaign Participant (${result.chatCount} chat${result.chatCount === 1 ? '' : 's'} created)`
        }
      }

      console.log('📝 Wallet did not participate in promotional campaign')
      return { isParticipant: false }
      
    } catch (error) {
      console.error('❌ Error checking promotional participation:', error)
      return { isParticipant: false }
    }
  }

  /**
   * Check if wallet address is in manual whitelist
   */
  private async isWhitelisted(address: string): Promise<{ isWhitelisted: boolean; reason?: string }> {
    try {
      const whitelist = await this.loadWhitelist()
      
      const entry = whitelist.manualWallets.find(
        wallet => wallet.address === address
      )
      
      if (entry) {
        return {
          isWhitelisted: true,
          reason: entry.reason
        }
      }
      
      return { isWhitelisted: false }
    } catch (error) {
      console.error('Error checking whitelist:', error)
      return { isWhitelisted: false }
    }
  }


  /**
   * Get cached Genesis Token results or fetch from cache
   */
  private getCachedGenesisTokens(address: string): GenesisTokenCache | null {
    const cached = this.genesisTokenCache.get(address)
    if (cached && Date.now() - cached.timestamp < this.GENESIS_CACHE_DURATION) {
      return cached
    }
    return null
  }

  /**
   * Cache Genesis Token results
   */
  private setCachedGenesisTokens(address: string, hasSeeker: boolean): void {
    this.genesisTokenCache.set(address, {
      hasSeeker,
      timestamp: Date.now()
    })
  }


  /**
   * Check if wallet owns Seeker Genesis Token using Global Rate Limiter
   * Note: Seeker uses Token Extensions (Token-2022), may need different API call
   */
  private async hasSeekerGenesisToken(address: string): Promise<boolean> {
    try {
      // For now, we'll use a similar approach as Saga
      // This may need to be updated once we have the actual Seeker collection address
      const requestData = {
        jsonrpc: '2.0',
        id: 'seeker-genesis-check',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          // Note: This is a placeholder - need actual Seeker collection info
          grouping: ['collection', SEEKER_GENESIS_COLLECTION],
          page: 1,
          limit: 1
        }
      }

      const data = await rateLimitedRpcCall(requestData, {
        priority: 'normal',
        requestId: `seeker-genesis-${address}`,
        endpoint: this.connection.rpcEndpoint
      })
      
      if (data.error) {
        // For now, if we get an error (likely because SEEKER_GENESIS_COLLECTION is placeholder),
        // we'll just return false rather than throwing
        console.log('Seeker Genesis Token check failed (may be placeholder collection):', data.error.message)
        return false
      }

      return data.result && data.result.items && data.result.items.length > 0
    } catch (error) {
      console.error('Error checking Seeker Genesis Token:', error)
      
      // For rate limiting errors, throw to show user-friendly message
      if (error instanceof Error && error.message.includes('Rate limited')) {
        throw error
      }
      
      // For other errors, return false to continue with other checks
      return false
    }
  }

  /**
   * Validate if input is a valid Solana wallet address
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
   * Main function to check airdrop eligibility
   */
  async checkEligibility(input: string): Promise<AirdropEligibilityResult> {
    if (!input || input.trim().length === 0) {
      return {
        isEligible: false,
        address: '',
        error: 'Please enter a wallet address or domain'
      }
    }

    const trimmed = input.trim()

    try {
      // First, resolve the input (handles both domains and wallet addresses)
      const resolution = await resolveInput(trimmed)
      
      if (!resolution.isValid) {
        return {
          isEligible: false,
          address: trimmed,
          domain: resolution.domain,
          error: resolution.error || 'Invalid address or domain'
        }
      }

      const walletAddress = resolution.address
      const domain = resolution.domain

      // Validate the resolved address
      if (!this.isValidWalletAddress(walletAddress)) {
        return {
          isEligible: false,
          address: walletAddress,
          domain,
          error: 'Invalid wallet address format'
        }
      }

      // Check for .skr domain first - these are eligible by default since .skr domains are exclusive to Seeker devices
      const isSkrDomain = domain && domain.endsWith('.skr')
      
      if (isSkrDomain) {
        return {
          isEligible: true,
          address: walletAddress,
          domain,
          reason: 'Seeker device owner (.skr domain holder)'
        }
      }

      // ALWAYS check if this wallet has a .skr domain using our dedicated service
      try {
        const skrResult = await skrDomainService.hasSkrDomain(walletAddress)
        
        if (skrResult.source === 'error' && skrResult.error) {
          console.warn(`SkrDomainService error for ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}: ${skrResult.error}`)
          
          // If the service is disabled, try fallback to old method
          if (skrResult.error.includes('disabled')) {
            try {
              const reverseDomainInfo = await reverseResolveAddress(walletAddress)
              if (reverseDomainInfo.domain && reverseDomainInfo.domain.endsWith('.skr')) {
                return {
                  isEligible: true,
                  address: walletAddress,
                  domain: reverseDomainInfo.domain,
                  reason: 'Seeker device owner (.skr domain holder)'
                }
              }
            } catch (fallbackError) {
              console.log('Fallback reverse domain lookup also failed:', fallbackError)
            }
          }
        } else if (skrResult.hasSkr) {
          return {
            isEligible: true,
            address: walletAddress,
            domain: skrResult.domain || domain,
            reason: 'Seeker device owner (.skr domain holder)'
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 SkrDomainService result for ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}:`, skrResult)
        }
      } catch (error) {
        console.error('SkrDomainService lookup failed with exception, continuing with other checks:', error)
        
        // Fallback: try the old reverse domain lookup method
        try {
          const reverseDomainInfo = await reverseResolveAddress(walletAddress)
          if (reverseDomainInfo.domain && reverseDomainInfo.domain.endsWith('.skr')) {
            return {
              isEligible: true,
              address: walletAddress,
              domain: reverseDomainInfo.domain,
              reason: 'Seeker device owner (.skr domain holder)'
            }
          }
        } catch (fallbackError) {
          console.log('Fallback reverse domain lookup also failed:', fallbackError)
        }
      }

      // Check cache first for Genesis Tokens to avoid API calls
      const cached = this.getCachedGenesisTokens(walletAddress)
      let hasSeeker: boolean
      
      if (cached) {
        // Use cached results
        hasSeeker = cached.hasSeeker
      } else {
        // Make API calls with proper error handling for rate limits
        try {
          // Check whitelist first (no API call needed)
          const whitelistCheck = await this.isWhitelisted(walletAddress)
          
          if (whitelistCheck.isWhitelisted) {
            // Skip Genesis Token checks if already whitelisted
            hasSeeker = false
            
            // Cache the negative results to avoid future API calls
            this.setCachedGenesisTokens(walletAddress, false)
            
            return {
              isEligible: true,
              address: walletAddress,
              domain,
              reason: `Successful report-a-bug and request-a-feature wallet: ${whitelistCheck.reason}`
            }
          }
          
          // Check promotional participation (no API call needed, database query)
          const promotionalCheck = await this.isPromotionalParticipant(walletAddress)
          if (promotionalCheck.isParticipant) {
            // Skip Genesis Token checks if already eligible through promotional campaign
            hasSeeker = false
            
            // Cache the negative results to avoid future API calls
            this.setCachedGenesisTokens(walletAddress, false)
            
            return {
              isEligible: true,
              address: walletAddress,
              domain,
              reason: promotionalCheck.reason
            }
          }
          
          // Check Genesis Tokens sequentially to avoid hitting rate limits
          hasSeeker = await this.hasSeekerGenesisToken(walletAddress)
          
          // Cache the results
          this.setCachedGenesisTokens(walletAddress, hasSeeker)
          
        } catch (error) {
          // If rate limited, check for cached results or show error
          const fallbackCached = this.getCachedGenesisTokens(walletAddress)
          if (fallbackCached) {
            hasSeeker = fallbackCached.hasSeeker
          } else {
            // No cache available and rate limited - return error
            return {
              isEligible: false,
              address: walletAddress,
              domain,
              error: error instanceof Error ? error.message : 'Failed to check eligibility'
            }
          }
        }
      }
      
      // Determine eligibility and reason
      if (hasSeeker) {
        return {
          isEligible: true,
          address: walletAddress,
          domain,
          reason: 'Seeker Genesis Token holder'
        }
      }

      // Check whitelist if we haven't already (only needed if using cached Genesis Token results)
      if (cached) {
        const whitelistCheck = await this.isWhitelisted(walletAddress)
        if (whitelistCheck.isWhitelisted) {
          return {
            isEligible: true,
            address: walletAddress,
            domain,
            reason: `Successful report-a-bug and request-a-feature wallet: ${whitelistCheck.reason}`
          }
        }
      }

      // Check promotional campaign participation
      const promotionalCheck = await this.isPromotionalParticipant(walletAddress)
      if (promotionalCheck.isParticipant) {
        return {
          isEligible: true,
          address: walletAddress,
          domain,
          reason: promotionalCheck.reason
        }
      }

      // Not eligible
      return {
        isEligible: false,
        address: walletAddress,
        domain,
        reason: 'Not eligible for airdrop'
      }

    } catch (error) {
      console.error('Error checking airdrop eligibility:', error)
      
      return {
        isEligible: false,
        address: trimmed,
        error: error instanceof Error ? error.message : 'Failed to check eligibility'
      }
    }
  }

  /**
   * Get total number of eligible wallets (for admin/stats purposes)
   */
  async getTotalEligibleWallets(): Promise<number> {
    try {
      const whitelist = await this.loadWhitelist()
      
      // For now, only count manual whitelist entries
      // In the future, could add API calls to count Genesis Token holders
      return whitelist.manualWallets.length
    } catch (error) {
      console.error('Error getting total eligible wallets:', error)
      return 0
    }
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.whitelistCache = null
    this.whitelistCacheTime = 0
    this.genesisTokenCache.clear()
    
    // Also clear the SKR domain service cache
    skrDomainService.clearCache()
  }
}

// Create singleton instance
export const airdropService = new AirdropService()

// Export convenience function
export const checkAirdropEligibility = (input: string) => airdropService.checkEligibility(input)