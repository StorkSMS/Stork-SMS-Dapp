import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ContactService from '@/lib/contactService'
import type { CreateUserContactData } from '@/types/contacts'

// Create server-side supabase client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Contacts API Routes
 * Handles CRUD operations for user contacts
 */

export async function GET(request: NextRequest) {
  try {
    // Get wallet address from query params
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet_address')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!ContactService.isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    const contacts = await ContactService.getUserContacts(walletAddress, supabaseAdmin)
    
    return NextResponse.json({
      success: true,
      data: contacts
    })

  } catch (error) {
    console.error('Error in GET /api/contacts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch contacts', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data (to handle file uploads)
    const formData = await request.formData()
    
    const walletAddress = formData.get('wallet_address') as string
    const contactName = formData.get('contact_name') as string
    const contactPublicAddress = formData.get('contact_public_address') as string
    const profilePicture = formData.get('profile_picture') as File | null

    // Validate required fields
    if (!walletAddress || !contactName || !contactPublicAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet_address, contact_name, contact_public_address' },
        { status: 400 }
      )
    }

    // Validate wallet addresses
    if (!ContactService.isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    if (!ContactService.isValidSolanaAddress(contactPublicAddress)) {
      return NextResponse.json(
        { error: 'Invalid contact address format' },
        { status: 400 }
      )
    }

    // Validate contact name
    if (!ContactService.isValidContactName(contactName)) {
      return NextResponse.json(
        { error: 'Contact name must be 1-100 characters long' },
        { status: 400 }
      )
    }

    // Check for self-contact
    if (walletAddress === contactPublicAddress) {
      return NextResponse.json(
        { error: 'Cannot add yourself as a contact' },
        { status: 400 }
      )
    }

    // Check for duplicate contact
    const isDuplicate = await ContactService.checkDuplicateContact(
      walletAddress,
      contactPublicAddress
    )
    
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Contact already exists with this address' },
        { status: 409 }
      )
    }

    // Prepare contact data
    const contactData: CreateUserContactData = {
      contact_name: contactName,
      contact_public_address: contactPublicAddress,
      profile_picture: profilePicture || undefined
    }

    // Create the contact
    const newContact = await ContactService.createUserContact(
      walletAddress,
      contactData,
      supabaseAdmin
    )

    return NextResponse.json({
      success: true,
      data: newContact
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/contacts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}