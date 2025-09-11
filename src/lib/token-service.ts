import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  AccountMeta,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'

// SPL Token Program Constants
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

// STORK Token Configuration
export const TOKEN_CONFIG = {
  STORK_TOKEN_MINT: process.env.NEXT_PUBLIC_STORK_TOKEN_MINT || '51Yc9NkkNKMbo31XePni6ZFKMFz4d6H273M8CRhCpump',
  JUPITER_API_URL: 'https://quote-api.jup.ag/v6',
  SOL_MINT: 'So11111111111111111111111111111111111111112', // Wrapped SOL mint
  PRICE_CACHE_DURATION: 30000, // 30 seconds
  SLIPPAGE_BPS: 50, // 0.5% slippage
  PUMP_FUN_DECIMALS: 6, // pump.fun tokens are 6 decimals
  SOL_DECIMALS: 9
} as const

interface JupiterQuoteResponse {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  platformFee?: {
    amount: string
    feeBps: number
  }
  priceImpactPct: string
  routePlan: Array<{
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
  }>
}

interface TokenBalance {
  mint: string
  amount: number
  decimals: number
  uiAmount: number
}

interface PriceCache {
  solToStork: number
  storkToSol: number
  timestamp: number
}

export class TokenService {
  private static priceCache: PriceCache | null = null
  
  /**
   * Get the current SOL to STORK exchange rate using Jupiter API
   */
  static async getSOLToSTORKRate(solAmount: number = 0.0033): Promise<{ rate: number; storkAmount: number }> {
    try {
      // Check cache first
      if (this.priceCache && Date.now() - this.priceCache.timestamp < TOKEN_CONFIG.PRICE_CACHE_DURATION) {
        return {
          rate: this.priceCache.solToStork,
          storkAmount: solAmount * this.priceCache.solToStork
        }
      }

      const lamports = solAmount * Math.pow(10, TOKEN_CONFIG.SOL_DECIMALS)
      const response = await fetch(
        `${TOKEN_CONFIG.JUPITER_API_URL}/quote?` +
        `inputMint=${TOKEN_CONFIG.SOL_MINT}&` +
        `outputMint=${TOKEN_CONFIG.STORK_TOKEN_MINT}&` +
        `amount=${Math.floor(lamports)}&` +
        `slippageBps=${TOKEN_CONFIG.SLIPPAGE_BPS}&` +
        `swapMode=ExactIn`
      )

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`)
      }

      const quote: JupiterQuoteResponse = await response.json()
      const storkAmountRaw = parseInt(quote.outAmount)
      const storkAmount = storkAmountRaw / Math.pow(10, TOKEN_CONFIG.PUMP_FUN_DECIMALS)
      const rate = storkAmount / solAmount

      // Cache the result
      this.priceCache = {
        solToStork: rate,
        storkToSol: 1 / rate,
        timestamp: Date.now()
      }

      return { rate, storkAmount }
    } catch (error) {
      console.error('Failed to fetch SOL to STORK rate:', error)
      // Fallback rate - this should be updated based on market conditions
      const fallbackRate = 1000 // 1 SOL = 1000 STORK (example)
      return {
        rate: fallbackRate,
        storkAmount: solAmount * fallbackRate
      }
    }
  }

  /**
   * Get the current STORK to SOL exchange rate using Jupiter API
   */
  static async getSTORKToSOLRate(storkAmount: number): Promise<{ rate: number; solAmount: number }> {
    try {
      // Check cache first
      if (this.priceCache && Date.now() - this.priceCache.timestamp < TOKEN_CONFIG.PRICE_CACHE_DURATION) {
        return {
          rate: this.priceCache.storkToSol,
          solAmount: storkAmount * this.priceCache.storkToSol
        }
      }

      const storkLamports = storkAmount * Math.pow(10, TOKEN_CONFIG.PUMP_FUN_DECIMALS)
      const response = await fetch(
        `${TOKEN_CONFIG.JUPITER_API_URL}/quote?` +
        `inputMint=${TOKEN_CONFIG.STORK_TOKEN_MINT}&` +
        `outputMint=${TOKEN_CONFIG.SOL_MINT}&` +
        `amount=${Math.floor(storkLamports)}&` +
        `slippageBps=${TOKEN_CONFIG.SLIPPAGE_BPS}&` +
        `swapMode=ExactIn`
      )

      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status}`)
      }

      const quote: JupiterQuoteResponse = await response.json()
      const solAmountRaw = parseInt(quote.outAmount)
      const solAmount = solAmountRaw / Math.pow(10, TOKEN_CONFIG.SOL_DECIMALS)
      const rate = solAmount / storkAmount

      // Update cache
      this.priceCache = {
        solToStork: 1 / rate,
        storkToSol: rate,
        timestamp: Date.now()
      }

      return { rate, solAmount }
    } catch (error) {
      console.error('Failed to fetch STORK to SOL rate:', error)
      // Fallback rate
      const fallbackRate = 0.001 // 1 STORK = 0.001 SOL (example)
      return {
        rate: fallbackRate,
        solAmount: storkAmount * fallbackRate
      }
    }
  }

  /**
   * Calculate the STORK amount needed to pay for a given SOL amount
   * Includes 20% discount for STORK payments
   */
  static async calculateSTORKAmount(solAmount: number): Promise<{ storkAmount: number; rate: number; priceImpact: number }> {
    const discountedSolAmount = solAmount * 0.8 // 20% discount
    const { rate, storkAmount } = await this.getSOLToSTORKRate(discountedSolAmount)
    
    return {
      storkAmount,
      rate,
      priceImpact: 0 // Will be populated from Jupiter API response
    }
  }

  /**
   * Get Associated Token Account address for a wallet and mint
   */
  static async getAssociatedTokenAccount(
    walletPublicKey: PublicKey,
    mintPublicKey: PublicKey
  ): Promise<PublicKey> {
    const [associatedToken] = await PublicKey.findProgramAddress(
      [
        walletPublicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer()
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
    return associatedToken
  }

  /**
   * Get user's token balance for a specific mint
   */
  static async getTokenBalance(
    connection: Connection,
    walletPublicKey: PublicKey,
    mintAddress: string
  ): Promise<TokenBalance | null> {
    try {
      // For SOL balance
      if (mintAddress === TOKEN_CONFIG.SOL_MINT || mintAddress === 'SOL') {
        const balance = await connection.getBalance(walletPublicKey)
        return {
          mint: 'SOL',
          amount: balance,
          decimals: TOKEN_CONFIG.SOL_DECIMALS,
          uiAmount: balance / Math.pow(10, TOKEN_CONFIG.SOL_DECIMALS)
        }
      }

      // For SPL tokens
      const mintPublicKey = new PublicKey(mintAddress)
      const associatedTokenAccount = await this.getAssociatedTokenAccount(walletPublicKey, mintPublicKey)
      
      try {
        const accountInfo = await connection.getAccountInfo(associatedTokenAccount)
        
        if (!accountInfo) {
          // Account doesn't exist, balance is 0
          return {
            mint: mintAddress,
            amount: 0,
            decimals: TOKEN_CONFIG.PUMP_FUN_DECIMALS,
            uiAmount: 0
          }
        }

        // Parse token account data (layout: 32 bytes mint + 32 bytes owner + 8 bytes amount + rest...)
        const data = accountInfo.data
        if (data.length < 72) {
          throw new Error('Invalid token account data')
        }

        // Amount is stored as little-endian 64-bit integer at offset 64
        const amountBuffer = data.slice(64, 72)
        let amount = 0
        for (let i = 0; i < 8; i++) {
          amount += amountBuffer[i] * Math.pow(256, i)
        }

        return {
          mint: mintAddress,
          amount,
          decimals: TOKEN_CONFIG.PUMP_FUN_DECIMALS,
          uiAmount: amount / Math.pow(10, TOKEN_CONFIG.PUMP_FUN_DECIMALS)
        }
      } catch (accountError) {
        console.error('Failed to get token account info:', accountError)
        return {
          mint: mintAddress,
          amount: 0,
          decimals: TOKEN_CONFIG.PUMP_FUN_DECIMALS,
          uiAmount: 0
        }
      }
    } catch (error) {
      console.error('Failed to get token balance:', error)
      return null
    }
  }

  /**
   * Check if user has sufficient STORK balance for payment
   */
  static async hasExchangeAmountSTORK(
    connection: Connection,
    walletPublicKey: PublicKey,
    requiredSOLAmount: number
  ): Promise<{ hasBalance: boolean; requiredStork: number; currentStork: number }> {
    try {
      const { storkAmount } = await this.calculateSTORKAmount(requiredSOLAmount)
      const storkBalance = await this.getTokenBalance(connection, walletPublicKey, TOKEN_CONFIG.STORK_TOKEN_MINT)
      
      return {
        hasBalance: storkBalance ? storkBalance.uiAmount >= storkAmount : false,
        requiredStork: storkAmount,
        currentStork: storkBalance?.uiAmount || 0
      }
    } catch (error) {
      console.error('Failed to check STORK balance:', error)
      return {
        hasBalance: false,
        requiredStork: 0,
        currentStork: 0
      }
    }
  }

  /**
   * Create Associated Token Account creation instruction
   */
  static createAssociatedTokenAccountInstruction(
    payer: PublicKey,
    associatedToken: PublicKey,
    owner: PublicKey,
    mint: PublicKey
  ): TransactionInstruction {
    const keys: AccountMeta[] = [
      { pubkey: payer, isSigner: true, isWritable: true }, // Funding account
      { pubkey: associatedToken, isSigner: false, isWritable: true }, // Associated token account
      { pubkey: owner, isSigner: false, isWritable: false }, // Wallet address for new account
      { pubkey: mint, isSigner: false, isWritable: false }, // Token mint
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System program
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // SPL Token program
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false } // Sysvar rent
    ]

    return new TransactionInstruction({
      keys,
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      data: Buffer.alloc(0) // No instruction data needed for ATA creation
    })
  }

  /**
   * Create SPL Token transfer instruction using standard layout
   */
  static createTokenTransferInstruction(
    source: PublicKey,
    destination: PublicKey,
    owner: PublicKey,
    amount: number
  ): TransactionInstruction {
    // Standard SPL Token Transfer instruction
    const keys: AccountMeta[] = [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false }
    ]

    // Create instruction data for transfer (instruction 3)
    const dataLayout = Buffer.alloc(9)
    dataLayout[0] = 3 // Transfer instruction
    
    // Write amount as little-endian u64
    const amountBuffer = Buffer.alloc(8)
    amountBuffer.writeBigUInt64LE(BigInt(amount), 0)
    amountBuffer.copy(dataLayout, 1)

    return new TransactionInstruction({
      keys,
      programId: TOKEN_PROGRAM_ID,
      data: dataLayout
    })
  }

  /**
   * Create a transaction to transfer STORK tokens
   */
  static async createSTORKTransferTransaction(
    connection: Connection,
    fromWallet: PublicKey,
    toWallet: PublicKey,
    amount: number
  ): Promise<Transaction> {
    try {
      const mintPublicKey = new PublicKey(TOKEN_CONFIG.STORK_TOKEN_MINT)
      const transaction = new Transaction()

      // Convert UI amount to raw amount (with decimals)
      const rawAmount = amount * Math.pow(10, TOKEN_CONFIG.PUMP_FUN_DECIMALS)

      // Get source and destination associated token accounts
      const sourceAccount = await this.getAssociatedTokenAccount(fromWallet, mintPublicKey)
      const destinationAccount = await this.getAssociatedTokenAccount(toWallet, mintPublicKey)

      // Add transfer instruction only (assume both accounts exist)
      const transferInstruction = this.createTokenTransferInstruction(
        sourceAccount,
        destinationAccount,
        fromWallet, // Owner/signer
        rawAmount
      )
      transaction.add(transferInstruction)

      // Set recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromWallet

      console.log('STORK transfer transaction created:', {
        from: fromWallet.toBase58(),
        to: toWallet.toBase58(),
        amount: amount,
        rawAmount: rawAmount,
        mint: TOKEN_CONFIG.STORK_TOKEN_MINT,
        sourceAccount: sourceAccount.toBase58(),
        destinationAccount: destinationAccount.toBase58()
      })

      return transaction
    } catch (error) {
      console.error('Failed to create STORK transfer transaction:', error)
      throw error
    }
  }

  /**
   * Format token amounts for display
   */
  static formatTokenAmount(amount: number, decimals: number = 6, maxDecimals: number = 4): string {
    if (amount === 0) return '0'
    
    const formatted = (amount / Math.pow(10, decimals)).toFixed(maxDecimals)
    return parseFloat(formatted).toString()
  }

  /**
   * Format price with appropriate decimal places
   */
  static formatPrice(price: number, maxDecimals: number = 6): string {
    if (price >= 1) {
      return price.toFixed(2)
    } else if (price >= 0.01) {
      return price.toFixed(4)
    } else {
      return price.toFixed(maxDecimals)
    }
  }

  /**
   * Clear price cache (useful for testing or force refresh)
   */
  static clearPriceCache(): void {
    this.priceCache = null
  }
}