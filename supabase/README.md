# Supabase Database Setup for NFT Messaging System

This directory contains the database schema and configuration for the Stork SMS NFT messaging system.

## Database Structure

### Tables

#### 1. `chats`
Stores chat metadata with NFT mint addresses and fee tracking.

**Columns:**
- `id` (UUID): Primary key
- `sender_nft_mint` (TEXT): NFT mint address owned by sender
- `recipient_nft_mint` (TEXT): NFT mint address owned by recipient  
- `sender_wallet` (TEXT): Sender's wallet address
- `recipient_wallet` (TEXT): Recipient's wallet address
- `chat_title` (TEXT): Optional chat title
- `fee_amount` (BIGINT): Fee required in lamports
- `fee_transaction_signature` (TEXT): Solana transaction signature for fee payment
- `fee_paid` (BOOLEAN): Whether fee has been paid
- `created_at` (TIMESTAMP): Chat creation time
- `updated_at` (TIMESTAMP): Last update time
- `is_active` (BOOLEAN): Whether chat is active

**Unique Constraint:** `(sender_nft_mint, recipient_nft_mint)`

#### 2. `messages`
Stores encrypted messages linked to chats.

**Columns:**
- `id` (UUID): Primary key
- `chat_id` (UUID): Foreign key to chats table
- `sender_wallet` (TEXT): Message sender's wallet
- `encrypted_content` (TEXT): AES encrypted message content
- `encryption_method` (TEXT): Encryption algorithm used
- `message_type` (TEXT): Type of message (text, image, file, system)
- `file_url` (TEXT): R2 storage URL for file attachments
- `file_name` (TEXT): Original file name
- `file_size` (BIGINT): File size in bytes
- `file_type` (TEXT): MIME type of file
- `created_at` (TIMESTAMP): Message creation time
- `updated_at` (TIMESTAMP): Last update time
- `is_deleted` (BOOLEAN): Soft delete flag
- `deleted_at` (TIMESTAMP): Deletion timestamp

#### 3. `chat_participants`
Manages wallet addresses with NFT-based access rights.

**Columns:**
- `id` (UUID): Primary key
- `chat_id` (UUID): Foreign key to chats table
- `wallet_address` (TEXT): Participant's wallet address
- `nft_mint_address` (TEXT): NFT mint address for verification
- `role` (TEXT): Participant role (owner, participant, admin)
- `nft_ownership_verified` (BOOLEAN): NFT ownership verification status
- `nft_verification_timestamp` (TIMESTAMP): When NFT was verified
- `last_read_message_id` (UUID): Last message read for unread count
- `last_activity` (TIMESTAMP): Last activity timestamp
- `joined_at` (TIMESTAMP): When participant joined
- `is_active` (BOOLEAN): Whether participant is active

**Unique Constraint:** `(chat_id, wallet_address)`

### Views

#### 1. `live_messages`
Real-time view of messages with chat context for live updates.

#### 2. `chat_summaries`
Summary view of chats with last message and statistics.

### Functions

#### 1. `verify_nft_ownership(wallet_addr TEXT, nft_mint TEXT)`
Verifies if a wallet owns a specific NFT (placeholder for Solana integration).

#### 2. `get_wallet_address()`
Extracts wallet address from JWT authentication token.

#### 3. `get_unread_count(p_chat_id UUID, p_wallet_address TEXT)`
Returns count of unread messages for a user in a specific chat.

#### 4. `mark_messages_read(p_chat_id UUID, p_message_id UUID)`
Marks messages as read up to a specific message ID.

## Row Level Security (RLS)

### Security Model
- Users can only access chats where they own the required NFT
- Message access is restricted to participants of the associated chat
- NFT ownership verification is required for chat participation
- Wallet address authentication via JWT tokens

### Key Policies

#### Chats Table
- **Read**: Users can read chats where they own either NFT or are verified participants
- **Insert**: Users can create chats if they own the sender NFT
- **Update**: Users can update chats where they are the sender

#### Messages Table
- **Read**: Users can read messages from chats they have access to
- **Insert**: Users can create messages in accessible chats
- **Update**: Users can update their own messages

#### Chat Participants Table
- **Read**: Users can read participants of chats they have access to
- **Insert**: Users can create participant records for themselves
- **Update**: Users can update their own participant records

## Real-time Subscriptions

Real-time functionality is enabled for:
- **Messages**: Live message updates within chats
- **Chats**: Chat status changes and new chat notifications
- **Participants**: Participant join/leave events

### Subscription Channels
- `messages:{chatId}`: Real-time messages for a specific chat
- `chats:{walletAddress}`: Chat updates for a specific wallet
- `participants:{chatId}`: Participant changes for a specific chat

## Migration Files

1. `001_create_chats_table.sql`: Creates the chats table with indexes
2. `002_create_messages_table.sql`: Creates the messages table with triggers
3. `003_create_chat_participants_table.sql`: Creates the participants table
4. `004_create_rls_policies.sql`: Sets up Row Level Security policies
5. `005_setup_realtime.sql`: Configures real-time subscriptions and views

## Setup Instructions

1. **Apply Migrations:**
   ```bash
   supabase db reset
   ```

2. **Seed Development Data:**
   ```bash
   supabase db seed
   ```

3. **Generate TypeScript Types:**
   ```bash
   supabase gen types typescript --local > src/types/database.ts
   ```

## Environment Variables

Ensure these variables are set in your `.env` file:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## NFT Verification Integration

The current implementation includes placeholder functions for NFT verification. To integrate with Solana:

1. Replace `verify_nft_ownership()` function with actual Solana RPC calls
2. Implement client-side NFT verification before chat access
3. Update `nft_ownership_verified` flag after successful verification
4. Consider caching verification results for performance

## File Storage Integration

Messages support file attachments stored in Cloudflare R2:
- File URLs are stored in the `file_url` column
- File metadata (name, size, type) is tracked in the messages table
- Integration with R2 credentials from environment variables