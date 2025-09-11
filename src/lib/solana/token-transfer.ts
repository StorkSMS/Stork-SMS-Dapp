import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { 
  createTransferInstruction, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from '@solana/spl-token'

export interface TransferParams {
  recipientAddress: string
  amount: number
  tokenMintAddress: string
  treasuryTokenAccount: PublicKey
  treasuryPublicKey: PublicKey
  treasuryKeypair?: any // Optional for pre-signing
}

export interface UnsignedTransaction {
  transaction: Transaction
  instructions: TransactionInstruction[]
  requiredSigners: PublicKey[]
  estimatedFee: number
}

export class TokenTransferService {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  /**
   * Build an unsigned transaction for the user to sign
   * This approach ensures the USER pays the network fees, not the treasury
   */
  async buildUnsignedTransferTransaction({
    recipientAddress,
    amount,
    tokenMintAddress,
    treasuryTokenAccount,
    treasuryPublicKey,
    treasuryKeypair
  }: TransferParams): Promise<UnsignedTransaction> {
    const recipientPubkey = new PublicKey(recipientAddress)
    const tokenMint = new PublicKey(tokenMintAddress)

    // Get recipient's associated token account
    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      recipientPubkey
    )

    const instructions: TransactionInstruction[] = []
    
    // Check if recipient token account exists
    let recipientAccountExists = true
    try {
      await getAccount(this.connection, recipientTokenAccount)
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
        recipientAccountExists = false
      } else {
        throw error
      }
    }

    // If recipient token account doesn't exist, add instruction to create it
    // User will pay for this account creation (~0.00203928 SOL)
    if (!recipientAccountExists) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          recipientPubkey, // payer (user pays)
          recipientTokenAccount,
          recipientPubkey, // owner
          tokenMint
        )
      )
    }

    // Add the transfer instruction
    instructions.push(
      createTransferInstruction(
        treasuryTokenAccount, // source
        recipientTokenAccount, // destination
        treasuryPublicKey, // owner (treasury wallet will sign this part)
        BigInt(amount) // amount
      )
    )

    // Create transaction
    const transaction = new Transaction()
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight

    // Add all instructions
    transaction.add(...instructions)

    // Set fee payer to recipient (user pays fees)
    transaction.feePayer = recipientPubkey

    // Pre-sign with treasury if keypair provided (required for multi-sig transactions)
    if (treasuryKeypair) {
      transaction.partialSign(treasuryKeypair)
      console.log('🔑 Treasury pre-signed transaction')
    }

    // Estimate the transaction fee
    const estimatedFee = await this.estimateTransactionFee(transaction)

    return {
      transaction,
      instructions,
      requiredSigners: [recipientPubkey], // User must sign (treasury signs server-side)
      estimatedFee
    }
  }

  /**
   * Estimate transaction fee
   */
  private async estimateTransactionFee(transaction: Transaction): Promise<number> {
    try {
      const message = transaction.compileMessage()
      const fee = await this.connection.getFeeForMessage(message)
      return fee.value || 5000 // Default to 5000 lamports if estimation fails
    } catch (error) {
      console.error('Error estimating transaction fee:', error)
      return 5000 // Default fee
    }
  }

  /**
   * Check if user has enough SOL to pay for transaction fees
   */
  async validateUserCanPayFees(userAddress: string, estimatedFee: number): Promise<boolean> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(userAddress))
      return balance >= estimatedFee
    } catch (error) {
      console.error('Error checking user balance:', error)
      return false
    }
  }

  /**
   * Get user's SOL balance
   */
  async getUserSolBalance(userAddress: string): Promise<number> {
    try {
      return await this.connection.getBalance(new PublicKey(userAddress))
    } catch (error) {
      console.error('Error getting user SOL balance:', error)
      return 0
    }
  }

  /**
   * Format lamports to SOL for display
   */
  static formatSolAmount(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(9)
  }

  /**
   * Serialize transaction for frontend
   */
  static serializeTransaction(transaction: Transaction): string {
    return transaction.serialize({ verifySignatures: false }).toString('base64')
  }

  /**
   * Validate a signed transaction before submission
   */
  async validateSignedTransaction(
    signedTransactionBase64: string,
    expectedRecipient: string,
    expectedAmount: number
  ): Promise<boolean> {
    try {
      const signedTransaction = Transaction.from(Buffer.from(signedTransactionBase64, 'base64'))
      
      // Basic validation - check if transaction is signed
      if (!signedTransaction.signature || signedTransaction.signature.every(sig => sig === 0)) {
        return false
      }

      // Additional validation could include checking the instructions match expected parameters
      return true
    } catch (error) {
      console.error('Error validating signed transaction:', error)
      return false
    }
  }

  /**
   * Add treasury signature to a user-signed transaction
   */
  async addTreasurySignature(
    userSignedTransactionBase64: string,
    treasuryKeypair: any
  ): Promise<string> {
    try {
      const userSignedTransaction = Transaction.from(Buffer.from(userSignedTransactionBase64, 'base64'))
      
      console.log('📝 Adding treasury signature for:', treasuryKeypair.publicKey.toString())
      
      // Add treasury signature (partial sign)
      userSignedTransaction.partialSign(treasuryKeypair)
      
      console.log('✅ Treasury signature added successfully')
      
      // Return the fully signed transaction
      return userSignedTransaction.serialize().toString('base64')
    } catch (error) {
      console.error('Error adding treasury signature:', error)
      throw new Error('Failed to add treasury signature')
    }
  }

  /**
   * Submit signed transaction to the network
   */
  async submitTransaction(signedTransactionBase64: string): Promise<string> {
    try {
      const signedTransaction = Transaction.from(Buffer.from(signedTransactionBase64, 'base64'))
      
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        }
      )

      return signature
    } catch (error) {
      console.error('Error submitting transaction:', error)
      throw new Error('Failed to submit transaction to network')
    }
  }

  /**
   * Confirm transaction on the network
   */
  async confirmTransaction(signature: string): Promise<boolean> {
    try {
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed')
      return !confirmation.value.err
    } catch (error) {
      console.error('Error confirming transaction:', error)
      return false
    }
  }
}