import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import ContactService from '@/lib/contactService'
import type { UpdateUserContactData } from '@/types/contacts'

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
 * Individual Contact API Routes
 * Handles operations on specific contacts by ID
 */

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PUT(request: NextRequest, context: RouteParams) {
  const params = await context.params
  try {
    const contactId = params.id
    
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Parse form data (to handle file uploads)
    const formData = await request.formData()
    
    const walletAddress = formData.get('wallet_address') as string
    const contactName = formData.get('contact_name') as string | null
    const contactPublicAddress = formData.get('contact_public_address') as string | null
    const profilePicture = formData.get('profile_picture') as File | null

    // Validate wallet address
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!ContactService.isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: UpdateUserContactData = {}
    
    if (contactName) {
      if (!ContactService.isValidContactName(contactName)) {
        return NextResponse.json(
          { error: 'Contact name must be 1-100 characters long' },
          { status: 400 }
        )
      }
      updateData.contact_name = contactName
    }

    if (contactPublicAddress) {
      if (!ContactService.isValidSolanaAddress(contactPublicAddress)) {
        return NextResponse.json(
          { error: 'Invalid contact address format' },
          { status: 400 }
        )
      }

      // Check for self-contact
      if (walletAddress === contactPublicAddress) {
        return NextResponse.json(
          { error: 'Cannot set contact address to your own wallet address' },
          { status: 400 }
        )
      }

      // Check for duplicate contact (excluding current contact)
      const isDuplicate = await ContactService.checkDuplicateContact(
        walletAddress,
        contactPublicAddress,
        contactId // Exclude current contact
      )
      
      if (isDuplicate) {
        return NextResponse.json(
          { error: 'Another contact already exists with this address' },
          { status: 409 }
        )
      }

      updateData.contact_public_address = contactPublicAddress
    }

    if (profilePicture && profilePicture.size > 0) {
      updateData.profile_picture = profilePicture
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update the contact
    const updatedContact = await ContactService.updateUserContact(
      contactId,
      walletAddress,
      updateData,
      supabaseAdmin
    )

    return NextResponse.json({
      success: true,
      data: updatedContact
    })

  } catch (error) {
    console.error('Error in PUT /api/contacts/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const params = await context.params
  try {
    const contactId = params.id
    
    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

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

    // Delete the contact
    await ContactService.deleteUserContact(contactId, walletAddress, supabaseAdmin)

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/contacts/[id]:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}