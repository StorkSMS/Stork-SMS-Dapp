/**
 * Domain Cache Service
 * 
 * Persistent caching layer for domain resolutions with IndexedDB storage
 * and configurable TTL. Supports both forward and reverse lookups.
 */

export interface CacheEntry {
  key: string
  value: string | null
  timestamp: number
  ttl: number
  type: 'forward' | 'reverse'
  source: 'api' | 'registry' | 'manual'
}

export interface CacheStats {
  totalEntries: number
  forwardEntries: number
  reverseEntries: number
  hitRate: number
  totalHits: number
  totalMisses: number
  cacheSize: number
  lastCleanup: string
}

export interface CacheConfig {
  reverseTtlDays: number
  forwardTtlDays: number
  maxEntries: number
  cleanupIntervalMs: number
  dbName: string
  dbVersion: number
}

class DomainCache {
  private memoryCache = new Map<string, CacheEntry>()
  private db: IDBDatabase | null = null
  private dbInitialized = false
  private stats: CacheStats
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private readonly DB_STORE_NAME = 'domainCache'

  constructor() {
    this.config = {
      reverseTtlDays: parseInt(process.env.REVERSE_DOMAIN_CACHE_TTL_DAYS || '7'),
      forwardTtlDays: parseInt(process.env.FORWARD_DOMAIN_CACHE_TTL_DAYS || '1'),
      maxEntries: parseInt(process.env.MAX_CACHE_ENTRIES || '10000'),
      cleanupIntervalMs: parseInt(process.env.CACHE_CLEANUP_INTERVAL_MS || '3600000'), // 1 hour
      dbName: 'DomainCacheDB',
      dbVersion: 1
    }

    this.stats = {
      totalEntries: 0,
      forwardEntries: 0,
      reverseEntries: 0,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheSize: 0,
      lastCleanup: new Date().toISOString()
    }

    this.initializeDatabase()
    this.startCleanupTimer()

    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Domain Cache initialized with config:', {
        reverseTtlDays: this.config.reverseTtlDays,
        forwardTtlDays: this.config.forwardTtlDays,
        maxEntries: this.config.maxEntries
      })
    }
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDatabase(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('💾 IndexedDB not available, using memory-only cache')
      this.dbInitialized = true
      return
    }

    try {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion)

      request.onerror = () => {
        console.error('💾 Failed to open IndexedDB:', request.error)
        this.dbInitialized = true // Continue with memory-only
      }

      request.onsuccess = () => {
        this.db = request.result
        this.dbInitialized = true
        this.loadFromDatabase()

        if (process.env.NODE_ENV === 'development') {
          console.log('💾 IndexedDB connected successfully')
        }
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object store
        if (!db.objectStoreNames.contains(this.DB_STORE_NAME)) {
          const store = db.createObjectStore(this.DB_STORE_NAME, { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('type', 'type', { unique: false })
        }
      }
    } catch (error) {
      console.error('💾 Error initializing IndexedDB:', error)
      this.dbInitialized = true // Continue with memory-only
    }
  }

  /**
   * Load cache entries from IndexedDB into memory
   */
  private async loadFromDatabase(): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([this.DB_STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.DB_STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries: CacheEntry[] = request.result || []
        const now = Date.now()
        let loadedCount = 0

        for (const entry of entries) {
          // Only load non-expired entries
          if (now - entry.timestamp < entry.ttl) {
            this.memoryCache.set(entry.key, entry)
            loadedCount++
          }
        }

        this.updateStats()

        if (process.env.NODE_ENV === 'development') {
          console.log(`💾 Loaded ${loadedCount} valid cache entries from IndexedDB`)
        }
      }

      request.onerror = () => {
        console.error('💾 Error loading from IndexedDB:', request.error)
      }
    } catch (error) {
      console.error('💾 Error loading from database:', error)
    }
  }

  /**
   * Save entry to IndexedDB
   */
  private async saveToDatabase(entry: CacheEntry): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([this.DB_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.DB_STORE_NAME)
      
      store.put(entry)
      
      transaction.onerror = () => {
        console.error('💾 Error saving to IndexedDB:', transaction.error)
      }
    } catch (error) {
      console.error('💾 Error saving to database:', error)
    }
  }

  /**
   * Delete entry from IndexedDB
   */
  private async deleteFromDatabase(key: string): Promise<void> {
    if (!this.db) return

    try {
      const transaction = this.db.transaction([this.DB_STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.DB_STORE_NAME)
      
      store.delete(key)
      
      transaction.onerror = () => {
        console.error('💾 Error deleting from IndexedDB:', transaction.error)
      }
    } catch (error) {
      console.error('💾 Error deleting from database:', error)
    }
  }

  /**
   * Get cached value
   */
  async get(key: string, type: 'forward' | 'reverse' = 'reverse'): Promise<string | null | undefined> {
    const cacheKey = `${type}:${key.toLowerCase()}`
    const entry = this.memoryCache.get(cacheKey)

    if (!entry) {
      this.stats.totalMisses++
      this.updateStats()
      return undefined // Cache miss
    }

    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(cacheKey)
      this.deleteFromDatabase(cacheKey)
      this.stats.totalMisses++
      this.updateStats()
      return undefined // Expired
    }

    this.stats.totalHits++
    this.updateStats()
    return entry.value
  }

  /**
   * Set cached value
   */
  async set(
    key: string, 
    value: string | null, 
    type: 'forward' | 'reverse' = 'reverse',
    source: 'api' | 'registry' | 'manual' = 'api'
  ): Promise<void> {
    const cacheKey = `${type}:${key.toLowerCase()}`
    const ttl = type === 'reverse' 
      ? this.config.reverseTtlDays * 24 * 60 * 60 * 1000
      : this.config.forwardTtlDays * 24 * 60 * 60 * 1000

    const entry: CacheEntry = {
      key: cacheKey,
      value,
      timestamp: Date.now(),
      ttl,
      type,
      source
    }

    // Add to memory cache
    this.memoryCache.set(cacheKey, entry)

    // Save to persistent storage
    this.saveToDatabase(entry)

    // Check if we need to cleanup
    if (this.memoryCache.size > this.config.maxEntries) {
      this.cleanup()
    }

    this.updateStats()
  }

  /**
   * Batch get multiple keys
   */
  async batchGet(
    keys: string[], 
    type: 'forward' | 'reverse' = 'reverse'
  ): Promise<Map<string, string | null | undefined>> {
    const results = new Map<string, string | null | undefined>()

    for (const key of keys) {
      const value = await this.get(key, type)
      results.set(key, value)
    }

    return results
  }

  /**
   * Batch set multiple keys
   */
  async batchSet(
    entries: Array<{ key: string; value: string | null; source?: 'api' | 'registry' | 'manual' }>,
    type: 'forward' | 'reverse' = 'reverse'
  ): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, type, entry.source || 'api')
    )

    await Promise.all(promises)
  }

  /**
   * Delete cached entry
   */
  async delete(key: string, type: 'forward' | 'reverse' = 'reverse'): Promise<boolean> {
    const cacheKey = `${type}:${key.toLowerCase()}`
    const existed = this.memoryCache.has(cacheKey)

    if (existed) {
      this.memoryCache.delete(cacheKey)
      this.deleteFromDatabase(cacheKey)
      this.updateStats()
    }

    return existed
  }

  /**
   * Check if key exists in cache (and not expired)
   */
  async has(key: string, type: 'forward' | 'reverse' = 'reverse'): Promise<boolean> {
    const value = await this.get(key, type)
    return value !== undefined
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()

    if (this.db) {
      try {
        const transaction = this.db.transaction([this.DB_STORE_NAME], 'readwrite')
        const store = transaction.objectStore(this.DB_STORE_NAME)
        store.clear()
      } catch (error) {
        console.error('💾 Error clearing database:', error)
      }
    }

    this.stats.totalHits = 0
    this.stats.totalMisses = 0
    this.updateStats()

    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Domain cache cleared')
    }
  }

  /**
   * Cleanup expired entries and manage cache size
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []
    const entries = Array.from(this.memoryCache.entries())

    // Find expired entries
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key)
      }
    }

    // Delete expired entries
    for (const key of toDelete) {
      this.memoryCache.delete(key)
      this.deleteFromDatabase(key)
    }

    // If still over limit, remove oldest entries (LRU)
    if (this.memoryCache.size > this.config.maxEntries) {
      const sortedEntries = entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, this.memoryCache.size - this.config.maxEntries)

      for (const [key] of sortedEntries) {
        this.memoryCache.delete(key)
        this.deleteFromDatabase(key)
      }
    }

    this.stats.lastCleanup = new Date().toISOString()
    this.updateStats()

    if (process.env.NODE_ENV === 'development' && toDelete.length > 0) {
      console.log(`💾 Cleaned up ${toDelete.length} expired cache entries`)
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    const entries = Array.from(this.memoryCache.values())
    
    this.stats.totalEntries = entries.length
    this.stats.forwardEntries = entries.filter(e => e.type === 'forward').length
    this.stats.reverseEntries = entries.filter(e => e.type === 'reverse').length
    
    const totalRequests = this.stats.totalHits + this.stats.totalMisses
    this.stats.hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0
    
    // Estimate cache size in bytes (rough approximation)
    this.stats.cacheSize = entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length
    }, 0)
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Export cache data
   */
  async exportCache(): Promise<CacheEntry[]> {
    return Array.from(this.memoryCache.values())
  }

  /**
   * Import cache data
   */
  async importCache(entries: CacheEntry[], merge = true): Promise<number> {
    if (!merge) {
      await this.clear()
    }

    let importedCount = 0
    const now = Date.now()

    for (const entry of entries) {
      // Only import non-expired entries
      if (now - entry.timestamp < entry.ttl) {
        this.memoryCache.set(entry.key, entry)
        this.saveToDatabase(entry)
        importedCount++
      }
    }

    this.updateStats()

    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 Imported ${importedCount} cache entries`)
    }

    return importedCount
  }

  /**
   * Get cache entries by type
   */
  getEntriesByType(type: 'forward' | 'reverse'): CacheEntry[] {
    return Array.from(this.memoryCache.values()).filter(entry => entry.type === type)
  }

  /**
   * Preload entries into cache
   */
  async preload(entries: Array<{ key: string; value: string | null; type?: 'forward' | 'reverse' }>): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.type || 'reverse', 'manual')
    )

    await Promise.all(promises)
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer()
    this.memoryCache.clear()

    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Create singleton instance
export const domainCache = new DomainCache()

// Convenience functions
export const getCachedDomain = (address: string): Promise<string | null | undefined> =>
  domainCache.get(address, 'reverse')

export const setCachedDomain = (address: string, domain: string | null, source?: 'api' | 'registry' | 'manual'): Promise<void> =>
  domainCache.set(address, domain, 'reverse', source)

export const batchGetCachedDomains = (addresses: string[]): Promise<Map<string, string | null | undefined>> =>
  domainCache.batchGet(addresses, 'reverse')

export const batchSetCachedDomains = (entries: Array<{ key: string; value: string | null; source?: 'api' | 'registry' | 'manual' }>): Promise<void> =>
  domainCache.batchSet(entries, 'reverse')