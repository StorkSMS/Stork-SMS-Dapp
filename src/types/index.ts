// Re-export all types from individual modules
export * from './messaging'
export * from './nft'

// Common utility types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface TimestampedEntity {
  created_at: string
  updated_at: string
}

export interface MetadataEntity {
  metadata?: Record<string, any>
}

// Environment configuration types
export interface EnvironmentConfig {
  supabase: {
    url: string
    anonKey: string
  }
  r2: {
    accessKeyId: string
    secretAccessKey: string
    accountId: string
    bucket: string
    region: string
    baseUrl: string
  }
  solana: {
    rpcUrl: string
    network: 'devnet' | 'mainnet-beta' | 'testnet'
  }
  companyWallet: {
    publicKey: string
    privateKey: string
  }
}

// Error types
export interface AppError extends Error {
  code: string
  statusCode?: number
  details?: any
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class StorageError extends Error {
  constructor(message: string, public operation?: string) {
    super(message)
    this.name = 'StorageError'
  }
}