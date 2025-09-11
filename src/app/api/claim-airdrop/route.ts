import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAirdropEligibility } from '@/lib/airdrop-service'
import { AirdropTransactionBuilder } from '@/lib/solana/transaction-builder'
import { TokenTransferService } from '@/lib/solana/token-transfer'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signedTransaction, transactionSignature, action = 'build' } = await request.json()
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if already claimed (double-check to prevent race conditions)
    const { data: existingClaim, error: claimError } = await supabaseServer
      .from('airdrop_claims')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingClaim) {
      return NextResponse.json(
        { 
          error: 'Airdrop already claimed',
          alreadyClaimed: true,
          claimedAt: existingClaim.claimed_at
        },
        { status: 400 }
      )
    }

    if (claimError && claimError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing claim:', claimError)
      return NextResponse.json(
        { error: 'Failed to verify claim status' },
        { status: 500 }
      )
    }

    // Re-verify eligibility using server-side check
    const eligibilityResult = await checkServerAirdropEligibility(walletAddress)
    
    if (!eligibilityResult.isEligible) {
      return NextResponse.json(
        { error: 'Wallet is not eligible for airdrop' },
        { status: 403 }
      )
    }

    // Determine eligibility source for database
    let eligibilitySource = 'manual'
    if (eligibilityResult.reason?.includes('promotional')) {
      eligibilitySource = 'promotional'
    } else if (eligibilityResult.reason?.includes('.skr') || eligibilityResult.reason?.includes('Seeker device')) {
      eligibilitySource = 'skr_domain'
    }

    const claimAmount = parseInt(process.env.AIRDROP_AMOUNT_PER_WALLET || '1000000000')

    // Handle different actions
    if (action === 'build') {
      // Build unsigned transaction for user to sign
      return await buildUnsignedTransaction(walletAddress, claimAmount, eligibilitySource)
    } else if (action === 'submit') {
      // Submit signed transaction and record claim (legacy)
      return await submitSignedTransaction(walletAddress, signedTransaction, claimAmount, eligibilitySource)
    } else if (action === 'record') {
      // Record claim with transaction signature (new approach)
      return await recordTransactionClaim(walletAddress, transactionSignature, claimAmount, eligibilitySource)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "build", "submit", or "record"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing airdrop claim:', error)
    return NextResponse.json(
      { error: 'Failed to process claim' },
      { status: 500 }
    )
  }
}

// Build unsigned transaction for user to sign
async function buildUnsignedTransaction(
  walletAddress: string, 
  claimAmount: number, 
  eligibilitySource: string
) {
  try {
    // Initialize transaction builder
    const transactionBuilder = new AirdropTransactionBuilder({
      publicKey: process.env.AIRDROP_TREASURY_WALLET_PUBLIC!,
      encryptedPrivateKey: process.env.AIRDROP_TREASURY_WALLET_PRIVATE!,
      encryptionKey: process.env.AIRDROP_ENCRYPTION_KEY!,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET!,
      tokenMintAddress: '51Yc9NkkNKMbo31XePni6ZFKMFz4d6H273M8CRhCpump',
      isDryRun: process.env.AIRDROP_DRY_RUN_MODE === 'true',
      amountPerWallet: claimAmount
    })

    await transactionBuilder.initialize()

    // Create a temporary claim ID for tracking
    const claimId = `temp_${Date.now()}_${walletAddress.slice(-8)}`

    // Build the transaction
    const result = await transactionBuilder.buildAirdropTransaction({
      recipientAddress: walletAddress,
      amount: claimAmount,
      claimId
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Serialize the transaction for sending to frontend
    const serializedTransaction = TokenTransferService.serializeTransaction(
      result.unsignedTransaction!.transaction
    )

    return NextResponse.json({
      success: true,
      action: 'sign_required',
      claimId,
      unsignedTransaction: serializedTransaction,
      metadata: result.metadata,
      message: 'Transaction ready for signing'
    })

  } catch (error) {
    console.error('Error building transaction:', error)
    return NextResponse.json(
      { error: 'Failed to build transaction' },
      { status: 500 }
    )
  }
}

// Submit signed transaction and record claim
async function submitSignedTransaction(
  walletAddress: string,
  signedTransaction: string,
  claimAmount: number,
  eligibilitySource: string
) {
  try {
    // Initialize transaction builder for submission
    const transactionBuilder = new AirdropTransactionBuilder({
      publicKey: process.env.AIRDROP_TREASURY_WALLET_PUBLIC!,
      encryptedPrivateKey: process.env.AIRDROP_TREASURY_WALLET_PRIVATE!,
      encryptionKey: process.env.AIRDROP_ENCRYPTION_KEY!,
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET!,
      tokenMintAddress: '51Yc9NkkNKMbo31XePni6ZFKMFz4d6H273M8CRhCpump',
      isDryRun: process.env.AIRDROP_DRY_RUN_MODE === 'true',
      amountPerWallet: claimAmount
    })

    await transactionBuilder.initialize()

    // Submit the signed transaction
    const submitResult = await transactionBuilder.submitSignedTransaction(
      signedTransaction,
      walletAddress,
      claimAmount
    )

    if (!submitResult.success) {
      return NextResponse.json(
        { error: submitResult.error },
        { status: 400 }
      )
    }

    // Record the claim in database
    const { data: claimRecord, error: insertError } = await supabaseServer
      .from('airdrop_claims')
      .insert({
        wallet_address: walletAddress,
        claim_transaction_signature: submitResult.signature!,
        claim_amount: claimAmount,
        eligibility_source: eligibilitySource,
        transaction_status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error recording claim:', insertError)
      
      if (insertError.code === '23505') {
        return NextResponse.json(
          { 
            error: 'Airdrop already claimed',
            alreadyClaimed: true
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to record claim' },
        { status: 500 }
      )
    }

    // Start confirmation process (async) - use legacy approach
    confirmTransactionWithBuilder(
      transactionBuilder,
      submitResult.signature!,
      claimRecord.id
    )

    const explorerUrl = AirdropTransactionBuilder.getExplorerUrl(
      submitResult.signature!,
      process.env.AIRDROP_ENABLE_MAINNET === 'true' ? 'mainnet' : 'devnet'
    )

    return NextResponse.json({
      success: true,
      claimId: claimRecord.id,
      transactionSignature: submitResult.signature,
      explorerUrl,
      claimAmount,
      eligibilitySource,
      claimedAt: claimRecord.claimed_at,
      message: 'Airdrop transaction submitted successfully!'
    })

  } catch (error) {
    console.error('Error submitting signed transaction:', error)
    return NextResponse.json(
      { error: 'Failed to submit transaction' },
      { status: 500 }
    )
  }
}

// Legacy function for transaction builder approach
async function confirmTransactionWithBuilder(
  transactionBuilder: AirdropTransactionBuilder,
  signature: string,
  claimId: string
) {
  try {
    // Wait for confirmation (with timeout)
    const confirmed = await Promise.race([
      transactionBuilder.confirmTransaction(signature),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
      )
    ])

    // Update database with confirmation status
    await supabaseServer
      .from('airdrop_claims')
      .update({
        transaction_status: confirmed ? 'confirmed' : 'failed',
        confirmed_at: confirmed ? new Date().toISOString() : null
      })
      .eq('id', claimId)

    console.log(`Transaction ${signature} ${confirmed ? 'confirmed' : 'failed'}`)

  } catch (error) {
    console.error('Error confirming transaction:', error)
    
    // Mark as failed in database
    await supabaseServer
      .from('airdrop_claims')
      .update({
        transaction_status: 'failed',
        transaction_error: error instanceof Error ? error.message : 'Confirmation failed'
      })
      .eq('id', claimId)
  }
}

// New function for signature-only approach
async function confirmTransactionWithSignature(
  signature: string,
  claimId: string,
  walletAddress: string,
  expectedAmount: number
) {
  try {
    // Create a minimal connection to verify the transaction
    const { Connection } = await import('@solana/web3.js')
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET!, 'confirmed')
    
    console.log('🔍 Confirming transaction:', signature)
    
    // Wait for confirmation (with timeout)
    const confirmed = await Promise.race([
      connection.confirmTransaction(signature, 'confirmed').then(result => !result.value.err),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
      )
    ])

    // Update database with confirmation status
    await supabaseServer
      .from('airdrop_claims')
      .update({
        transaction_status: confirmed ? 'confirmed' : 'failed',
        confirmed_at: confirmed ? new Date().toISOString() : null
      })
      .eq('id', claimId)

    console.log(`Transaction ${signature} ${confirmed ? 'confirmed' : 'failed'}`)

  } catch (error) {
    console.error('Error confirming transaction:', error)
    
    // Mark as failed in database
    await supabaseServer
      .from('airdrop_claims')
      .update({
        transaction_status: 'failed',
        transaction_error: error instanceof Error ? error.message : 'Confirmation failed'
      })
      .eq('id', claimId)
  }
}

// Record claim with transaction signature (new approach)
async function recordTransactionClaim(
  walletAddress: string,
  transactionSignature: string,
  claimAmount: number,
  eligibilitySource: string
) {
  try {
    if (!transactionSignature) {
      return NextResponse.json(
        { error: 'Transaction signature is required' },
        { status: 400 }
      )
    }

    console.log('📝 Recording claim for transaction:', transactionSignature)

    // Record the claim in database
    const { data: claimRecord, error: insertError } = await supabaseServer
      .from('airdrop_claims')
      .insert({
        wallet_address: walletAddress,
        claim_transaction_signature: transactionSignature,
        claim_amount: claimAmount,
        eligibility_source: eligibilitySource,
        transaction_status: 'submitted' // User already sent the transaction
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error recording claim:', insertError)
      
      if (insertError.code === '23505') {
        return NextResponse.json(
          { 
            error: 'Airdrop already claimed',
            alreadyClaimed: true
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to record claim' },
        { status: 500 }
      )
    }

    // Start confirmation process (async) - verify the transaction on-chain
    confirmTransactionWithSignature(
      transactionSignature,
      claimRecord.id,
      walletAddress,
      claimAmount
    )

    const explorerUrl = AirdropTransactionBuilder.getExplorerUrl(
      transactionSignature,
      process.env.AIRDROP_ENABLE_MAINNET === 'true' ? 'mainnet' : 'devnet'
    )

    return NextResponse.json({
      success: true,
      claimId: claimRecord.id,
      transactionSignature: transactionSignature,
      explorerUrl,
      claimAmount,
      eligibilitySource,
      claimedAt: claimRecord.claimed_at,
      message: 'Airdrop claim recorded successfully!'
    })

  } catch (error) {
    console.error('Error recording transaction claim:', error)
    return NextResponse.json(
      { error: 'Failed to record claim' },
      { status: 500 }
    )
  }
}

// Server-side eligibility checking function
async function checkServerAirdropEligibility(walletAddress: string) {
  try {
    // 1. Check promotional_participants table
    const { data: promotionalData, error: promotionalError } = await supabaseServer
      .from('promotional_participants')
      .select('wallet_address, first_chat_created_at, chat_count')
      .eq('wallet_address', walletAddress)
      .single()

    if (promotionalData) {
      console.log('✅ Found promotional participant:', promotionalData)
      return {
        isEligible: true,
        address: walletAddress,
        reason: `7-Day Developer Updates Campaign Participant (${promotionalData.chat_count} chat${promotionalData.chat_count === 1 ? '' : 's'} created)`
      }
    }

    // 2. Check manual airdrop-eligible-wallets.json
    try {
      const filePath = path.join(process.cwd(), 'public', 'airdrop-eligible-wallets.json')
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const { manualWallets } = JSON.parse(fileContent)
      
      const manualEntry = manualWallets.find((entry: any) => entry.address === walletAddress)
      if (manualEntry) {
        console.log('✅ Found manual whitelist entry:', manualEntry)
        return {
          isEligible: true,
          address: walletAddress,
          reason: `Manually added: ${manualEntry.reason || 'Qualified wallet'}`
        }
      }
    } catch (jsonError) {
      console.warn('Could not load manual whitelist:', jsonError)
    }

    // 3. Use existing airdrop service for .skr domain and other checks
    // This will handle domain resolution and .skr checks
    const clientResult = await checkAirdropEligibility(walletAddress)
    
    return clientResult

  } catch (error) {
    console.error('Server eligibility check error:', error)
    return {
      isEligible: false,
      address: walletAddress,
      reason: 'Error checking eligibility'
    }
  }
}