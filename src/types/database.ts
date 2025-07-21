// Database schema types for Supabase
// Generated types for the NFT messaging system

export interface Database {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          sender_nft_mint: string
          recipient_nft_mint: string
          sender_wallet: string
          recipient_wallet: string
          chat_title: string | null
          fee_amount: number
          fee_transaction_signature: string | null
          fee_paid: boolean
          created_at: string
          updated_at: string
          last_message_at: string | null
          is_active: boolean
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          sender_nft_mint: string
          recipient_nft_mint: string
          sender_wallet: string
          recipient_wallet: string
          chat_title?: string | null
          fee_amount?: number
          fee_transaction_signature?: string | null
          fee_paid?: boolean
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
          is_active?: boolean
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          sender_nft_mint?: string
          recipient_nft_mint?: string
          sender_wallet?: string
          recipient_wallet?: string
          chat_title?: string | null
          fee_amount?: number
          fee_transaction_signature?: string | null
          fee_paid?: boolean
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
          is_active?: boolean
          metadata?: Record<string, any> | null
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_wallet: string
          recipient_wallet: string
          message_content: string
          message_type: 'text' | 'nft'
          nft_mint_address: string | null
          nft_image_url: string | null
          nft_metadata_url: string | null
          transaction_signature: string | null
          created_at: string
          metadata: Record<string, any> | null
        }
        Insert: {
          id?: string
          chat_id: string
          sender_wallet: string
          recipient_wallet: string
          message_content: string
          message_type?: 'text' | 'nft'
          nft_mint_address?: string | null
          nft_image_url?: string | null
          nft_metadata_url?: string | null
          transaction_signature?: string | null
          created_at?: string
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          chat_id?: string
          sender_wallet?: string
          recipient_wallet?: string
          message_content?: string
          message_type?: 'text' | 'nft'
          nft_mint_address?: string | null
          nft_image_url?: string | null
          nft_metadata_url?: string | null
          transaction_signature?: string | null
          created_at?: string
          metadata?: Record<string, any> | null
        }
      }
      fee_transactions: {
        Row: {
          id: string
          message_id: string
          sender_wallet: string
          fee_amount_sol: number
          fee_amount_lamports: number
          transaction_signature: string
          status: 'pending' | 'confirmed' | 'failed'
          created_at: string
          updated_at: string | null
          metadata: Record<string, any> | null
        }
        Insert: {
          id: string
          message_id: string
          sender_wallet: string
          fee_amount_sol: number
          fee_amount_lamports: number
          transaction_signature: string
          status?: 'pending' | 'confirmed' | 'failed'
          created_at?: string
          updated_at?: string | null
          metadata?: Record<string, any> | null
        }
        Update: {
          id?: string
          message_id?: string
          sender_wallet?: string
          fee_amount_sol?: number
          fee_amount_lamports?: number
          transaction_signature?: string
          status?: 'pending' | 'confirmed' | 'failed'
          created_at?: string
          updated_at?: string | null
          metadata?: Record<string, any> | null
        }
      }
      chat_participants: {
        Row: {
          id: string
          chat_id: string
          wallet_address: string
          nft_mint_address: string
          role: 'owner' | 'participant' | 'admin'
          nft_ownership_verified: boolean
          nft_verification_timestamp: string | null
          last_read_message_id: string | null
          last_activity: string
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          chat_id: string
          wallet_address: string
          nft_mint_address: string
          role?: 'owner' | 'participant' | 'admin'
          nft_ownership_verified?: boolean
          nft_verification_timestamp?: string | null
          last_read_message_id?: string | null
          last_activity?: string
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          chat_id?: string
          wallet_address?: string
          nft_mint_address?: string
          role?: 'owner' | 'participant' | 'admin'
          nft_ownership_verified?: boolean
          nft_verification_timestamp?: string | null
          last_read_message_id?: string | null
          last_activity?: string
          joined_at?: string
          is_active?: boolean
        }
      }
    }
    Views: {
      live_messages: {
        Row: {
          id: string
          chat_id: string
          sender_wallet: string
          encrypted_content: string
          message_type: 'text' | 'image' | 'file' | 'system'
          file_url: string | null
          file_name: string | null
          created_at: string
          sender_nft_mint: string
          recipient_nft_mint: string
          chat_title: string | null
        }
      }
      chat_summaries: {
        Row: {
          id: string
          sender_nft_mint: string
          recipient_nft_mint: string
          sender_wallet: string
          recipient_wallet: string
          chat_title: string | null
          fee_paid: boolean
          created_at: string
          updated_at: string
          last_message_content: string
          last_message_at: string
          last_message_sender: string
          message_count: number
        }
      }
    }
    Functions: {
      verify_nft_ownership: {
        Args: {
          wallet_addr: string
          nft_mint: string
        }
        Returns: boolean
      }
      get_wallet_address: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_unread_count: {
        Args: {
          p_chat_id: string
          p_wallet_address: string
        }
        Returns: number
      }
      mark_messages_read: {
        Args: {
          p_chat_id: string
          p_message_id: string
        }
        Returns: void
      }
    }
  }
}

// Helper types for common operations
export type Chat = Database['public']['Tables']['chats']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type FeeTransaction = Database['public']['Tables']['fee_transactions']['Row']
export type ChatParticipant = Database['public']['Tables']['chat_participants']['Row']
export type LiveMessage = Database['public']['Views']['live_messages']['Row']
export type ChatSummary = Database['public']['Views']['chat_summaries']['Row']

export type NewChat = Database['public']['Tables']['chats']['Insert']
export type NewMessage = Database['public']['Tables']['messages']['Insert']
export type NewFeeTransaction = Database['public']['Tables']['fee_transactions']['Insert']
export type NewChatParticipant = Database['public']['Tables']['chat_participants']['Insert']

export type ChatUpdate = Database['public']['Tables']['chats']['Update']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']
export type FeeTransactionUpdate = Database['public']['Tables']['fee_transactions']['Update']
export type ChatParticipantUpdate = Database['public']['Tables']['chat_participants']['Update']

// Utility types for the messaging system
export interface ChatWithParticipants extends Chat {
  participants: ChatParticipant[]
  message_count?: number
  last_message?: Message
}

export interface MessageWithSender extends Message {
  sender_nft_mint?: string
  chat_title?: string
}

export interface UnreadCount {
  chat_id: string
  count: number
}

// Real-time subscription payload types
export interface RealtimePayload<T = any> {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
}

export type MessagePayload = RealtimePayload<Message>
export type ChatPayload = RealtimePayload<Chat>
export type ParticipantPayload = RealtimePayload<ChatParticipant>