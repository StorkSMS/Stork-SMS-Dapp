/**
 * Local Domain Registry
 * 
 * Pre-populated registry of known important domains to eliminate API calls
 * for common addresses. Supports both .sol and .skr domains.
 */

export interface DomainRegistryEntry {
  address: string
  domain: string
  type: 'sol' | 'skr' | 'other'
  source: 'manual' | 'verified' | 'community'
  lastVerified?: string
  priority: 'high' | 'medium' | 'low'
}

export interface DomainRegistryStats {
  totalEntries: number
  solDomains: number
  skrDomains: number
  lastUpdated: string
  cacheHits: number
  cacheMisses: number
}

class DomainRegistry {
  private registry = new Map<string, DomainRegistryEntry>()
  private domainToAddress = new Map<string, string>()
  private stats: DomainRegistryStats
  private lastSyncTime = 0
  private readonly SYNC_INTERVAL = parseInt(process.env.LOCAL_REGISTRY_SYNC_INTERVAL_HOURS || '24') * 60 * 60 * 1000

  constructor() {
    this.stats = {
      totalEntries: 0,
      solDomains: 0,
      skrDomains: 0,
      lastUpdated: new Date().toISOString(),
      cacheHits: 0,
      cacheMisses: 0
    }

    this.initializeDefaultEntries()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🏛️ Domain Registry initialized with', this.registry.size, 'entries')
    }
  }

  /**
   * Initialize with known important domains
   */
  private initializeDefaultEntries(): void {
    const defaultEntries: DomainRegistryEntry[] = [
      // Popular .sol domains
      {
        address: 'toly.sol', // Anatoly Yakovenko (Solana co-founder)
        domain: 'toly.sol',
        type: 'sol',
        source: 'verified',
        priority: 'high'
      },
      {
        address: 'bonfida.sol',
        domain: 'bonfida.sol',
        type: 'sol',
        source: 'verified',
        priority: 'high'
      },
      {
        address: 'phantom.sol',
        domain: 'phantom.sol',
        type: 'sol',
        source: 'verified',
        priority: 'high'
      },
      {
        address: 'solana.sol',
        domain: 'solana.sol',
        type: 'sol',
        source: 'verified',
        priority: 'high'
      },
      
      // Common wallet addresses (examples - replace with actual known addresses)
      {
        address: '11111111111111111111111111111112',
        domain: 'system-program',
        type: 'other',
        source: 'verified',
        priority: 'medium'
      },
      
      // Note: .skr domains are now looked up directly on-chain
      // Only add specific known addresses here if needed for performance
      
      // Exchange addresses (examples)
      {
        address: 'EhpADApTmMm46LuCj3RXz7yMVqq9UgNJQRMQP4pcsaTF',
        domain: 'binance.sol',
        type: 'sol',
        source: 'community',
        priority: 'medium'
      },
      {
        address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        domain: 'coinbase.sol',
        type: 'sol',
        source: 'community', 
        priority: 'medium'
      }
    ]

    for (const entry of defaultEntries) {
      this.addEntry(entry)
    }
  }

  /**
   * Add a domain entry to the registry
   */
  addEntry(entry: DomainRegistryEntry): void {
    // Validate address format (basic check)
    if (!entry.address || entry.address.length < 32) {
      console.warn('Invalid address format:', entry.address)
      return
    }

    // Store in both directions for fast lookups
    this.registry.set(entry.address.toLowerCase(), entry)
    this.domainToAddress.set(entry.domain.toLowerCase(), entry.address.toLowerCase())

    // Update stats
    this.updateStats()
  }

  /**
   * Remove a domain entry
   */
  removeEntry(address: string): boolean {
    const entry = this.registry.get(address.toLowerCase())
    if (entry) {
      this.registry.delete(address.toLowerCase())
      this.domainToAddress.delete(entry.domain.toLowerCase())
      this.updateStats()
      return true
    }
    return false
  }

  /**
   * Get domain for an address (main lookup function)
   */
  getDomain(address: string): string | null {
    if (!address) return null

    const entry = this.registry.get(address.toLowerCase())
    if (entry) {
      this.stats.cacheHits++
      return entry.domain
    }

    this.stats.cacheMisses++
    return null
  }

  /**
   * Get address for a domain
   */
  getAddress(domain: string): string | null {
    if (!domain) return null

    const address = this.domainToAddress.get(domain.toLowerCase())
    return address || null
  }

  /**
   * Check if an address is in the registry
   */
  hasAddress(address: string): boolean {
    return this.registry.has(address.toLowerCase())
  }

  /**
   * Check if a domain is in the registry
   */
  hasDomain(domain: string): boolean {
    return this.domainToAddress.has(domain.toLowerCase())
  }

  /**
   * Get all entries for a specific type
   */
  getEntriesByType(type: 'sol' | 'skr' | 'other'): DomainRegistryEntry[] {
    return Array.from(this.registry.values()).filter(entry => entry.type === type)
  }

  /**
   * Get high priority domains (most important ones)
   */
  getHighPriorityDomains(): DomainRegistryEntry[] {
    return Array.from(this.registry.values()).filter(entry => entry.priority === 'high')
  }

  /**
   * Batch lookup for multiple addresses
   */
  batchGetDomains(addresses: string[]): Map<string, string | null> {
    const results = new Map<string, string | null>()
    
    for (const address of addresses) {
      const domain = this.getDomain(address)
      results.set(address, domain)
    }

    return results
  }

  /**
   * Update registry statistics
   */
  private updateStats(): void {
    const entries = Array.from(this.registry.values())
    
    this.stats = {
      ...this.stats,
      totalEntries: entries.length,
      solDomains: entries.filter(e => e.type === 'sol').length,
      skrDomains: entries.filter(e => e.type === 'skr').length,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get registry statistics
   */
  getStats(): DomainRegistryStats {
    return { ...this.stats }
  }

  /**
   * Export registry data for backup/sharing
   */
  exportRegistry(): DomainRegistryEntry[] {
    return Array.from(this.registry.values())
  }

  /**
   * Import registry data from backup
   */
  importRegistry(entries: DomainRegistryEntry[], merge = true): void {
    if (!merge) {
      this.registry.clear()
      this.domainToAddress.clear()
    }

    for (const entry of entries) {
      this.addEntry(entry)
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🏛️ Domain Registry: Imported ${entries.length} entries (merge: ${merge})`)
    }
  }

  /**
   * Load additional entries from a URL or API
   */
  async loadRemoteRegistry(url: string): Promise<number> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to load registry: ${response.status}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid registry format: expected array')
      }

      const validEntries = data.filter(entry => 
        entry.address && 
        entry.domain && 
        entry.type &&
        ['sol', 'skr', 'other'].includes(entry.type)
      )

      this.importRegistry(validEntries, true)

      if (process.env.NODE_ENV === 'development') {
        console.log(`🏛️ Domain Registry: Loaded ${validEntries.length} remote entries`)
      }

      return validEntries.length
    } catch (error) {
      console.error('Failed to load remote registry:', error)
      return 0
    }
  }

  /**
   * Check if registry needs syncing
   */
  needsSync(): boolean {
    return Date.now() - this.lastSyncTime > this.SYNC_INTERVAL
  }

  /**
   * Mark registry as synced
   */
  markSynced(): void {
    this.lastSyncTime = Date.now()
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.registry.clear()
    this.domainToAddress.clear()
    this.stats.cacheHits = 0
    this.stats.cacheMisses = 0
    this.updateStats()
  }

  /**
   * Search domains by partial match
   */
  searchDomains(query: string, limit = 10): DomainRegistryEntry[] {
    const lowerQuery = query.toLowerCase()
    const matches: DomainRegistryEntry[] = []

    for (const entry of this.registry.values()) {
      if (entry.domain.toLowerCase().includes(lowerQuery) || 
          entry.address.toLowerCase().includes(lowerQuery)) {
        matches.push(entry)
        if (matches.length >= limit) break
      }
    }

    // Sort by priority and relevance
    return matches.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      
      // Exact matches first
      const aExact = a.domain.toLowerCase() === lowerQuery
      const bExact = b.domain.toLowerCase() === lowerQuery
      if (aExact !== bExact) return aExact ? -1 : 1
      
      return a.domain.length - b.domain.length
    })
  }
}

// Create singleton instance
export const domainRegistry = new DomainRegistry()

// Convenience functions
export const getDomainFromRegistry = (address: string): string | null => 
  domainRegistry.getDomain(address)

export const getAddressFromRegistry = (domain: string): string | null =>
  domainRegistry.getAddress(domain)

export const batchGetDomainsFromRegistry = (addresses: string[]): Map<string, string | null> =>
  domainRegistry.batchGetDomains(addresses)

export const searchDomainsInRegistry = (query: string, limit?: number): DomainRegistryEntry[] =>
  domainRegistry.searchDomains(query, limit)