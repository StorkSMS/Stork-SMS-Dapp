import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ContactService from '@/lib/contactService'
import type { 
  UserContact, 
  Contact, 
  CreateUserContactData, 
  UpdateUserContactData,
  ContactManagementState 
} from '@/types/contacts'

/**
 * Hook for managing user contacts
 * Handles CRUD operations and state management
 */
export const useContactManagement = () => {
  const { walletAddress } = useAuth()
  const [state, setState] = useState<ContactManagementState>({
    contacts: [],
    userContacts: [],
    loading: false,
    error: null,
    saving: false
  })

  /**
   * Fetch user contacts from the API
   */
  const fetchUserContacts = useCallback(async () => {
    if (!walletAddress) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await fetch(`/api/contacts?wallet_address=${walletAddress}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch contacts')
      }

      const userContacts: UserContact[] = result.data
      const contacts: Contact[] = userContacts.map(ContactService.userContactToContact)

      setState(prev => ({ 
        ...prev, 
        userContacts, 
        contacts,
        loading: false 
      }))
    } catch (error) {
      console.error('Error fetching user contacts:', error)
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch contacts' 
      }))
    }
  }, [walletAddress])

  /**
   * Add a new contact
   */
  const addContact = useCallback(async (contactData: CreateUserContactData): Promise<Contact | null> => {
    if (!walletAddress) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }))
      return null
    }

    setState(prev => ({ ...prev, saving: true, error: null }))

    try {
      const formData = new FormData()
      formData.append('wallet_address', walletAddress)
      formData.append('contact_name', contactData.contact_name)
      formData.append('contact_public_address', contactData.contact_public_address)
      
      if (contactData.profile_picture) {
        formData.append('profile_picture', contactData.profile_picture)
      }

      const response = await fetch('/api/contacts', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create contact')
      }

      const newUserContact: UserContact = result.data
      const newContact: Contact = ContactService.userContactToContact(newUserContact)

      // Update state with new contact
      setState(prev => ({ 
        ...prev, 
        userContacts: [...prev.userContacts, newUserContact],
        contacts: [...prev.contacts, newContact],
        saving: false 
      }))

      return newContact
    } catch (error) {
      console.error('Error adding contact:', error)
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: error instanceof Error ? error.message : 'Failed to add contact' 
      }))
      return null
    }
  }, [walletAddress])

  /**
   * Update an existing contact
   */
  const updateContact = useCallback(async (
    contactId: string, 
    updateData: UpdateUserContactData
  ): Promise<Contact | null> => {
    if (!walletAddress) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }))
      return null
    }

    setState(prev => ({ ...prev, saving: true, error: null }))

    try {
      const formData = new FormData()
      formData.append('wallet_address', walletAddress)
      
      if (updateData.contact_name) {
        formData.append('contact_name', updateData.contact_name)
      }
      if (updateData.contact_public_address) {
        formData.append('contact_public_address', updateData.contact_public_address)
      }
      if (updateData.profile_picture) {
        formData.append('profile_picture', updateData.profile_picture)
      }

      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update contact')
      }

      const updatedUserContact: UserContact = result.data
      const updatedContact: Contact = ContactService.userContactToContact(updatedUserContact)

      // Update state with updated contact
      setState(prev => ({ 
        ...prev, 
        userContacts: prev.userContacts.map(uc => 
          uc.id === contactId ? updatedUserContact : uc
        ),
        contacts: prev.contacts.map(c => 
          c.id === contactId ? updatedContact : c
        ),
        saving: false 
      }))

      return updatedContact
    } catch (error) {
      console.error('Error updating contact:', error)
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: error instanceof Error ? error.message : 'Failed to update contact' 
      }))
      return null
    }
  }, [walletAddress])

  /**
   * Delete a contact
   */
  const deleteContact = useCallback(async (contactId: string): Promise<boolean> => {
    if (!walletAddress) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }))
      return false
    }

    setState(prev => ({ ...prev, saving: true, error: null }))

    try {
      const response = await fetch(`/api/contacts/${contactId}?wallet_address=${walletAddress}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete contact')
      }

      // Update state by removing the deleted contact
      setState(prev => ({ 
        ...prev, 
        userContacts: prev.userContacts.filter(uc => uc.id !== contactId),
        contacts: prev.contacts.filter(c => c.id !== contactId),
        saving: false 
      }))

      return true
    } catch (error) {
      console.error('Error deleting contact:', error)
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: error instanceof Error ? error.message : 'Failed to delete contact' 
      }))
      return false
    }
  }, [walletAddress])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Validate contact data before submission
   */
  const validateContactData = useCallback((
    contactName: string, 
    contactAddress: string,
    currentWalletAddress?: string
  ): string | null => {
    // Validate contact name
    if (!ContactService.isValidContactName(contactName)) {
      return 'Contact name must be 1-100 characters long'
    }

    // Validate contact address
    if (!ContactService.isValidSolanaAddress(contactAddress)) {
      return 'Invalid Solana address format'
    }

    // Check for self-contact
    const walletToCheck = currentWalletAddress || walletAddress
    if (walletToCheck === contactAddress) {
      return 'Cannot add yourself as a contact'
    }

    return null
  }, [walletAddress])

  /**
   * Check if contact address already exists
   */
  const checkDuplicateAddress = useCallback((
    contactAddress: string, 
    excludeContactId?: string
  ): boolean => {
    return state.contacts.some(contact => 
      contact.publicAddress === contactAddress && 
      contact.id !== excludeContactId
    )
  }, [state.contacts])

  return {
    // State
    ...state,
    
    // Actions
    fetchUserContacts,
    addContact,
    updateContact,
    deleteContact,
    clearError,
    
    // Utilities
    validateContactData,
    checkDuplicateAddress,
    
    // Computed
    hasContacts: state.contacts.length > 0,
    isWalletConnected: !!walletAddress
  }
}

export default useContactManagement