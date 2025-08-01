import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'

// Company wallet configuration
const COMPANY_WALLET_PUBLIC_KEY = process.env.COMPANY_WALLET_PUB
const COMPANY_WALLET_PRIVATE_KEY = process.env.COMPANY_WALLET_PRIV

if (!COMPANY_WALLET_PUBLIC_KEY || !COMPANY_WALLET_PRIVATE_KEY) {
  throw new Error(
    'Missing company wallet environment variables. Please add COMPANY_WALLET_PUB and COMPANY_WALLET_PRIV to your .env file.'
  )
}

// Parse private key from environment (array format)
let companyWalletKeypair: Keypair
try {
  const privateKeyArray = JSON.parse(COMPANY_WALLET_PRIVATE_KEY)
  if (!Array.isArray(privateKeyArray) || privateKeyArray.length !== 64) {
    throw new Error('Invalid private key format')
  }
  companyWalletKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray))
} catch (error) {
  throw new Error(`Failed to parse company wallet private key: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

// Verify public key matches
const derivedPublicKey = companyWalletKeypair.publicKey.toBase58()
if (derivedPublicKey !== COMPANY_WALLET_PUBLIC_KEY) {
  throw new Error(
    `Company wallet public key mismatch. Expected: ${COMPANY_WALLET_PUBLIC_KEY}, Got: ${derivedPublicKey}`
  )
}

// Export the keypair and public key
export const companyWallet = companyWalletKeypair
export const companyWalletPublicKey = new PublicKey(COMPANY_WALLET_PUBLIC_KEY)

// Solana connection (using private RPC for server-side operations)
export const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
)

// Company wallet utilities
export const companyWalletUtils = {
  /**
   * Get the company wallet's SOL balance
   */
  async getBalance(): Promise<number> {
    try {
      const balance = await connection.getBalance(companyWalletPublicKey)
      return balance / LAMPORTS_PER_SOL
    } catch (error) {
      console.error('Error getting company wallet balance:', error)
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Get the company wallet's public key as string
   */
  getPublicKeyString(): string {
    return companyWalletPublicKey.toBase58()
  },

  /**
   * Send SOL from company wallet to another address
   */
  async sendSOL(
    recipientAddress: string | PublicKey,
    amountSOL: number
  ): Promise<string> {
    try {
      const recipient = typeof recipientAddress === 'string' 
        ? new PublicKey(recipientAddress) 
        : recipientAddress

      const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: companyWalletPublicKey,
          toPubkey: recipient,
          lamports,
        })
      )

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [companyWallet],
        { commitment: 'confirmed' }
      )

      console.log(`Sent ${amountSOL} SOL to ${recipient.toBase58()}. Signature: ${signature}`)
      return signature
    } catch (error) {
      console.error('Error sending SOL:', error)
      throw new Error(`Failed to send SOL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Check if the company wallet has sufficient balance for a transaction
   */
  async hasSufficientBalance(requiredSOL: number, includeRentExemption: boolean = true): Promise<boolean> {
    try {
      const balance = await this.getBalance()
      const rentExemption = includeRentExemption ? 0.00203928 : 0 // Minimum rent exemption for account
      return balance >= (requiredSOL + rentExemption)
    } catch (error) {
      console.error('Error checking wallet balance:', error)
      return false
    }
  },

  /**
   * Get recent transaction signatures for the company wallet
   */
  async getRecentTransactions(limit: number = 10): Promise<any[]> {
    try {
      const signatures = await connection.getSignaturesForAddress(
        companyWalletPublicKey,
        { limit }
      )
      
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            })
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              confirmationStatus: sig.confirmationStatus,
              transaction: tx,
            }
          } catch (error) {
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              confirmationStatus: sig.confirmationStatus,
              transaction: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })
      )
      
      return transactions
    } catch (error) {
      console.error('Error getting recent transactions:', error)
      throw new Error(`Failed to get recent transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  /**
   * Airdrop SOL to company wallet (devnet only)
   */
  async requestAirdrop(amountSOL: number = 1): Promise<string> {
    try {
      // Only allow airdrops on devnet
      const endpoint = connection.rpcEndpoint
      if (!endpoint.includes('devnet')) {
        throw new Error('Airdrops are only available on devnet')
      }

      const lamports = amountSOL * LAMPORTS_PER_SOL
      const signature = await connection.requestAirdrop(companyWalletPublicKey, lamports)
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')
      
      console.log(`Airdropped ${amountSOL} SOL to company wallet. Signature: ${signature}`)
      return signature
    } catch (error) {
      console.error('Error requesting airdrop:', error)
      throw new Error(`Failed to request airdrop: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Helper function to validate Solana addresses
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Helper function to convert lamports to SOL
export const lamportsToSOL = (lamports: number): number => {
  return lamports / LAMPORTS_PER_SOL
}

// Helper function to convert SOL to lamports
export const solToLamports = (sol: number): number => {
  return Math.floor(sol * LAMPORTS_PER_SOL)
}

// Note: connection is already exported above