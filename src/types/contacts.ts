export interface Contact {
  id: string
  name: string
  publicAddress: string
  twitterLink: string
  pfp: string
}

export interface ContactsData {
  contacts: Contact[]
}

export interface ContactPickerProps {
  selectedContact: Contact | null
  onContactSelect: (contact: Contact | null) => void
  className?: string
  isOpen?: boolean
  onClose?: () => void
  isDarkMode?: boolean
  triggerRef?: React.RefObject<HTMLButtonElement>
  searchQuery?: string
  highlightedIndex?: number
  contacts?: Contact[]
  loading?: boolean
  error?: boolean
}