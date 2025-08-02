# Stork SMS - Decentralized Messaging on Solana

Welcome to Stork SMS, a revolutionary decentralized messaging platform that combines the privacy and security of blockchain technology with the seamless user experience of modern messaging apps.

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [Security & Authentication](#security--authentication)
5. [NFT System](#nft-system)
6. [Technical Architecture](#technical-architecture)
7. [API Reference](#api-reference)
8. [Up Next - Roadmap](#up-next---roadmap)

---

## Introduction

### What is Stork SMS?

Stork SMS is a decentralized messaging application built on the Solana blockchain that creates unique NFTs for every conversation. Unlike traditional messaging apps, Stork SMS ensures true ownership of your conversations through blockchain technology while maintaining the speed and usability you expect from modern messaging.

### Key Benefits

- **True Ownership**: Every message creates an NFT that you own forever
- **Privacy First**: End-to-end encryption with wallet-based authentication
- **No Central Authority**: Fully decentralized with no single point of failure
- **Cross-Platform**: Works on any device with a web browser
- **Fast & Affordable**: Leveraging Solana's high speed and low transaction costs

### Why Blockchain Messaging?

Traditional messaging apps store your data on centralized servers, giving companies full control over your conversations. Stork SMS changes this paradigm by:

- Storing message ownership on the blockchain
- Using NFTs as access tokens to conversations
- Ensuring only NFT holders can view their messages
- Creating an immutable record of message authenticity

---

## Getting Started

### Prerequisites

To use Stork SMS, you'll need:

1. **A Solana Wallet**: We support Phantom, Solflare, Torus, and Ledger wallets
2. **SOL for Fees**: Small amount of SOL (approximately 0.0033 SOL per conversation)
3. **A Web Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

### Quick Start Guide

1. **Visit the App**: Navigate to [dapp.stork-sms.net](https://dapp.stork-sms.net)
2. **Connect Your Wallet**: Click "Connect Wallet" and select your preferred wallet
3. **Start a New Chat**: Click "New Chat" and enter the recipient's wallet address
4. **Send Your First Message**: Type your message and optionally add a sticker
5. **Confirm Transaction**: Approve the NFT creation transaction in your wallet
6. **Start Messaging**: Your chat is now created and you can exchange messages freely

### Understanding the Interface

The Stork SMS interface consists of:

- **Left Sidebar**: Your active chats and pending invitations
- **Chat Area**: Current conversation with message history
- **Message Input**: Text input with sticker, voice, and image options
- **Status Indicators**: Online status, typing indicators, and read receipts

---

## Features

### Messaging Types

#### Text Messages
- Standard text messaging with full Unicode support
- No character limit on messages
- Automatic link detection with previews
- Markdown formatting support (coming soon)

#### Image Sharing
- Direct image upload from device
- Supported formats: JPG, PNG, GIF, WebP
- Automatic compression and optimization
- Full-resolution viewing in modal
- Progress indicators during upload

#### Voice Messages
- One-touch voice recording
- Real-time duration display
- Waveform visualization during playback
- Playback speed control (coming soon)
- Maximum duration: 5 minutes

#### Sticker Messages
- 9 unique Stork-themed stickers
- Instant sending with visual feedback
- Custom sticker packs (coming soon)
- Sticker suggestions based on text

### Real-Time Features

#### Typing Indicators
- **How it works**: When a user types in the message input, a real-time signal is sent to other participants
- **Duration**: Indicator shows for 3 seconds after last keystroke
- **Visual Feedback**: Animated dots appear below the chat
- **Sound Effect**: Optional typing sound notification
- **Privacy**: Only shown to current chat participants

#### Online Status
- **Real-Time Presence**: Green dot indicates user is currently active
- **Last Seen**: Shows when user was last active (coming soon)
- **Privacy Controls**: Option to hide online status (coming soon)
- **Automatic Updates**: Status updates within 1 second of activity

#### Read Receipts
- **Delivery Confirmation**: Single checkmark when message reaches server
- **Read Confirmation**: Double checkmark when recipient views message
- **Timestamp**: Exact time when message was read
- **Group Behavior**: Shows read status per participant (coming soon)
- **Privacy Option**: Ability to disable read receipts (coming soon)

### Message Status System

Every message goes through several states:

1. **Pending**: Message is being prepared for sending
2. **Sending**: Transaction is being processed
3. **Sent**: Message delivered to blockchain
4. **Delivered**: Message received by recipient's client
5. **Read**: Message viewed by recipient
6. **Failed**: Message failed to send (with retry option)
7. **Encrypted**: Message is end-to-end encrypted

### User Interface Features

#### Message Search (Coming Soon)
- Full-text search across all messages
- Filter by date, sender, or message type
- Search within specific chats
- Export search results

#### Chat Organization
- Automatic sorting by most recent activity
- Unread message indicators
- Pending chat section for new conversations
- Archive functionality (coming soon)
- Pin important chats (coming soon)

#### Notifications
- Browser push notifications (coming soon)
- Custom notification sounds
- Notification preferences per chat
- Do Not Disturb mode (coming soon)

---

## Security & Authentication

### Wallet-Based Authentication

Stork SMS uses a revolutionary authentication system that eliminates passwords entirely:

1. **Wallet Connection**: User connects their Solana wallet
2. **Signature Request**: App requests a signature of a unique message
3. **Cryptographic Verification**: Server verifies the signature using ed25519
4. **JWT Token Generation**: Secure session token created for authenticated requests
5. **Session Management**: Tokens expire after inactivity, requiring re-authentication

### NFT-Based Access Control

The cornerstone of Stork SMS security is NFT-based access control:

- **Dual NFT System**: Each conversation creates two NFTs (sender and recipient)
- **Access Verification**: Every message request checks NFT ownership on-chain
- **Immutable Permissions**: Only NFT holders can ever access the conversation
- **Transfer Support**: Chat access can be transferred by sending the NFT

### End-to-End Encryption

All messages are encrypted using industry-standard algorithms:

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: Unique keys derived from participant wallet addresses
- **Forward Secrecy**: New encryption keys for each session (coming soon)
- **Zero Knowledge**: Server never sees unencrypted message content

### Security Measures

#### Server-Side Security
- Rate limiting on all API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CSRF token validation

#### Client-Side Security
- Content Security Policy (CSP)
- Secure cookie handling
- HTTPS enforcement
- Iframe prevention
- Script injection protection

#### Database Security
- Row Level Security (RLS) policies
- Encrypted data at rest
- Automated backups
- Access logging
- Query performance monitoring

### Privacy Features

- **No Phone Numbers**: Only wallet addresses used for identity
- **No Personal Data**: No collection of personal information
- **Local Storage**: Sensitive data encrypted in browser storage
- **Minimal Metadata**: Only essential data stored on servers
- **Right to Delete**: Full message deletion support (coming soon)

---

## NFT System

### How NFT Creation Works

When you start a new conversation on Stork SMS:

1. **Message Composition**: Write your message and optionally add a sticker
2. **Image Generation**: Server creates unique visual representations
3. **Dual NFT Minting**: Two NFTs are created - one for sender, one for recipient
4. **Blockchain Recording**: NFTs are minted on Solana as compressed NFTs
5. **Access Granted**: NFT ownership enables chat access

### NFT Specifications

#### Visual Design
- **Resolution**: 1080x1080 pixels
- **Format**: PNG with transparency
- **Themes**: 5 unique visual themes
- **Components**: Message text, wallet identifiers, timestamps, stickers

#### Metadata Structure
```json
{
  "name": "Stork Message #abc123",
  "symbol": "STORK",
  "description": "Verified message NFT from Stork SMS",
  "image": "https://r2.stork-sms.net/nft-images/...",
  "attributes": [
    {
      "trait_type": "Message Type",
      "value": "Text"
    },
    {
      "trait_type": "Theme",
      "value": "Default"
    },
    {
      "trait_type": "Character Count",
      "value": "42"
    }
  ]
}
```

### NFT Benefits

- **Proof of Conversation**: Immutable record of chat initiation
- **Access Token**: NFT ownership required to view messages
- **Tradeable**: Can be sold or transferred on NFT marketplaces
- **Collectible**: Unique designs make memorable conversations valuable
- **Integration Ready**: Compatible with all Solana NFT platforms

### Cost Structure

- **Total Cost**: 0.0033 SOL per conversation (both NFTs)
- **Network Fees**: Includes Solana transaction fees
- **No Hidden Costs**: One-time payment, unlimited messages
- **Fee Distribution**: Supports platform development and maintenance

---

## Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React hooks and contexts
- **Blockchain**: @solana/web3.js, @solana/wallet-adapter

#### Backend
- **API**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Cloudflare R2 for media files
- **Hosting**: Netlify with edge functions

#### Blockchain
- **Network**: Solana (Mainnet/Devnet)
- **NFT Standard**: Metaplex Compressed NFTs
- **Programs**: Bubblegum for NFT operations
- **RPC**: Helius for reliable blockchain access

### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Web Client    │────▶│   API Routes    │────▶│    Supabase     │
│   (Next.js)     │     │   (Next.js)     │     │   (Database)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Solana Wallet  │     │  Cloudflare R2  │     │ Realtime Events │
│   (Phantom)     │     │    (Storage)    │     │  (WebSockets)   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Database Schema

#### Core Tables

**chats**
- `id`: UUID primary key
- `sender_nft_mint`: Sender's NFT address
- `recipient_nft_mint`: Recipient's NFT address
- `created_at`: Timestamp
- `last_activity`: Last message timestamp

**messages**
- `id`: UUID primary key
- `chat_id`: Foreign key to chats
- `sender_wallet`: Sender's wallet address
- `encrypted_content`: AES-256 encrypted message
- `message_type`: text/image/voice/sticker/nft
- `created_at`: Timestamp

**chat_participants**
- `chat_id`: Foreign key to chats
- `wallet_address`: Participant's wallet
- `nft_mint`: Participant's NFT for this chat
- `last_read`: Last read message timestamp

### Performance Optimizations

- **Connection Pooling**: Reused database connections
- **Caching Strategy**: Redis caching for NFT verification (coming soon)
- **CDN Integration**: Global edge caching for media
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Automatic format conversion and compression

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/wallet-signin
Authenticate user with wallet signature

**Request Body:**
```json
{
  "walletAddress": "5xYz...",
  "signature": "3abc...",
  "message": "Sign this message..."
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "expiresIn": 86400
}
```

### Messaging Endpoints

#### GET /api/chats
Get all chats for authenticated user

#### POST /api/chats/[chatId]/messages
Send a new message

**Request Body:**
```json
{
  "content": "Hello!",
  "messageType": "text",
  "metadata": {}
}
```

#### GET /api/chats/[chatId]/messages
Get messages for a specific chat

### NFT Endpoints

#### POST /api/create-chat-nft
Create a new chat with NFTs

**Request Body:**
```json
{
  "recipientWallet": "ABC...",
  "messageContent": "Hello!",
  "theme": "default",
  "selectedSticker": "Stork"
}
```

### Media Endpoints

#### POST /api/image-upload
Upload image file

#### POST /api/voice-upload
Upload voice message

### Rate Limits

- **Messages**: 30 requests per minute
- **NFT Creation**: 5 requests per minute
- **Media Upload**: 10 requests per minute
- **General API**: 60 requests per minute

---

## Up Next - Roadmap

### Phase 1: Enhanced Messaging (Q1 2024)

#### SOL & USDC Transfers
- **In-Chat Transfers**: Send SOL and USDC directly within conversations
- **Payment Requests**: Request specific amounts from chat participants
- **Transaction History**: View all transfers within chat context
- **Escrow Support**: Smart contract-based payment holding
- **Payment Splitting**: Split bills and expenses easily

#### Group Messaging
- **Multi-Participant Chats**: Support for 2-100 participants
- **Admin Controls**: Manage participants and permissions
- **Group NFTs**: Special NFT designs for group conversations
- **Mention System**: @ mentions with notifications
- **Group Descriptions**: Customizable group info and avatars

### Phase 2: Gamification & Rewards (Q2 2024)

#### Achievement System
- **Message Milestones**: Rewards for 100, 1000, 10000 messages sent
- **Streak Rewards**: Daily active usage streaks
- **Early Adopter**: Special NFT for first 1000 users
- **Referral Rewards**: Achievements for bringing new users
- **Special Events**: Limited-time achievement opportunities

#### Airdrop Qualification
- **Activity-Based**: Regular usage qualifies for token airdrops
- **Tier System**: Bronze, Silver, Gold, Platinum user levels
- **NFT Holdings**: Bonus multipliers for NFT collectors
- **Staking Rewards**: Lock NFTs for additional benefits
- **Community Participation**: Rewards for feedback and testing

### Phase 3: Advanced Features (Q3 2024)

#### Enhanced Privacy
- **Disappearing Messages**: Self-destructing message timers
- **View-Once Media**: Photos that disappear after viewing
- **Anonymous Mode**: Chat without revealing wallet address
- **Private Groups**: Invitation-only encrypted groups
- **Decoy Messages**: Plausible deniability features

#### Developer Ecosystem
- **API SDK**: JavaScript/Python libraries for developers
- **Webhook Support**: Real-time event notifications
- **Bot Framework**: Create automated chat assistants
- **Plugin System**: Extend functionality with plugins
- **Open Source Components**: Community-driven development

### Phase 4: Mobile & Integration (Q4 2024)

#### Native Mobile Apps
- **iOS App**: Native Swift application
- **Android App**: Native Kotlin application
- **Desktop App**: Electron-based desktop client
- **Wearable Support**: Apple Watch and WearOS apps
- **Offline Mode**: Message queuing when offline

#### Web3 Integrations
- **DeFi Integration**: Swap tokens without leaving chat
- **NFT Galleries**: Showcase NFT collections in profile
- **DAO Voting**: Participate in governance from chat
- **Cross-Chain**: Support for Ethereum and other chains
- **Social Tokens**: Create and trade personal tokens

### Phase 5: Enterprise & Scale (2025)

#### Business Features
- **Business Accounts**: Verified business profiles
- **Customer Support**: Built-in ticketing system
- **Analytics Dashboard**: Message and engagement metrics
- **API Rate Limits**: Higher limits for business use
- **SLA Support**: Guaranteed uptime and support

#### Infrastructure Scale
- **Decentralized Storage**: IPFS integration for media
- **Multi-Region**: Global server deployment
- **Disaster Recovery**: Automated backup systems
- **Load Balancing**: Intelligent traffic routing
- **99.99% Uptime**: Enterprise-grade reliability

### Community Governance

#### DAO Formation
- **Governance Token**: $STORK token for voting rights
- **Proposal System**: Community-driven feature requests
- **Treasury Management**: Decentralized fund allocation
- **Validator Network**: Community-run infrastructure
- **Revenue Sharing**: Token holder rewards

#### Open Development
- **Public Roadmap**: Community input on priorities
- **Bug Bounties**: Rewards for security findings
- **Feature Bounties**: Payments for contributions
- **Documentation**: Community-maintained guides
- **Translation**: Multi-language support

---

## Conclusion

Stork SMS represents the future of messaging - where users truly own their conversations, privacy is guaranteed by cryptography, and the community drives development. Join us in building the decentralized messaging platform of tomorrow.

### Get Involved

- **Discord**: [discord.gg/storksms](https://discord.gg/storksms)
- **Twitter**: [@StorkSMS](https://twitter.com/storksms)
- **GitHub**: [github.com/StorkSMS](https://github.com/StorkSMS)
- **Email**: info@stork-sms.net

### Start Messaging Today

Visit [dapp.stork-sms.net](https://dapp.stork-sms.net) to begin your journey into decentralized messaging.

---

*Last Updated: December 2024*
*Version: 1.0.0*