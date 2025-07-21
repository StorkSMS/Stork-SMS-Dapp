import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { companyWallet, connection, companyWalletPublicKey, companyWalletUtils } from './company-wallet'
import { supabase } from './supabase'
import { NFT_CONFIG } from './nft-service'

interface FeeStatsResponse {
  totalFeesCollected: number
  totalTransactions: number
  averageFeeAmount: number
  companyWalletBalance: number
  recentTransactions: any[]
}

interface FeeTransactionRecord {
  id: string
  message_id: string
  sender_wallet: string
  fee_amount_sol: number
  fee_amount_lamports: number
  transaction_signature: string
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
  metadata?: Record<string, any>
}

// Fee management utilities
export class FeeManager {
  /**
   * Record fee transaction in database
   */
  static async recordFeeTransaction(
    messageId: string,
    senderWallet: string,
    feeAmountSOL: number,
    transactionSignature: string,
    status: 'pending' | 'confirmed' | 'failed' = 'pending',
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('fee_transactions')
        .insert({
          id: `fee_${messageId}_${Date.now()}`,
          message_id: messageId,
          sender_wallet: senderWallet,
          fee_amount_sol: feeAmountSOL,
          fee_amount_lamports: Math.floor(feeAmountSOL * LAMPORTS_PER_SOL),
          transaction_signature: transactionSignature,
          status,
          created_at: new Date().toISOString(),
          metadata
        })
        .select('id')
        .single()
      
      if (error) {
        throw new Error(`Failed to record fee transaction: ${error.message}`)
      }
      
      return data.id
    } catch (error) {
      console.error('Error recording fee transaction:', error)
      throw error
    }
  }

  /**
   * Update fee transaction status
   */
  static async updateFeeTransactionStatus(
    transactionId: string,
    status: 'pending' | 'confirmed' | 'failed',
    additionalMetadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('fee_transactions')
        .update({
          status,
          updated_at: new Date().toISOString(),
          metadata: additionalMetadata
        })
        .eq('id', transactionId)
      
      if (error) {
        throw new Error(`Failed to update fee transaction status: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating fee transaction status:', error)
      throw error
    }
  }

  /**
   * Get fee statistics
   */
  static async getFeeStats(): Promise<FeeStatsResponse> {
    try {
      // Get fee transaction stats
      const { data: feeStats, error: feeError } = await supabase
        .from('fee_transactions')
        .select('fee_amount_sol, status, created_at')
        .eq('status', 'confirmed')
      
      if (feeError) {
        throw new Error(`Failed to fetch fee stats: ${feeError.message}`)
      }
      
      // Calculate statistics
      const totalFeesCollected = feeStats.reduce((sum, tx) => sum + tx.fee_amount_sol, 0)
      const totalTransactions = feeStats.length
      const averageFeeAmount = totalTransactions > 0 ? totalFeesCollected / totalTransactions : 0
      
      // Get company wallet balance
      const companyWalletBalance = await companyWalletUtils.getBalance()
      
      // Get recent transactions
      const recentTransactions = await companyWalletUtils.getRecentTransactions(10)
      
      return {
        totalFeesCollected,
        totalTransactions,
        averageFeeAmount,
        companyWalletBalance,
        recentTransactions
      }
    } catch (error) {
      console.error('Error getting fee stats:', error)
      throw error
    }
  }

  /**
   * Process fee collection from user
   */
  static async collectFee(
    senderWallet: string,
    feeAmountSOL: number,
    messageId: string
  ): Promise<string> {
    try {
      // Validate wallet address
      const senderPublicKey = new PublicKey(senderWallet)
      
      // Create fee collection transaction
      const feeAmountLamports = Math.floor(feeAmountSOL * LAMPORTS_PER_SOL)
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: companyWalletPublicKey,
          lamports: feeAmountLamports,
        })
      )
      
      // Note: In a real implementation, this transaction would need to be signed by the user's wallet
      // The frontend would handle the wallet signing and send the signed transaction
      // For now, we'll return a transaction ID that the frontend can use
      
      const transactionId = `fee_${messageId}_${Date.now()}_${Math.random().toString(36).substring(7)}`
      
      // Record the pending fee transaction
      await this.recordFeeTransaction(
        messageId,
        senderWallet,
        feeAmountSOL,
        transactionId,
        'pending',
        {
          fee_percentage: NFT_CONFIG.FEE_PERCENTAGE,
          creation_cost: NFT_CONFIG.CREATION_COST_SOL,
          company_wallet: companyWalletPublicKey.toBase58()
        }
      )
      
      console.log(`Fee collection transaction created for ${feeAmountSOL} SOL from ${senderWallet}`)
      
      return transactionId
      
    } catch (error) {
      console.error('Fee collection error:', error)
      throw new Error(`Failed to process fee collection: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Confirm fee payment (called after user signs transaction)
   */
  static async confirmFeePayment(
    transactionId: string,
    actualTransactionSignature: string
  ): Promise<void> {
    try {
      // Update transaction record with actual signature and confirmed status
      await this.updateFeeTransactionStatus(
        transactionId,
        'confirmed',
        {
          actual_transaction_signature: actualTransactionSignature,
          confirmed_at: new Date().toISOString()
        }
      )
      
      console.log(`Fee payment confirmed: ${actualTransactionSignature}`)
    } catch (error) {
      console.error('Error confirming fee payment:', error)
      throw error
    }
  }
}

export type { FeeStatsResponse, FeeTransactionRecord }