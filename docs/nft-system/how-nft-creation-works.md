# How NFT Creation Works

Understanding the technical process behind Stork SMS's unique conversation NFT system.

## The NFT Creation Process

### Step 1: Starting a New Conversation

When you initiate a new chat on Stork SMS:

1. **Message Composition**: Write your first message and optionally select a sticker
2. **Recipient Selection**: Enter the recipient's Solana wallet address
3. **Preview Generation**: See a preview of your NFT design
4. **Transaction Confirmation**: Approve the 0.0033 SOL transaction in your wallet

### Step 2: Dual NFT Minting

Once you confirm the transaction, Stork SMS creates two NFTs simultaneously:

#### Sender NFT
- **Visual Design**: Features "You started a conversation with [recipient]"
- **Recipient**: Sent to your wallet address
- **Purpose**: Proves you initiated this conversation
- **Access Rights**: Grants you access to view and send messages

#### Recipient NFT  
- **Visual Design**: Features your actual message content and any selected sticker
- **Recipient**: Sent to the recipient's wallet address
- **Purpose**: Proves they received this conversation invitation
- **Access Rights**: Grants them access to view and reply to messages

### Step 3: Blockchain Recording

Both NFTs are minted as compressed NFTs (cNFTs) on Solana:

- **Network**: Solana blockchain (Mainnet or Devnet)
- **Standard**: Metaplex compressed NFT format
- **Storage**: Metadata stored on distributed storage
- **Verification**: Ownership verified on-chain

## Technical Architecture

### Image Generation

Each NFT features custom-generated artwork:

#### Canvas Specifications
- **Resolution**: 1080x1080 pixels
- **Format**: PNG with transparency support
- **Rendering**: Server-side canvas generation
- **Optimization**: Compressed for fast loading

#### Design Elements
1. **Base Frame**: Theme-specific background design
2. **Message Text**: Your actual message rendered with custom typography
3. **Wallet Identifiers**: Abbreviated sender/recipient addresses
4. **Timestamp**: Conversation creation date
5. **Sticker Overlay**: Optional sticker graphics
6. **Branding**: Subtle Stork SMS branding elements

### Metadata Structure

Each NFT includes comprehensive metadata:

```json
{
  "name": "Stork Message #abc123",
  "symbol": "STORK",
  "description": "A verified message NFT created on Stork SMS",
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
  ],
  "message": {
    "content": "Hello! How are you?",
    "sender": "ABC123...",
    "recipient": "XYZ789...",
    "timestamp": "2025-08-15T10:30:00Z"
  }
}
```

## Access Control Integration

### Ownership Verification

Before showing any chat messages, Stork SMS:

1. **Checks Wallet Connection**: Verifies user's connected wallet
2. **Queries Blockchain**: Checks NFT ownership for the requested chat
3. **Validates Access**: Confirms user owns either the sender or recipient NFT
4. **Grants Access**: Displays encrypted messages if verification passes
5. **Denies Access**: Shows "Access denied" if no NFT ownership found

### Real-Time Monitoring

The system continuously monitors NFT ownership:

- **Transfer Detection**: Notices when NFTs are sold or transferred
- **Access Updates**: Immediately updates chat access permissions
- **New Owner Notification**: Alerts new owners about their chat access
- **Previous Owner Lockout**: Removes access from previous owners

## Cost Breakdown

### Transaction Fees (0.0033 SOL total)

- **NFT Minting**: ~0.0015 SOL for both compressed NFTs
- **Storage Costs**: ~0.0008 SOL for metadata and image storage
- **Network Fees**: ~0.001 SOL for Solana transaction fees

### What's Included

Your one-time payment covers:
- ✅ Two unique NFT designs
- ✅ Permanent blockchain storage
- ✅ Unlimited messaging forever
- ✅ Image and metadata hosting
- ✅ Access control infrastructure

## Security Measures

### NFT Authenticity

Every NFT includes security features:

- **Creator Verification**: All NFTs signed by verified Stork SMS creator account
- **Unique Identifiers**: Each conversation has unique, non-duplicatable NFT pair
- **Blockchain Proof**: Immutable record of creation time and participants
- **Metadata Validation**: Server validates NFT metadata before granting access

### Anti-Fraud Protection

- **Wallet Verification**: Only authentic wallet signatures accepted
- **Duplicate Prevention**: System prevents duplicate NFT creation for same conversation
- **Transaction Validation**: All blockchain transactions verified before processing
- **Rate Limiting**: Prevents spam creation of conversations

## Performance Optimization

### Compressed NFTs

Stork SMS uses Solana's compressed NFT technology:

- **Lower Costs**: Significantly cheaper than regular NFTs
- **Faster Minting**: Batch processing for efficiency
- **Same Security**: Full blockchain verification
- **Scalability**: Can handle millions of conversations

### Caching Strategy

- **NFT Ownership**: Cached for 5 minutes to reduce blockchain queries
- **Metadata**: Cached indefinitely (immutable after creation)
- **Images**: Served from global CDN for fast loading
- **Access Permissions**: Smart caching with real-time invalidation

## Future Enhancements

### Planned Improvements

- **Group NFTs**: Multi-participant conversation NFTs
- **Animated NFTs**: GIF and video support in designs
- **Custom Themes**: User-created visual themes
- **NFT Collections**: Organize conversations into collections
- **Cross-Chain**: Support for Ethereum and other blockchains

### Community Features

- **NFT Marketplace**: Trade valuable conversation NFTs
- **Rarity System**: Special attributes for unique conversations
- **Achievement NFTs**: Special NFTs for platform milestones
- **Creator Tools**: Design your own NFT themes

---

The NFT creation process ensures that every conversation on Stork SMS is truly owned by its participants, creating a new paradigm for digital communication ownership.