import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAirdropEligibility } from '@/lib/airdrop-service'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if already claimed
    const { data: existingClaim, error: claimError } = await supabaseServer
      .from('airdrop_claims')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (claimError && claimError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing claim:', claimError)
      return NextResponse.json(
        { error: 'Failed to check claim status' },
        { status: 500 }
      )
    }

    const alreadyClaimed = !!existingClaim

    // Check eligibility from all sources directly on server
    const eligibilityResult = await checkServerAirdropEligibility(walletAddress)

    return NextResponse.json({
      isEligible: eligibilityResult.isEligible,
      alreadyClaimed,
      eligibilitySource: eligibilityResult.reason,
      domain: eligibilityResult.domain || null,
      claimedAt: existingClaim?.claimed_at || null,
      claimAmount: existingClaim?.claim_amount || null
    })

  } catch (error) {
    console.error('Error checking airdrop eligibility:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility' },
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