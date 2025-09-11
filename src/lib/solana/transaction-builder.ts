import { Connection } from '@solana/web3.js'
import { TreasuryService, TreasuryConfig } from './treasury-service'
import { TokenTransferService, TransferParams, UnsignedTransaction } from './token-transfer'

export interface AirdropTransactionParams {
  recipientAddress: string
  amount: number
  claimId: string
}

export interface TransactionResult {
  success: boolean
  unsignedTransaction?: UnsignedTransaction
  error?: string
  metadata: {
    claimId: string
    recipientAddress: string
    amount: number
    estimatedFee: number
    tokenMintAddress: string
    timestamp: number
  }
}

export class AirdropTransactionBuilder {
  private treasuryService: TreasuryService
  private transferService: TokenTransferService
  private connection: Connection

  constructor(config: TreasuryConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed')
    this.treasuryService = new TreasuryService(config)
    this.transferService = new TokenTransferService(this.connection)
  }

  /**
   * Initialize the transaction builder
   */
  async initialize(): Promise<void> {
    await this.treasuryService.initializeTreasury()
  }

  /**
   * Build an unsigned airdrop transaction for the user to sign
   */
  async buildAirdropTransaction({
    recipientAddress,
    amount,
    claimId
  }: AirdropTransactionParams): Promise<TransactionResult> {
    const metadata = {
      claimId,
      recipientAddress,
      amount,
      estimatedFee: 0,
      tokenMintAddress: process.env.NEXT_PUBLIC_STORK_TOKEN_MINT!,
      timestamp: Date.now()
    }

    try {
      // Validate transaction parameters
      this.treasuryService.validateTransactionParams(recipientAddress, amount)

      // Check treasury balance
      const hasSufficientBalance = await this.treasuryService.validateSufficientBalance(amount)
      if (!hasSufficientBalance) {
        return {
          success: false,
          error: 'Treasury has insufficient balance',
          metadata
        }
      }

      // Get treasury token account
      const treasuryTokenAccount = await this.treasuryService.getTreasuryTokenAccount()

      // Build unsigned transaction (pre-signed by treasury)
      const treasuryKeypair = this.treasuryService.getTreasuryKeypair()
      const unsignedTransaction = await this.transferService.buildUnsignedTransferTransaction({
        recipientAddress,
        amount,
        tokenMintAddress: metadata.tokenMintAddress,
        treasuryTokenAccount,
        treasuryPublicKey: treasuryKeypair.publicKey,
        treasuryKeypair: treasuryKeypair
      })

      // Update metadata with estimated fee
      metadata.estimatedFee = unsignedTransaction.estimatedFee

      // Check if user can pay fees
      const canPayFees = await this.transferService.validateUserCanPayFees(
        recipientAddress,
        unsignedTransaction.estimatedFee
      )

      if (!canPayFees) {
        const userBalance = await this.transferService.getUserSolBalance(recipientAddress)
        return {
          success: false,
          error: `Insufficient SOL balance. You need ${TokenTransferService.formatSolAmount(unsignedTransaction.estimatedFee)} SOL for transaction fees, but only have ${TokenTransferService.formatSolAmount(userBalance)} SOL.`,
          metadata
        }
      }

      console.log('✅ Airdrop transaction built successfully:', {
        claimId,
        recipient: recipientAddress,
        amount,
        estimatedFee: TokenTransferService.formatSolAmount(unsignedTransaction.estimatedFee)
      })

      return {
        success: true,
        unsignedTransaction,
        metadata
      }

    } catch (error) {
      console.error('❌ Error building airdrop transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata
      }
    }
  }

  /**
   * Validate and submit a signed transaction
   */
  async submitSignedTransaction(
    signedTransactionBase64: string,
    expectedRecipient: string,
    expectedAmount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Validate signed transaction
      const isValid = await this.transferService.validateSignedTransaction(
        signedTransactionBase64,
        expectedRecipient,
        expectedAmount
      )

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid signed transaction'
        }
      }

      // Add treasury signature to the user-signed transaction
      const treasuryKeypair = this.treasuryService.getTreasuryKeypair()
      console.log('🔑 Adding treasury signature to user-signed transaction')
      
      const fullySignedTransaction = await this.transferService.addTreasurySignature(
        signedTransactionBase64,
        treasuryKeypair
      )
      
      console.log('🚀 Fully signed transaction ready for submission')

      // Submit to network
      const signature = await this.transferService.submitTransaction(fullySignedTransaction)

      console.log('✅ Transaction submitted successfully:', signature)

      return {
        success: true,
        signature
      }

    } catch (error) {
      console.error('❌ Error submitting signed transaction:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit transaction'
      }
    }
  }

  /**
   * Confirm a transaction on the network
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    return await this.transferService.confirmTransaction(signature)
  }

  /**
   * Get Solana Explorer URL for a transaction
   */
  static getExplorerUrl(signature: string, network: 'mainnet' | 'devnet' = 'mainnet'): string {
    const cluster = network === 'devnet' ? '?cluster=devnet' : ''
    return `https://explorer.solana.com/tx/${signature}${cluster}`
  }

  /**
   * Get treasury balance in human-readable format
   */
  async getTreasuryBalanceFormatted(): Promise<string> {
    const balance = await this.treasuryService.getTreasuryBalance()
    // STORK token has 6 decimal places
    return (balance / 1_000_000).toLocaleString()
  }

  /**
   * Get connection for external use
   */
  getConnection(): Connection {
    return this.connection
  }
}