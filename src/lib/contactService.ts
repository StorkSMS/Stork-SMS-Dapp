import { supabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { 
  UserContact, 
  Contact, 
  CreateUserContactData, 
  UpdateUserContactData 
} from '@/types/contacts'

/**
 * Contact Service - handles all contact-related operations
 * Integrates Supabase database operations with R2 storage for profile pictures
 */

export class ContactService {
  /**
   * Get all contacts for a specific wallet address
   */
  static async getUserContacts(
    walletAddress: string, 
    client: SupabaseClient = supabase
  ): Promise<UserContact[]> {
    try {
      const { data, error } = await client
        .from('user_contacts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('contact_name', { ascending: true })

      if (error) {
        console.error('Error fetching user contacts:', error)
        throw new Error(`Failed to fetch contacts: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserContacts:', error)
      throw error
    }
  }

  /**
   * Create a new contact for a user
   */
  static async createUserContact(
    walletAddress: string,
    contactData: CreateUserContactData,
    client: SupabaseClient = supabase
  ): Promise<UserContact> {
    try {
      // Process profile picture if provided
      let profilePictureUrl: string | null = null
      
      if (contactData.profile_picture) {
        // Generate temporary contact ID for upload (will be replaced with actual ID)
        const tempContactId = `temp_${Date.now()}`
        
        // Dynamically import R2 storage (server-side only)
        const { r2Storage } = await import('@/lib/r2-storage')
        
        // Upload to R2 storage (image should already be processed on client side)
        const uploadResult = await r2Storage.uploadContactAvatar(
          contactData.profile_picture,
          walletAddress,
          tempContactId
        )
        
        profilePictureUrl = uploadResult.publicUrl
      }

      // Insert contact into database
      const { data, error } = await client
        .from('user_contacts')
        .insert({
          wallet_address: walletAddress,
          contact_name: contactData.contact_name.trim(),
          contact_public_address: contactData.contact_public_address.trim(),
          profile_picture_url: profilePictureUrl
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user contact:', error)
        
        // If database insert failed but we uploaded a profile picture, clean up
        if (profilePictureUrl) {
          try {
            // Extract key from URL for cleanup (optional - R2 can handle orphaned files)
            console.log('Contact creation failed, uploaded avatar will remain in R2 storage')
          } catch (cleanupError) {
            console.warn('Failed to clean up uploaded avatar:', cleanupError)
          }
        }
        
        throw new Error(`Failed to create contact: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in createUserContact:', error)
      throw error
    }
  }

  /**
   * Update an existing contact
   */
  static async updateUserContact(
    contactId: string,
    walletAddress: string,
    updateData: UpdateUserContactData,
    client: SupabaseClient = supabase
  ): Promise<UserContact> {
    try {
      // Process profile picture if provided
      let profilePictureUrl: string | undefined
      
      if (updateData.profile_picture) {
        // Dynamically import R2 storage (server-side only)
        const { r2Storage } = await import('@/lib/r2-storage')
        
        // Upload to R2 storage (image should already be processed on client side)
        const uploadResult = await r2Storage.uploadContactAvatar(
          updateData.profile_picture,
          walletAddress,
          contactId
        )
        
        profilePictureUrl = uploadResult.publicUrl
      }

      // Prepare update object
      const updateObject: any = {}
      if (updateData.contact_name) {
        updateObject.contact_name = updateData.contact_name.trim()
      }
      if (updateData.contact_public_address) {
        updateObject.contact_public_address = updateData.contact_public_address.trim()
      }
      if (profilePictureUrl) {
        updateObject.profile_picture_url = profilePictureUrl
      }

      // Update contact in database
      const { data, error } = await client
        .from('user_contacts')
        .update(updateObject)
        .eq('id', contactId)
        .eq('wallet_address', walletAddress) // Additional security check
        .select()
        .single()

      if (error) {
        console.error('Error updating user contact:', error)
        throw new Error(`Failed to update contact: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Error in updateUserContact:', error)
      throw error
    }
  }

  /**
   * Delete a contact
   */
  static async deleteUserContact(
    contactId: string,
    walletAddress: string,
    client: SupabaseClient = supabase
  ): Promise<void> {
    try {
      // First get the contact to check if it has a profile picture to clean up
      const { data: contact } = await client
        .from('user_contacts')
        .select('profile_picture_url')
        .eq('id', contactId)
        .eq('wallet_address', walletAddress)
        .single()

      // Delete from database
      const { error } = await client
        .from('user_contacts')
        .delete()
        .eq('id', contactId)
        .eq('wallet_address', walletAddress) // Additional security check

      if (error) {
        console.error('Error deleting user contact:', error)
        throw new Error(`Failed to delete contact: ${error.message}`)
      }

      // Clean up profile picture from R2 if it exists
      if (contact?.profile_picture_url) {
        try {
          // Dynamically import R2 storage (server-side only)
          const { r2Storage } = await import('@/lib/r2-storage')
          
          // Extract key from URL for cleanup
          const url = new URL(contact.profile_picture_url)
          const key = url.pathname.substring(1) // Remove leading slash
          
          await r2Storage.deleteFile(key)
          console.log(`Cleaned up profile picture: ${key}`)
        } catch (cleanupError) {
          console.warn('Failed to clean up profile picture:', cleanupError)
          // Don't throw here as the main operation (contact deletion) succeeded
        }
      }
    } catch (error) {
      console.error('Error in deleteUserContact:', error)
      throw error
    }
  }

  /**
   * Convert UserContact database record to Contact interface for UI
   */
  static userContactToContact(userContact: UserContact): Contact {
    return {
      id: userContact.id,
      name: userContact.contact_name,
      publicAddress: userContact.contact_public_address,
      pfp: userContact.profile_picture_url || '',
      isUserContact: true,
      createdAt: userContact.created_at,
      updatedAt: userContact.updated_at,
      // No twitterLink for user contacts
    }
  }

  /**
   * Validate Solana address format (basic validation)
   */
  static isValidSolanaAddress(address: string): boolean {
    // Basic Solana address validation
    // Solana addresses are 32-44 characters, base58 encoded
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    return solanaAddressRegex.test(address.trim())
  }

  /**
   * Check if a contact name is valid
   */
  static isValidContactName(name: string): boolean {
    const trimmed = name.trim()
    return trimmed.length >= 1 && trimmed.length <= 100
  }

  /**
   * Check for duplicate contact address for a user
   */
  static async checkDuplicateContact(
    walletAddress: string,
    contactAddress: string,
    excludeContactId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('user_contacts')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('contact_public_address', contactAddress.trim())
      
      // Exclude specific contact ID (for updates)
      if (excludeContactId) {
        query = query.neq('id', excludeContactId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error checking duplicate contact:', error)
        return false // Assume no duplicate on error
      }

      return (data?.length || 0) > 0
    } catch (error) {
      console.error('Error in checkDuplicateContact:', error)
      return false
    }
  }
}

export default ContactService