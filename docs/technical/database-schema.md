# Database Schema

Stork SMS uses Supabase (PostgreSQL) as its primary database with a carefully designed schema that supports NFT-based messaging, end-to-end encryption, and real-time communication features.

## Overview

The database schema is designed with the following principles:
- **Security First**: Row Level Security (RLS) ensures data isolation
- **Performance Optimized**: Strategic indexing for common query patterns
- **Scalability Ready**: Designed to handle millions of users and messages
- **Real-time Enabled**: Optimized for live messaging features
- **Audit Trail**: Complete transaction history and metadata tracking

## Core Tables

### 1. Chats Table

The `chats` table stores metadata for NFT-based conversations between users.

```sql
CREATE TABLE public.chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_nft_mint TEXT NOT NULL,
    recipient_nft_mint TEXT NOT NULL,
    sender_wallet TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    chat_title TEXT,
    fee_amount BIGINT NOT NULL DEFAULT 0,
    fee_transaction_signature TEXT,
    fee_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Prevent duplicate chats between same NFTs
    CONSTRAINT unique_nft_chat UNIQUE(sender_nft_mint, recipient_nft_mint)
);
```

**Key Features**:
- **NFT-Based Identity**: Each chat is tied to specific NFT mint addresses
- **Bidirectional Mapping**: Links sender and recipient NFTs and wallets
- **Fee Tracking**: Tracks chat creation fees and payment status
- **Unique Constraint**: Prevents duplicate chats between the same NFT pair

**Indexes**:
```sql
CREATE INDEX idx_chats_sender_nft ON public.chats(sender_nft_mint);
CREATE INDEX idx_chats_recipient_nft ON public.chats(recipient_nft_mint);
CREATE INDEX idx_chats_sender_wallet ON public.chats(sender_wallet);
CREATE INDEX idx_chats_recipient_wallet ON public.chats(recipient_wallet);
CREATE INDEX idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX idx_chats_active ON public.chats(is_active) WHERE is_active = TRUE;
```

### 2. Messages Table

The `messages` table stores encrypted message content and metadata.

```sql
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_wallet TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    encryption_method TEXT DEFAULT 'AES-256-GCM',
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'sticker', 'file', 'system')),
    file_url TEXT, -- R2 storage URL for media files
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

**Key Features**:
- **End-to-End Encryption**: All content stored encrypted with AES-256-GCM
- **Multi-Media Support**: Handles text, images, voice, stickers, and files
- **File Integration**: Links to Cloudflare R2 storage for media files
- **Soft Deletion**: Messages can be deleted without losing chat history
- **Audit Trail**: Tracks creation and modification timestamps

**Message Types**:
- `text`: Regular text messages
- `image`: Image attachments with file_url reference
- `voice`: Voice messages with audio file reference
- `sticker`: Sticker messages with predefined sticker IDs
- `file`: File attachments with metadata
- `system`: System-generated messages (notifications, etc.)

**Indexes**:
```sql
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_wallet);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_chat_created ON public.messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_not_deleted ON public.messages(is_deleted) WHERE is_deleted = FALSE;
```

### 3. Chat Participants Table

The `chat_participants` table manages user access rights and participation in chats.

```sql
CREATE TABLE public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    nft_mint_address TEXT NOT NULL,
    role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'admin')),
    nft_ownership_verified BOOLEAN DEFAULT FALSE,
    nft_verification_timestamp TIMESTAMP WITH TIME ZONE,
    last_read_message_id UUID REFERENCES public.messages(id),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique participant per chat
    CONSTRAINT unique_chat_participant UNIQUE(chat_id, wallet_address)
);
```

**Key Features**:
- **NFT-Based Access Control**: Links wallet addresses to NFT ownership
- **Role Management**: Supports different permission levels
- **Ownership Verification**: Tracks NFT ownership verification status
- **Read Receipts**: Tracks last read message for unread count calculation
- **Activity Tracking**: Monitors user participation and activity

**Participant Roles**:
- `owner`: Creator of the chat with full permissions
- `participant`: Regular chat member with message permissions
- `admin`: Enhanced permissions for group management (future)

**Indexes**:
```sql
CREATE INDEX idx_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_participants_wallet ON public.chat_participants(wallet_address);
CREATE INDEX idx_participants_nft_mint ON public.chat_participants(nft_mint_address);
CREATE INDEX idx_participants_verified ON public.chat_participants(nft_ownership_verified) WHERE nft_ownership_verified = TRUE;
CREATE INDEX idx_participants_active ON public.chat_participants(is_active) WHERE is_active = TRUE;
```

### 4. Fee Transactions Table

The `fee_transactions` table tracks all fee payments for NFT creation and other services.

```sql
CREATE TABLE fee_transactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    sender_wallet TEXT NOT NULL,
    fee_amount_sol DECIMAL(18,9) NOT NULL,
    fee_amount_lamports BIGINT NOT NULL,
    transaction_signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT fee_transactions_fee_amount_positive CHECK (fee_amount_sol > 0),
    CONSTRAINT fee_transactions_lamports_positive CHECK (fee_amount_lamports > 0)
);
```

**Key Features**:
- **Dual Currency Tracking**: Stores amounts in both SOL and lamports
- **Transaction Status**: Tracks payment confirmation status
- **Blockchain Integration**: Links to Solana transaction signatures
- **Flexible Metadata**: JSONB field for additional transaction data
- **Audit Compliance**: Complete payment history with timestamps

**Fee Transaction Statuses**:
- `pending`: Transaction submitted but not yet confirmed
- `confirmed`: Transaction confirmed on blockchain
- `failed`: Transaction failed or rejected

**Indexes**:
```sql
CREATE INDEX idx_fee_transactions_message_id ON fee_transactions(message_id);
CREATE INDEX idx_fee_transactions_sender_wallet ON fee_transactions(sender_wallet);
CREATE INDEX idx_fee_transactions_status ON fee_transactions(status);
CREATE INDEX idx_fee_transactions_created_at ON fee_transactions(created_at DESC);
CREATE INDEX idx_fee_transactions_transaction_signature ON fee_transactions(transaction_signature);
CREATE INDEX idx_fee_transactions_sender_status_date ON fee_transactions(sender_wallet, status, created_at DESC);
```

## Security Implementation

### Row Level Security (RLS)

All tables implement Row Level Security to ensure users can only access their own data.

#### Chats RLS Policies
```sql
-- Users can only see chats where they own one of the NFTs
CREATE POLICY "Users can view their own chats" ON chats
    FOR SELECT
    USING (sender_wallet = current_setting('wallet.address', true) 
           OR recipient_wallet = current_setting('wallet.address', true));

-- Users can create chats if they own the sender NFT
CREATE POLICY "Users can create chats" ON chats
    FOR INSERT
    WITH CHECK (sender_wallet = current_setting('wallet.address', true));
```

#### Messages RLS Policies
```sql
-- Users can only see messages in chats they participate in
CREATE POLICY "Users can view messages in their chats" ON messages
    FOR SELECT
    USING (chat_id IN (
        SELECT id FROM chats 
        WHERE sender_wallet = current_setting('wallet.address', true)
           OR recipient_wallet = current_setting('wallet.address', true)
    ));

-- Users can only send messages in chats they participate in
CREATE POLICY "Users can send messages in their chats" ON messages
    FOR INSERT
    WITH CHECK (sender_wallet = current_setting('wallet.address', true));
```

#### Chat Participants RLS Policies
```sql
-- Users can view participant information for chats they're in
CREATE POLICY "Users can view chat participants" ON chat_participants
    FOR SELECT
    USING (chat_id IN (
        SELECT id FROM chats 
        WHERE sender_wallet = current_setting('wallet.address', true)
           OR recipient_wallet = current_setting('wallet.address', true)
    ));
```

#### Fee Transactions RLS Policies
```sql
-- Users can only view their own fee transactions
CREATE POLICY "Users can view their own fee transactions" ON fee_transactions
    FOR SELECT
    USING (sender_wallet = current_setting('wallet.address', true));
```

### Authentication Context

The RLS policies rely on the `wallet.address` setting being properly configured during authentication:

```sql
-- Set during authentication
SELECT set_config('wallet.address', 'user_wallet_address', true);
```

## Database Functions & Triggers

### Automatic Timestamp Updates

All tables with `updated_at` columns use triggers for automatic timestamp management:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applied to relevant tables
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON public.messages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Activity Tracking

Chat participants have automatic activity tracking:

```sql
CREATE OR REPLACE FUNCTION update_participant_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_participants_activity 
    BEFORE UPDATE ON public.chat_participants 
    FOR EACH ROW 
    EXECUTE FUNCTION update_participant_activity();
```

## Real-time Subscriptions

### Message Subscriptions

Clients subscribe to real-time message updates:

```sql
-- Enable real-time for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Client subscription (JavaScript)
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => handleNewMessage(payload.new)
  )
  .subscribe();
```

### Chat Status Updates

Real-time updates for chat activity and participant changes:

```sql
-- Enable real-time for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
```

## Query Patterns & Optimization

### Common Query Patterns

#### Get User's Chats with Last Message
```sql
SELECT 
    c.*,
    m.encrypted_content as last_message,
    m.created_at as last_message_time,
    m.sender_wallet as last_message_sender
FROM chats c
LEFT JOIN LATERAL (
    SELECT encrypted_content, created_at, sender_wallet
    FROM messages 
    WHERE chat_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
) m ON true
WHERE c.sender_wallet = $1 OR c.recipient_wallet = $1
ORDER BY COALESCE(m.created_at, c.created_at) DESC;
```

#### Get Messages for Chat with Pagination
```sql
SELECT * FROM messages 
WHERE chat_id = $1 
  AND is_deleted = FALSE
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```

#### Get Unread Message Count
```sql
SELECT COUNT(*) FROM messages m
JOIN chat_participants cp ON m.chat_id = cp.chat_id
WHERE cp.wallet_address = $1
  AND cp.chat_id = $2
  AND m.created_at > COALESCE(
    (SELECT created_at FROM messages WHERE id = cp.last_read_message_id),
    cp.joined_at
  );
```

### Performance Considerations

#### Index Usage
- All foreign keys are indexed for efficient JOINs
- Composite indexes for common WHERE clause combinations
- Partial indexes for filtered queries (e.g., active records only)

#### Query Optimization
- Use LATERAL JOINs for correlated subqueries
- Implement proper LIMIT/OFFSET for pagination
- Use covering indexes where beneficial

## Backup & Recovery

### Automated Backups
- **Point-in-time Recovery**: Enabled with 7-day retention
- **Daily Snapshots**: Automated full database backups
- **Transaction Log Backup**: Continuous WAL archiving

### Data Retention
- **Messages**: Retained indefinitely unless explicitly deleted
- **Fee Transactions**: Retained permanently for audit compliance
- **Activity Logs**: Participant activity retained for 1 year

## Migration Strategy

### Schema Versioning
All schema changes are managed through numbered migration files:

```
001_create_chats_table.sql
002_create_messages_table.sql
003_create_chat_participants_table.sql
004_create_rls_policies.sql
005_setup_realtime.sql
006_create_fee_transactions_table.sql
...
```

### Migration Best Practices
- **Backward Compatibility**: Migrations never break existing functionality
- **Rollback Strategy**: Each migration includes rollback procedures
- **Testing**: All migrations tested on staging before production
- **Monitoring**: Database performance monitored during migrations

## Monitoring & Metrics

### Key Metrics
- **Query Performance**: Average response times per table
- **Connection Pool**: Active connections and wait times
- **Storage Growth**: Table sizes and growth rates
- **Index Usage**: Index hit ratios and unused indexes

### Alerting
- Database connection failures
- Slow query detection (>1s)
- Disk space thresholds
- Unusual error rates

This schema design provides a solid foundation for Stork SMS to scale while maintaining security, performance, and data integrity across all operations.

