import { NextRequest, NextResponse } from 'next/server'
import { companyWalletPublicKey, companyWalletUtils } from '@/lib/company-wallet'
import { FeeManager, type FeeStatsResponse, type FeeTransactionRecord } from '@/lib/fee-manager'
import { NFT_CONFIG } from '@/lib/nft-service'

interface FeeCollectionRequest {
  senderWallet: string
  feeAmountSOL: number
  messageId: string
  transactionSignature?: string
}


// API Routes

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'collect': {
        const body: FeeCollectionRequest = await request.json()
        
        if (!body.senderWallet || !body.feeAmountSOL || !body.messageId) {
          return NextResponse.json(
            { error: 'Missing required fields: senderWallet, feeAmountSOL, messageId' },
            { status: 400 }
          )
        }
        
        const transactionId = await FeeManager.collectFee(
          body.senderWallet,
          body.feeAmountSOL,
          body.messageId
        )
        
        return NextResponse.json({
          success: true,
          transactionId,
          message: 'Fee collection transaction created'
        })
      }
      
      case 'confirm': {
        const body = await request.json()
        
        if (!body.transactionId || !body.actualTransactionSignature) {
          return NextResponse.json(
            { error: 'Missing required fields: transactionId, actualTransactionSignature' },
            { status: 400 }
          )
        }
        
        await FeeManager.confirmFeePayment(
          body.transactionId,
          body.actualTransactionSignature
        )
        
        return NextResponse.json({
          success: true,
          message: 'Fee payment confirmed'
        })
      }
      
      case 'record': {
        const body = await request.json()
        
        if (!body.messageId || !body.senderWallet || !body.feeAmountSOL || !body.transactionSignature) {
          return NextResponse.json(
            { error: 'Missing required fields: messageId, senderWallet, feeAmountSOL, transactionSignature' },
            { status: 400 }
          )
        }
        
        const recordId = await FeeManager.recordFeeTransaction(
          body.messageId,
          body.senderWallet,
          body.feeAmountSOL,
          body.transactionSignature,
          body.status || 'confirmed',
          body.metadata || {}
        )
        
        return NextResponse.json({
          success: true,
          recordId,
          message: 'Fee transaction recorded'
        })
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: collect, confirm, record' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Fee management API error:', error)
    
    return NextResponse.json(
      {
        error: 'Fee management operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    switch (action) {
      case 'stats': {
        const stats = await FeeManager.getFeeStats()
        return NextResponse.json(stats)
      }
      
      case 'balance': {
        const balance = await companyWalletUtils.getBalance()
        return NextResponse.json({
          balance,
          walletAddress: companyWalletPublicKey.toBase58(),
          network: 'Solana Devnet'
        })
      }
      
      case 'transactions': {
        const limit = parseInt(searchParams.get('limit') || '10')
        const transactions = await companyWalletUtils.getRecentTransactions(limit)
        return NextResponse.json({
          transactions,
          count: transactions.length,
          walletAddress: companyWalletPublicKey.toBase58()
        })
      }
      
      default: {
        return NextResponse.json({
          message: 'Fee Management API',
          endpoints: {
            'POST ?action=collect': 'Create fee collection transaction',
            'POST ?action=confirm': 'Confirm fee payment',
            'POST ?action=record': 'Record fee transaction',
            'GET ?action=stats': 'Get fee collection statistics',
            'GET ?action=balance': 'Get company wallet balance',
            'GET ?action=transactions': 'Get recent transactions'
          },
          config: {
            nftCreationCost: `${NFT_CONFIG.CREATION_COST_SOL} SOL`,
            feePercentage: `${NFT_CONFIG.FEE_PERCENTAGE * 100}%`,
            companyWallet: companyWalletPublicKey.toBase58(),
            network: 'Solana Devnet'
          }
        })
      }
    }
  } catch (error) {
    console.error('Fee management GET error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}