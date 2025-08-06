---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# NFT Specifications

## Technical NFT Details

Stork SMS creates compressed NFTs (cNFTs) on Solana using the latest Metaplex Bubblegum standard for maximum efficiency and cost-effectiveness.

### NFT Standard

**Metaplex Bubblegum v2 (Compressed NFTs)**
- Built on Solana blockchain for speed and low fees
- Uses Merkle tree compression for storage efficiency
- Fully compatible with major NFT marketplaces and wallets
- Reduced minting costs compared to traditional NFTs

### Collection Information

**Collection Name:** Stork SMS Messages
**Collection Family:** Stork SMS
**Royalty:** 5% (supports platform development)

### NFT Attributes

Each message NFT includes rich metadata:

#### Standard Attributes
- **Message Type**: Chat Message
- **Platform**: Stork SMS  
- **Creation Date**: Date of NFT creation
- **Character Count**: Number of characters in the message
- **Word Count**: Number of words in the message
- **Theme**: Visual theme used (default, or custom)

#### Dynamic Attributes  
- **Sentiment**: Basic sentiment analysis of message content
- **Message Length**: Categorized as Short, Medium, or Long
- **Interaction Type**: Direct message or group message (future)

### Visual Design

#### Sender NFT
- **Style**: Handwritten note aesthetic
- **Background**: Textured paper with authentic feel
- **Branding**: Subtle Stork SMS branding
- **Message Display**: Your message content prominently displayed
- **Customization**: Theme and sticker integration

#### Recipient NFT  
- **Style**: Ticket/voucher design
- **Layout**: Clean, readable format
- **Visual Elements**: Paper texture and decorative edges
- **Message Content**: Same message, different presentation
- **Interactive Elements**: Sticker placement and theme colors

### Technical Specifications

#### Image Properties
- **Format**: PNG with transparency support
- **Dimensions**: 1000x1000 pixels (1:1 aspect ratio)
- **Color Depth**: 32-bit RGBA
- **Compression**: Optimized for web and mobile viewing

#### Metadata Schema
```json
{
  "name": "Stork SMS Message - [Timestamp]",
  "description": "A Web3 message NFT created on Stork SMS",
  "image": "https://r2.storksms.com/nfts/[hash].png",
  "attributes": [
    {
      "trait_type": "Message Type",
      "value": "Chat Message"
    },
    {
      "trait_type": "Platform", 
      "value": "Stork SMS"
    },
    {
      "trait_type": "Creation Date",
      "value": "2025-01-15"
    }
  ],
  "collection": {
    "name": "Stork SMS Messages",
    "family": "Stork SMS"
  }
}
```

### Storage & Hosting

#### Image Storage
- **Primary**: Cloudflare R2 for global CDN delivery
- **Backup**: IPFS pinning for decentralized redundancy  
- **Performance**: Optimized for fast loading worldwide

#### Metadata Storage
- **On-Chain**: Essential data stored directly on Solana
- **Off-Chain**: Rich metadata via decentralized storage
- **Redundancy**: Multiple storage providers for reliability

### Ownership & Transfer

#### Ownership Rights
- **Full Ownership**: Complete control over your NFTs
- **Transfer Rights**: Can be sold, traded, or transferred
- **Marketplace Compatible**: Works with all major NFT platforms
- **Wallet Integration**: Displays in all Solana-compatible wallets

#### Smart Contract Features
- **Immutable Content**: Message content cannot be changed
- **Provable Authenticity**: Blockchain verification of creation
- **Timestamp Proof**: Cryptographic proof of message timing
- **Sender Verification**: Wallet signature proves message origin

### Compatibility

#### Wallet Support
- All Solana-compatible wallets (Phantom, Solflare, etc.)
- Mobile Wallet Adapter (MWA) integration
- Hardware wallet compatibility (Ledger, etc.)

#### Platform Integration  
- **Marketplaces**: Magic Eden, Tensor, OpenSea (Solana)
- **Portfolio Trackers**: Fully compatible with NFT tracking tools
- **Social Platforms**: Displayable as profile pictures and in galleries
- **DeFi**: Can be used as collateral where cNFTs are supported

These specifications ensure your Stork SMS message NFTs are not just functional communication tools, but valuable digital assets with broad compatibility and long-term utility.

