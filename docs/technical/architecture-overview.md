# Architecture Overview

Stork SMS is built on a modern, decentralized architecture that combines Web3 technologies with traditional web application patterns to create a secure, scalable messaging platform.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  React Components  │  Wallet Integration  │  Real-time UI      │
│  shadcn/ui         │  Solana Adapters     │  Message Display   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Next.js API Routes │  Authentication     │  Rate Limiting     │
│  RESTful Endpoints  │  Wallet Verification │  Request Handling  │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Blockchain    │  │    Database     │  │  File Storage   │
│     Layer       │  │     Layer       │  │     Layer       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ Solana Network  │  │ Supabase        │  │ Cloudflare R2   │
│ NFT Operations  │  │ Encrypted Data  │  │ Media Files     │
│ Fee Processing  │  │ Real-time Sync  │  │ Voice Messages  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Core Components

### 1. Frontend Application (Next.js 15)

**Purpose**: User interface and client-side logic for the messaging application.

**Key Technologies**:
- **Next.js 15** with App Router for server-side rendering
- **React 18** for component-based UI
- **TypeScript** for type safety
- **Tailwind CSS** with shadcn/ui for styling
- **Solana Wallet Adapters** for Web3 integration

**Architecture Patterns**:
- Component-based architecture with reusable UI components
- Context providers for global state management (Auth, Wallet)
- Custom hooks for business logic abstraction
- Real-time subscriptions for live messaging

### 2. API Layer (Next.js Server)

**Purpose**: Backend services handling authentication, data processing, and blockchain interactions.

**Key Endpoints**:
```
/api/auth/                  # Wallet-based authentication
├── wallet-signin          # Cryptographic signature verification
└── simple-wallet-signin   # Simplified auth flow

/api/chats/                # Chat management
├── [chatId]/messages      # Message operations
└── [chatId]/mark-read     # Read receipt handling

/api/solana/               # Blockchain operations
├── balance               # Wallet balance queries
├── blockhash            # Transaction preparation
├── nft-verification     # NFT ownership verification
└── transaction          # Transaction submission

/api/create-chat-nft       # NFT creation for new chats
/api/generate-nft-image    # Dynamic NFT image generation
/api/image-upload          # Media file handling
/api/voice-upload          # Voice message processing
```

**Security Features**:
- Rate limiting with `rate-limiter-flexible`
- Wallet signature verification
- Input validation and sanitization
- CORS configuration

### 3. Database Layer (Supabase)

**Purpose**: Encrypted data storage with real-time synchronization capabilities.

**Core Tables**:

#### Chats Table
```sql
CREATE TABLE chats (
    id UUID PRIMARY KEY,
    sender_nft_mint TEXT NOT NULL,      -- NFT mint for sender
    recipient_nft_mint TEXT NOT NULL,   -- NFT mint for recipient
    sender_wallet TEXT NOT NULL,       -- Sender wallet address
    recipient_wallet TEXT NOT NULL,    -- Recipient wallet address
    fee_amount BIGINT DEFAULT 0,       -- Chat creation fee
    fee_transaction_signature TEXT,    -- Payment verification
    created_at TIMESTAMP WITH TIME ZONE
);
```

#### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES chats(id),
    sender_wallet TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,    -- AES-256-GCM encrypted
    encryption_method TEXT DEFAULT 'AES-256-GCM',
    message_type TEXT,                 -- text, image, voice, sticker
    file_url TEXT,                     -- R2 storage URL
    created_at TIMESTAMP WITH TIME ZONE
);
```

#### Chat Participants Table
```sql
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY,
    chat_id UUID REFERENCES chats(id),
    wallet_address TEXT NOT NULL,
    nft_mint_address TEXT NOT NULL,
    nft_ownership_verified BOOLEAN,
    last_read_message_id UUID,
    joined_at TIMESTAMP WITH TIME ZONE
);
```

**Features**:
- Row Level Security (RLS) for data isolation
- Real-time subscriptions for live updates
- Automated timestamp management
- Optimized indexing for performance

### 4. Blockchain Layer (Solana)

**Purpose**: Decentralized ownership verification and payment processing.

**Components**:

#### NFT System
- **Compressed NFTs** using Metaplex Bubblegum for cost efficiency
- **Dual NFT Creation**: Sender and recipient NFTs for each chat
- **Dynamic Metadata**: NFT attributes reflect chat participation
- **Ownership Verification**: On-chain verification of NFT possession

#### Smart Contract Integration
- **Merkle Tree Management**: Efficient compressed NFT storage
- **Collection Management**: Organized NFT collections
- **Fee Processing**: Automated payment collection
- **Access Control**: NFT-based chat permissions

### 5. File Storage Layer (Cloudflare R2)

**Purpose**: Scalable, cost-effective storage for media files.

**Stored Content**:
- **Images**: Optimized and compressed image files
- **Voice Messages**: Compressed audio files
- **NFT Assets**: Generated NFT images and metadata
- **Media Previews**: Thumbnails and previews

**Features**:
- Global CDN distribution
- Automatic compression and optimization
- Secure upload URLs with time-based expiration
- Integration with Next.js API for seamless file handling

## Security Architecture

### 1. Zero-Knowledge Authentication

```
User Wallet → Cryptographic Signature → Server Verification → JWT Token
```

- No passwords or personal information required
- Each request authenticated via wallet signature
- JWT tokens for stateless session management
- Hardware wallet support for enhanced security

### 2. End-to-End Encryption

```
Message → AES-256-GCM Encryption → Database Storage → Decryption → Display
```

**Key Management**:
- Encryption keys derived from wallet addresses
- Client-side encryption/decryption only
- Keys never stored or transmitted
- Perfect forward secrecy (planned enhancement)

### 3. NFT-Based Access Control

```
Chat Access Request → NFT Ownership Check → Blockchain Verification → Access Grant
```

- Immutable access permissions via blockchain
- No central authority can override access
- Transferable chat access through NFT trading
- Transparent verification process

## Data Flow Architecture

### 1. Message Creation Flow

```
1. User Types Message
   ↓
2. Client-Side Encryption (AES-256-GCM)
   ↓
3. API Request with Encrypted Content
   ↓
4. Server Validation & Storage
   ↓
5. Real-time Broadcast to Recipients
   ↓
6. Client-Side Decryption & Display
```

### 2. Chat Creation Flow

```
1. User Initiates Chat
   ↓
2. Fee Payment Processing
   ↓
3. Dual NFT Generation
   ↓
4. Blockchain Transaction Submission
   ↓
5. Database Record Creation
   ↓
6. Chat Available for Messaging
```

### 3. Real-time Communication

```
Database Change → Supabase Real-time → WebSocket → Client Update
```

**Real-time Features**:
- Message delivery notifications
- Typing indicators
- Online status updates
- Read receipt confirmation

## Scalability Considerations

### 1. Database Optimization

- **Indexing Strategy**: Optimized indexes for common query patterns
- **Partitioning**: Chat-based data partitioning for large scale
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Minimized database calls through batching

### 2. Blockchain Efficiency

- **Compressed NFTs**: 99% cost reduction vs traditional NFTs
- **Batch Operations**: Multiple NFT operations in single transaction
- **Fee Optimization**: Intelligent fee calculation and timing
- **RPC Optimization**: Smart RPC endpoint selection and fallbacks

### 3. Media Handling

- **Lazy Loading**: On-demand image and media loading
- **Compression**: Automatic file size optimization
- **CDN Distribution**: Global content delivery
- **Caching Strategy**: Multi-layer caching for performance

## Development & Deployment

### Local Development Environment

```bash
# Database
supabase start

# Application
npm run dev

# Blockchain Testing
solana-test-validator
```

### Production Deployment

- **Frontend**: Netlify with Next.js optimization
- **Database**: Supabase managed PostgreSQL
- **Storage**: Cloudflare R2 with global distribution
- **Monitoring**: Real-time performance and error tracking

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15, React 18, TypeScript | User interface and client logic |
| Styling | Tailwind CSS, shadcn/ui | Component styling and design system |
| Blockchain | Solana, Metaplex, Web3.js | NFT operations and payments |
| Database | Supabase (PostgreSQL) | Encrypted data storage |
| Storage | Cloudflare R2 | Media file storage |
| Authentication | Wallet signatures, JWT | Decentralized authentication |
| Encryption | AES-256-GCM, TweetNaCl | End-to-end message encryption |
| Real-time | Supabase Realtime | Live messaging features |

This architecture ensures Stork SMS remains secure, scalable, and truly decentralized while providing an excellent user experience comparable to traditional messaging applications.

