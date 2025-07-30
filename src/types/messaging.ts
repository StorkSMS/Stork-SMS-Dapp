// Core messaging types
export interface BaseMessage {
  id: string
  chat_id: string
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  encrypted: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
  optimistic?: boolean // Flag to identify optimistic messages
  optimistic_id?: string // Temporary ID for optimistic messages before database confirmation
}

export interface TextMessage extends BaseMessage {
  type: 'text'
}

export interface ImageMessage extends BaseMessage {
  type: 'image'
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
}

export interface FileMessage extends BaseMessage {
  type: 'file'
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
}

export interface SystemMessage extends BaseMessage {
  type: 'system'
}

export interface NFTMessage extends BaseMessage {
  type: 'nft'
  nft_mint_address: string
  nft_image_url: string
  nft_metadata_url: string
  transaction_signature: string
}

export interface StickerMessage extends BaseMessage {
  type: 'sticker'
  sticker_name: string
  sticker_url?: string
  sticker_metadata?: Record<string, any>
}

export interface VoiceMessage extends BaseMessage {
  type: 'voice'
  file_url: string
  file_name: string
  file_size: number
  file_type: 'audio/mp4'
  duration: number // duration in seconds
  expires_at: string // 24 hours after creation
}

export type Message = TextMessage | ImageMessage | FileMessage | SystemMessage | NFTMessage | StickerMessage | VoiceMessage

// Conversation types
export interface Conversation {
  id: string
  participants: string[]
  last_message?: Message
  last_activity: string
  message_count: number
  unread_count?: number
  metadata?: Record<string, any>
}

export interface MessageThread {
  id: string
  participants: string[]
  messages: Message[]
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
}

// Message creation types
export interface CreateTextMessageData {
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  encrypted?: boolean
  metadata?: Record<string, any>
}

export interface CreateNFTMessageData {
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  encrypted?: boolean
  metadata?: Record<string, any>
  nft_theme?: string
  nft_customization?: Record<string, any>
}

export interface CreateFileMessageData {
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
  metadata?: Record<string, any>
}

export interface CreateVoiceMessageData {
  sender_wallet: string
  recipient_wallet: string
  message_content: string
  file_url: string
  file_name: string
  file_size: number
  file_type: 'audio/mp4'
  duration: number
  expires_at: string
  metadata?: Record<string, any>
}

// Message status types
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageWithStatus {
  status: MessageStatus
  delivery_attempts?: number
  error_message?: string
  message: Message
}

// Pagination types
export interface MessagePagination {
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PaginatedMessages {
  messages: Message[]
  pagination: MessagePagination
}

// Real-time messaging types
export interface MessageEvent {
  type: 'message_sent' | 'message_received' | 'message_read' | 'typing_start' | 'typing_stop' | 'presence_update'
  data: Message | { sender_wallet: string; recipient_wallet: string } | PresenceUser
  timestamp: string
}

// Presence and typing indicator types
export interface PresenceUser {
  wallet_address: string
  online: boolean
  typing: boolean
  last_seen: string
  chat_id?: string
}

export interface PresenceState {
  online_users: Set<string>
  typing_users: Set<string>
  presence_data: Record<string, PresenceUser>
}

export interface TypingIndicatorState {
  typing_users: string[]
  is_typing: boolean
}

export interface OnlineStatusState {
  online_users: Set<string>
  user_presence: Record<string, PresenceUser>
}

// Search and filter types
export interface MessageFilter {
  sender_wallet?: string
  recipient_wallet?: string
  message_type?: 'text' | 'image' | 'file' | 'system' | 'sticker' | 'voice'
  encrypted?: boolean
  date_from?: string
  date_to?: string
  search_text?: string
}

export interface MessageSearchResult {
  messages: Message[]
  total: number
  query: string
  filters: MessageFilter
}

// Encryption types
export interface EncryptedMessageData {
  encrypted_content: string
  encryption_method: 'aes256' | 'nacl_box'
  sender_public_key?: string
  recipient_public_key?: string
  nonce?: string
}

// Contact and user types
export interface Contact {
  wallet_address: string
  display_name?: string
  avatar_url?: string
  last_seen?: string
  is_online?: boolean
  metadata?: Record<string, any>
}

export interface UserProfile {
  wallet_address: string
  display_name?: string
  bio?: string
  avatar_url?: string
  preferences: {
    notifications_enabled: boolean
    auto_encrypt_messages: boolean
    nft_theme_preference: string
  }
  created_at: string
  updated_at: string
}