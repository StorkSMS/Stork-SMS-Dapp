import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import bs58 from 'bs58'

export interface TreasuryConfig {
  publicKey: string
  encryptedPrivateKey: string
  encryptionKey: string
  rpcUrl: string
  tokenMintAddress: string
  isDryRun: boolean
  amountPerWallet: number
}

export class TreasuryService {
  private config: TreasuryConfig
  private connection: Connection
  private treasuryKeypair: Keypair | null = null

  constructor(config: TreasuryConfig) {
    this.config = config
    this.connection = new Connection(config.rpcUrl, 'confirmed')
  }

  /**
   * Encrypt a private key using AES-256-GCM
   */
  static encryptPrivateKey(privateKeyBase58: string, encryptionKey: string): string {
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(encryptionKey, 'hex')
    const iv = randomBytes(16)
    const cipher = createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(privateKeyBase58, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Combine iv, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  /**
   * Decrypt a private key using AES-256-GCM
   */
  static decryptPrivateKey(encryptedData: string, encryptionKey: string): string {
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(encryptionKey, 'hex')
    
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = createDecipheriv(algorithm, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Initialize the treasury keypair with secure decryption
   */
  async initializeTreasury(): Promise<void> {
    try {
      const privateKeyData = this.config.encryptedPrivateKey
      let privateKeyBytes: Uint8Array
      
      // Handle both base58 string and array format
      if (privateKeyData.startsWith('[') && privateKeyData.endsWith(']')) {
        // Array format: [163,234,223,58,...]
        const keyArray = JSON.parse(privateKeyData)
        privateKeyBytes = new Uint8Array(keyArray)
      } else {
        // Base58 string format
        privateKeyBytes = bs58.decode(privateKeyData)
      }
      
      this.treasuryKeypair = Keypair.fromSecretKey(privateKeyBytes)
      
      console.log('✅ Treasury initialized:', this.treasuryKeypair.publicKey.toString())
      
      // Verify the public key matches
      if (this.treasuryKeypair.publicKey.toString() !== this.config.publicKey) {
        throw new Error(`Treasury public key mismatch. Expected: ${this.config.publicKey}, Got: ${this.treasuryKeypair.publicKey.toString()}`)
      }
    } catch (error) {
      console.error('❌ Failed to initialize treasury:', error)
      throw new Error('Failed to initialize treasury keypair')
    }
  }

  /**
   * Get the treasury's token account for the STORK token
   */
  async getTreasuryTokenAccount(): Promise<PublicKey> {
    if (!this.treasuryKeypair) {
      throw new Error('Treasury not initialized')
    }

    // Import needed functions from spl-token
    const { getAssociatedTokenAddress } = await import('@solana/spl-token')
    
    return getAssociatedTokenAddress(
      new PublicKey(this.config.tokenMintAddress),
      this.treasuryKeypair.publicKey
    )
  }

  /**
   * Get treasury token balance
   */
  async getTreasuryBalance(): Promise<number> {
    try {
      const { getAccount } = await import('@solana/spl-token')
      const tokenAccount = await this.getTreasuryTokenAccount()
      
      const account = await getAccount(this.connection, tokenAccount)
      return Number(account.amount)
    } catch (error) {
      console.error('Error getting treasury balance:', error)
      return 0
    }
  }

  /**
   * Validate that treasury has sufficient balance for a claim
   */
  async validateSufficientBalance(amountToTransfer: number): Promise<boolean> {
    const balance = await this.getTreasuryBalance()
    return balance >= amountToTransfer
  }

  /**
   * Get treasury keypair (only for transaction signing)
   */
  getTreasuryKeypair(): Keypair {
    if (!this.treasuryKeypair) {
      throw new Error('Treasury not initialized')
    }
    return this.treasuryKeypair
  }

  /**
   * Generate a secure nonce for transaction validation
   */
  generateNonce(): string {
    return randomBytes(16).toString('hex')
  }

  /**
   * Validate transaction parameters
   */
  validateTransactionParams(recipientAddress: string, amount: number): void {
    if (!recipientAddress) {
      throw new Error('Recipient address is required')
    }
    
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0')
    }
    
    if (amount !== this.config.amountPerWallet) {
      throw new Error('Invalid claim amount')
    }

    try {
      new PublicKey(recipientAddress)
    } catch (error) {
      throw new Error('Invalid recipient address')
    }
  }
}