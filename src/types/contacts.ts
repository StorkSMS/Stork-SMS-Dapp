export interface Contact {
  id: string
  name: string
  publicAddress: string
  twitterLink?: string // Optional for user contacts
  pfp: string
  isUserContact?: boolean // Flag to distinguish user vs hardcoded contacts
  createdAt?: string // For user contacts
  updatedAt?: string // For user contacts
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

// New interfaces for user contact management
export interface UserContact {
  id: string
  wallet_address: string
  contact_name: string
  contact_public_address: string
  profile_picture_url?: string
  created_at: string
  updated_at: string
}

export interface CreateUserContactData {
  contact_name: string
  contact_public_address: string
  profile_picture?: File | Blob
}

export interface UpdateUserContactData {
  contact_name?: string
  contact_public_address?: string
  profile_picture?: File | Blob
}

export interface ContactManagementState {
  contacts: Contact[]
  userContacts: UserContact[]
  loading: boolean
  error: string | null
  saving: boolean
}

export interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  onContactAdded: (contact: Contact) => void
  isDarkMode?: boolean
}

export interface ContactManagementModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
}