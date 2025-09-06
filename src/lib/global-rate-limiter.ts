/**
 * Global Rate Limiter Service
 * 
 * Coordinates all RPC API calls across the application to prevent 429 rate limit errors.
 * Uses a singleton pattern to ensure all services share the same rate limit quota.
 */

export interface RateLimitRequest {
  id: string
  priority: 'high' | 'normal' | 'low'
  operation: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
  retryCount: number
}

export interface RateLimiterConfig {
  maxRequestsPerSecond: number
  maxRetries: number
  baseDelay: number
  maxDelay: number
  circuitBreakerThreshold: number
  circuitBreakerTimeout: number
}

export interface RateLimiterStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rateLimitedRequests: number
  averageDelay: number
  queueLength: number
  isCircuitBreakerOpen: boolean
}

class GlobalRateLimiter {
  private config: RateLimiterConfig
  private requestQueue: RateLimitRequest[] = []
  private isProcessing = false
  private lastRequestTime = 0
  private stats: RateLimiterStats
  
  // Circuit breaker state
  private circuitBreakerFailures = 0
  private circuitBreakerOpenTime = 0
  private isCircuitBreakerOpen = false
  
  // Request deduplication
  private pendingRequests = new Map<string, RateLimitRequest>()
  
  constructor() {
    this.config = {
      maxRequestsPerSecond: parseFloat(process.env.HELIUS_RATE_LIMIT_PER_SECOND || '1'),
      maxRetries: 3,
      baseDelay: 1000, // 1 second base delay
      maxDelay: 10000, // 10 seconds max delay
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000 // 30 seconds
    }
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageDelay: 0,
      queueLength: 0,
      isCircuitBreakerOpen: false
    }
    
    this.startProcessing()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 Global Rate Limiter initialized:', {
        maxRequestsPerSecond: this.config.maxRequestsPerSecond,
        baseDelay: this.config.baseDelay
      })
    }
  }
  
  /**
   * Add a request to the rate-limited queue
   */
  async enqueueRequest<T>(
    requestId: string,
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check for duplicate requests
      const existing = this.pendingRequests.get(requestId)
      if (existing) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Deduplicating request: ${requestId}`)
        }
        
        // Attach to existing request
        const originalResolve = existing.resolve
        const originalReject = existing.reject
        
        existing.resolve = (value) => {
          originalResolve(value)
          resolve(value)
        }
        
        existing.reject = (error) => {
          originalReject(error)
          reject(error)
        }
        
        return
      }
      
      const request: RateLimitRequest = {
        id: requestId,
        priority,
        operation,
        resolve: (value: T) => {
          this.pendingRequests.delete(requestId)
          resolve(value)
        },
        reject: (error: any) => {
          this.pendingRequests.delete(requestId)
          reject(error)
        },
        timestamp: Date.now(),
        retryCount: 0
      }
      
      // Add to pending requests for deduplication
      this.pendingRequests.set(requestId, request)
      
      // Insert into queue based on priority
      this.insertByPriority(request)
      this.stats.totalRequests++
      this.updateQueueStats()
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📥 Queued request: ${requestId} (priority: ${priority}, queue: ${this.requestQueue.length})`)
      }
    })
  }
  
  /**
   * Insert request into queue based on priority
   */
  private insertByPriority(request: RateLimitRequest): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    const requestPriority = priorityOrder[request.priority]
    
    let insertIndex = this.requestQueue.length
    for (let i = 0; i < this.requestQueue.length; i++) {
      const queuePriority = priorityOrder[this.requestQueue[i].priority]
      if (requestPriority < queuePriority) {
        insertIndex = i
        break
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request)
  }
  
  /**
   * Start processing the request queue
   */
  private startProcessing(): void {
    if (this.isProcessing) return
    
    this.isProcessing = true
    this.processQueue()
  }
  
  /**
   * Process requests from the queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    while (true) {
      if (this.requestQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }
      
      // Check circuit breaker
      if (this.checkCircuitBreaker()) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }
      
      const request = this.requestQueue.shift()
      if (!request) continue
      
      try {
        await this.executeRequest(request)
      } catch (error) {
        // Request execution handles its own errors
      }
      
      this.updateQueueStats()
    }
  }
  
  /**
   * Execute a single request with rate limiting and retry logic
   */
  private async executeRequest(request: RateLimitRequest): Promise<void> {
    try {
      // Enforce rate limiting delay
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      const minDelay = 1000 / this.config.maxRequestsPerSecond
      
      if (timeSinceLastRequest < minDelay) {
        const delayNeeded = minDelay - timeSinceLastRequest
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏱️ Rate limiting delay: ${delayNeeded}ms for ${request.id}`)
        }
        await new Promise(resolve => setTimeout(resolve, delayNeeded))
      }
      
      this.lastRequestTime = Date.now()
      
      // Execute the request
      const result = await request.operation()
      
      // Success
      this.stats.successfulRequests++
      this.circuitBreakerFailures = 0 // Reset on success
      request.resolve(result)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Request completed: ${request.id}`)
      }
      
    } catch (error) {
      // Handle specific error types
      if (this.isRateLimitError(error)) {
        this.stats.rateLimitedRequests++
        this.handleRateLimitError(request)
      } else {
        this.stats.failedRequests++
        request.reject(error)
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ Request failed: ${request.id}`, error)
        }
      }
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
   * Handle rate limiting errors with backoff and retry
   */
  private async handleRateLimitError(request: RateLimitRequest): Promise<void> {
    this.circuitBreakerFailures++
    
    if (request.retryCount >= this.config.maxRetries) {
      request.reject(new Error(`Rate limited - max retries (${this.config.maxRetries}) exceeded`))
      return
    }
    
    // Exponential backoff with jitter
    const backoffDelay = Math.min(
      this.config.baseDelay * Math.pow(2, request.retryCount),
      this.config.maxDelay
    )
    
    const jitter = Math.random() * 0.3 * backoffDelay // Add 30% jitter
    const totalDelay = backoffDelay + jitter
    
    request.retryCount++
    request.timestamp = Date.now() + totalDelay
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 Retrying ${request.id} in ${Math.round(totalDelay)}ms (attempt ${request.retryCount}/${this.config.maxRetries})`)
    }
    
    // Re-add to queue after delay
    setTimeout(() => {
      this.insertByPriority(request)
    }, totalDelay)
  }
  
  /**
   * Check and manage circuit breaker state
   */
  private checkCircuitBreaker(): boolean {
    const now = Date.now()
    
    // Check if circuit breaker should be opened
    if (!this.isCircuitBreakerOpen && 
        this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      this.isCircuitBreakerOpen = true
      this.circuitBreakerOpenTime = now
      
      console.warn(`⛔ Circuit breaker opened - too many rate limit failures (${this.circuitBreakerFailures})`)
    }
    
    // Check if circuit breaker should be closed
    if (this.isCircuitBreakerOpen && 
        now - this.circuitBreakerOpenTime > this.config.circuitBreakerTimeout) {
      this.isCircuitBreakerOpen = false
      this.circuitBreakerFailures = 0
      
      console.log('✅ Circuit breaker closed - resuming requests')
    }
    
    this.stats.isCircuitBreakerOpen = this.isCircuitBreakerOpen
    return this.isCircuitBreakerOpen
  }
  
  /**
   * Update queue statistics
   */
  private updateQueueStats(): void {
    this.stats.queueLength = this.requestQueue.length
    
    if (this.stats.totalRequests > 0) {
      this.stats.averageDelay = 1000 / this.config.maxRequestsPerSecond
    }
  }
  
  /**
   * Get current rate limiter statistics
   */
  getStats(): RateLimiterStats {
    return { ...this.stats }
  }
  
  /**
   * Clear all queued requests (emergency use only)
   */
  clearQueue(): void {
    const clearedCount = this.requestQueue.length
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'))
    })
    this.requestQueue = []
    this.pendingRequests.clear()
    
    console.warn(`🧹 Cleared ${clearedCount} requests from rate limiter queue`)
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Rate limiter configuration updated:', this.config)
    }
  }
}

// Create singleton instance
export const globalRateLimiter = new GlobalRateLimiter()

/**
 * Convenience function to make rate-limited requests
 */
export async function rateLimitedRequest<T>(
  requestId: string,
  operation: () => Promise<T>,
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<T> {
  return globalRateLimiter.enqueueRequest(requestId, operation, priority)
}

/**
 * Get rate limiter statistics
 */
export function getRateLimiterStats(): RateLimiterStats {
  return globalRateLimiter.getStats()
}