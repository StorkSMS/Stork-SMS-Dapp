import { Connection } from '@solana/web3.js'
import { rateLimitedRequest, getRateLimiterStats } from './global-rate-limiter'

/**
 * Centralized Solana RPC Connection Factory
 * 
 * This factory ensures consistent RPC endpoint configuration across the entire application.
 * Prioritizes paid RPC endpoints with API keys over public endpoints to avoid rate limits.
 */

export interface SolanaRpcConfig {
  network: 'mainnet' | 'devnet'
  commitment?: 'finalized' | 'confirmed' | 'processed'
}

// Cache connections to avoid creating multiple instances
const connectionCache = new Map<string, Connection>()

/**
 * Get the optimal RPC endpoint URL for the specified network
 */
export function getRpcEndpointUrl(network: 'mainnet' | 'devnet' = 'mainnet'): string {
  if (network === 'devnet') {
    return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com'
  }

  // Mainnet RPC endpoint priority:
  // 1. Helius RPC (paid, reliable, good for domain resolution)
  // 2. Custom RPC URL from environment
  // 3. Public Solana RPC (fallback only, rate limited)
  
  const heliusRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET
  const customRpc = process.env.SOLANA_RPC_URL
  const publicRpc = 'https://api.mainnet-beta.solana.com'
  
  // Log RPC configuration in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Solana RPC Configuration:', {
      heliusRpc: heliusRpc ? `${heliusRpc.split('?')[0]}?[API_KEY_HIDDEN]` : 'not configured',
      customRpc: customRpc ? `${customRpc.split('?')[0]}?[API_KEY_HIDDEN]` : 'not configured',
      publicRpc,
      selected: heliusRpc || customRpc || publicRpc
    })
  }
  
  // Return the best available endpoint
  return heliusRpc || customRpc || publicRpc
}

/**
 * Create a new Solana Connection with optimal configuration
 */
export function createSolanaConnection(config: SolanaRpcConfig = { network: 'mainnet' }): Connection {
  const { network, commitment = 'confirmed' } = config
  const cacheKey = `${network}-${commitment}`
  
  // Return cached connection if available
  if (connectionCache.has(cacheKey)) {
    const cached = connectionCache.get(cacheKey)!
    if (process.env.NODE_ENV === 'development') {
      console.log(`♻️ Using cached Solana connection for ${network} (${commitment})`)
    }
    return cached
  }
  
  const rpcUrl = getRpcEndpointUrl(network)
  const connection = new Connection(rpcUrl, commitment)
  
  // Cache the connection
  connectionCache.set(cacheKey, connection)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔗 Created new Solana connection for ${network} (${commitment}):`, {
      endpoint: rpcUrl.split('?')[0] + (rpcUrl.includes('?') ? '?[API_KEY_HIDDEN]' : ''),
      commitment
    })
  }
  
  return connection
}

/**
 * Get the default mainnet connection (most common use case)
 */
export function getMainnetConnection(): Connection {
  return createSolanaConnection({ network: 'mainnet' })
}

/**
 * Get the default devnet connection
 */
export function getDevnetConnection(): Connection {
  return createSolanaConnection({ network: 'devnet' })
}

/**
 * Clear the connection cache (useful for testing or forced refresh)
 */
export function clearConnectionCache(): void {
  connectionCache.clear()
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleared Solana connection cache')
  }
}

/**
 * Validate RPC endpoint configuration
 */
export function validateRpcConfiguration(): {
  isValid: boolean
  warnings: string[]
  recommendations: string[]
} {
  const warnings: string[] = []
  const recommendations: string[] = []
  
  const heliusRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET
  const customRpc = process.env.SOLANA_RPC_URL
  
  // Check if using public RPC (not recommended for production)
  if (!heliusRpc && !customRpc) {
    warnings.push('Using public Solana RPC endpoint - expect rate limits and 403 errors')
    recommendations.push('Configure NEXT_PUBLIC_SOLANA_RPC_MAINNET with a paid RPC provider (Helius, QuickNode, etc.)')
  }
  
  // Check for QuickNode SSL issues
  if (heliusRpc?.includes('quiknode') || customRpc?.includes('quiknode')) {
    warnings.push('QuickNode endpoint detected - monitor for SSL protocol errors')
    recommendations.push('Consider switching to Helius RPC if experiencing SSL issues with QuickNode')
  }
  
  // Check for API keys in URLs
  const hasApiKey = (url?: string) => url && (url.includes('api-key=') || url.includes('auth-token=') || url.includes('token='))
  
  if ((heliusRpc && !hasApiKey(heliusRpc)) || (customRpc && !hasApiKey(customRpc))) {
    warnings.push('RPC endpoint may not have API key - could cause rate limiting')
    recommendations.push('Ensure your RPC URL includes the API key parameter')
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    recommendations
  }
}

/**
 * Rate-limited RPC client for making API calls through the global rate limiter
 */
export async function rateLimitedRpcCall(
  requestData: any,
  options: {
    priority?: 'high' | 'normal' | 'low'
    requestId?: string
    endpoint?: string
  } = {}
): Promise<any> {
  const {
    priority = 'normal',
    requestId = `rpc-${Date.now()}-${Math.random()}`,
    endpoint = getRpcEndpointUrl('mainnet')
  } = options

  return rateLimitedRequest(
    requestId,
    async () => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        throw new Error(`RPC error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    },
    priority
  )
}

/**
 * Get rate limiter statistics for monitoring
 */
export function getSolanaRpcStats() {
  return getRateLimiterStats()
}

// Validate configuration on module load in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateRpcConfiguration()
  if (!validation.isValid) {
    console.warn('⚠️ Solana RPC Configuration Issues:')
    validation.warnings.forEach(warning => console.warn(`  • ${warning}`))
    if (validation.recommendations.length > 0) {
      console.log('💡 Recommendations:')
      validation.recommendations.forEach(rec => console.log(`  • ${rec}`))
    }
  }
}