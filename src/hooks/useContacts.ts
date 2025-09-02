import { useState, useEffect } from 'react'
import type { Contact, ContactsData } from '@/types/contacts'

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    const loadContacts = async () => {
      if (contacts.length > 0) return // Already loaded
      
      setLoading(true)
      setError(false)
      
      try {
        const response = await fetch('/contacts/contacts.json')
        if (!response.ok) {
          throw new Error(`Failed to load contacts: ${response.status}`)
        }
        
        const contactsData: ContactsData = await response.json()
        // Filter out contacts with empty names or public addresses, then sort alphabetically
        const validContacts = (contactsData.contacts || []).filter(contact => 
          contact.name.trim() !== '' && contact.publicAddress.trim() !== ''
        )
        // Sort with "Stork Dev" always at the top, others alphabetically
        const sortedContacts = validContacts.sort((a, b) => {
          // "Stork Dev" always comes first
          if (a.name === 'Stork Dev') return -1
          if (b.name === 'Stork Dev') return 1
          // All others sorted alphabetically
          return a.name.localeCompare(b.name)
        })
        setContacts(sortedContacts)
      } catch (error) {
        console.warn('Failed to load contacts:', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadContacts()
  }, [contacts.length])

  const filterContacts = (query: string) => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.publicAddress.toLowerCase().includes(query.toLowerCase())
    )
  }

  return {
    contacts,
    loading,
    error,
    filterContacts
  }
}