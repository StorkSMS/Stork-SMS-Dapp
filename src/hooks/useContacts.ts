import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Contact, ContactsData, UserContact } from '@/types/contacts'

// Helper function to convert UserContact to Contact
const userContactToContact = (userContact: UserContact): Contact => {
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

export const useContacts = () => {
  const { walletAddress } = useAuth()
  const [hardcodedContacts, setHardcodedContacts] = useState<Contact[]>([])
  const [userContacts, setUserContacts] = useState<UserContact[]>([])
  const [hardcodedLoading, setHardcodedLoading] = useState(false)
  const [userContactsLoading, setUserContactsLoading] = useState(false)
  const [hardcodedError, setHardcodedError] = useState(false)
  const [userContactsError, setUserContactsError] = useState(false)

  // Load hardcoded contacts
  useEffect(() => {
    const loadHardcodedContacts = async () => {
      if (hardcodedContacts.length > 0) return // Already loaded
      
      setHardcodedLoading(true)
      setHardcodedError(false)
      
      try {
        const response = await fetch('/contacts/contacts.json')
        if (!response.ok) {
          throw new Error(`Failed to load contacts: ${response.status}`)
        }
        
        const contactsData: ContactsData = await response.json()
        // Filter out contacts with empty names or public addresses
        const validContacts = (contactsData.contacts || []).filter(contact => 
          contact.name.trim() !== '' && contact.publicAddress.trim() !== ''
        ).map(contact => ({
          ...contact,
          isUserContact: false // Mark as hardcoded
        }))

        setHardcodedContacts(validContacts)
      } catch (error) {
        console.warn('Failed to load hardcoded contacts:', error)
        setHardcodedError(true)
      } finally {
        setHardcodedLoading(false)
      }
    }

    loadHardcodedContacts()
  }, [hardcodedContacts.length])

  // Load user contacts when wallet is connected
  const loadUserContacts = useCallback(async () => {
    if (!walletAddress) {
      setUserContacts([])
      return
    }
    
    setUserContactsLoading(true)
    setUserContactsError(false)
    
    try {
      console.log('📡 Fetching user contacts for wallet:', walletAddress?.slice(0, 8) + '...')
      const response = await fetch(`/api/contacts?wallet_address=${walletAddress}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch contacts')
      }

      const fetchedUserContacts: UserContact[] = result.data
      console.log('📋 Received user contacts:', fetchedUserContacts.length, 'contacts')
      setUserContacts(fetchedUserContacts)
    } catch (error) {
      console.warn('Failed to load user contacts:', error)
      setUserContactsError(true)
    } finally {
      setUserContactsLoading(false)
    }
  }, [walletAddress])

  // Load user contacts when wallet address changes
  useEffect(() => {
    loadUserContacts()
  }, [loadUserContacts])

  // Merge and sort contacts
  const contacts = useMemo(() => {
    // Convert user contacts to Contact interface
    const convertedUserContacts: Contact[] = userContacts.map(userContactToContact)
    
    // Combine hardcoded and user contacts
    const allContacts = [...hardcodedContacts, ...convertedUserContacts]
    
    // Sort with "Stork Dev" always at the top, then user contacts, then others alphabetically
    const sortedContacts = allContacts.sort((a, b) => {
      // "Stork Dev" always comes first
      if (a.name === 'Stork Dev') return -1
      if (b.name === 'Stork Dev') return 1
      
      // User contacts come before other hardcoded contacts
      if (a.isUserContact && !b.isUserContact) return -1
      if (!a.isUserContact && b.isUserContact) return 1
      
      // Within the same category, sort alphabetically
      return a.name.localeCompare(b.name)
    })
    
    return sortedContacts
  }, [hardcodedContacts, userContacts])

  const filterContacts = useCallback((query: string) => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.publicAddress.toLowerCase().includes(query.toLowerCase())
    )
  }, [contacts])

  // Refresh user contacts (useful after adding/editing)
  const refreshUserContacts = useCallback(() => {
    console.log('🔄 Refreshing user contacts...')
    setUserContactsLoading(true)
    setUserContactsError(false)
    loadUserContacts()
  }, [loadUserContacts])

  // Combined loading and error states
  const loading = hardcodedLoading || userContactsLoading
  const error = hardcodedError && userContactsError // Only error if both fail

  return {
    contacts,
    hardcodedContacts,
    userContacts,
    loading,
    error,
    hardcodedLoading,
    userContactsLoading,
    hardcodedError,
    userContactsError,
    filterContacts,
    refreshUserContacts,
    hasUserContacts: userContacts.length > 0,
    isWalletConnected: !!walletAddress
  }
}