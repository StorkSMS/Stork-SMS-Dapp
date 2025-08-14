---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# Privacy Features

Stork SMS is built with privacy-by-design principles, ensuring your personal information remains protected while enabling secure Web3 communication.

## Core Privacy Principles

### Data Minimization
- **Wallet Addresses Only**: No personal information required for registration
- **No Phone Numbers**: Authentication purely through cryptographic signatures
- **Minimal Metadata**: Only essential operational data collected
- **Anonymous by Default**: Pseudonymous identity through wallet addresses

### User Control
- **Data Ownership**: Users control their message data and access rights
- **NFT-Based Access**: Transferable chat permissions via blockchain ownership
- **Message Deletion**: Users can delete their messages from the platform
- **Export Rights**: Full data portability and export capabilities

## Data Collection Practices

### What We Collect

#### Essential Data (Required for Service)
```typescript
// Minimal user data structure
interface UserData {
    wallet_address: string     // Public wallet address (inherently public)
    created_at: string        // Account creation timestamp
    last_active: string       // Last activity for cleanup purposes
}
```

#### Message Data (Encrypted)
```typescript
// Encrypted message storage
interface MessageData {
    id: string                // Unique message identifier
    chat_id: string          // Encrypted chat reference
    encrypted_content: string // AES-256-GCM encrypted message
    sender_wallet: string    // Public sender address
    timestamp: string        // Message timestamp
    message_type: string     // text/image/voice/sticker
    encryption_meta: object  // Encryption method and version
}
```

#### Temporary Media Storage
- **Image Files**: Temporarily stored for optimization and delivery
- **Voice Messages**: Stored for streaming and playback
- **Retention Policy**: Automatic deletion after 30 days of inactivity
- **Access Control**: Only chat participants can access media

### What We DON'T Collect

#### Personal Information
❌ **Real Names**: No name or identity verification required
❌ **Email Addresses**: No email collection or verification
❌ **Phone Numbers**: No phone-based authentication
❌ **Government IDs**: No identity document requirements
❌ **Physical Addresses**: No location or address collection

#### Tracking Data
❌ **Browsing History**: No tracking outside the application
❌ **Device Fingerprinting**: No unique device identification
❌ **Location Data**: No GPS or location tracking
❌ **Cross-Site Tracking**: No third-party tracking scripts
❌ **Behavioral Profiling**: No detailed usage pattern analysis

#### Sensitive Metadata
❌ **Private Keys**: Never transmitted or stored server-side
❌ **Seed Phrases**: No wallet recovery phrase collection
❌ **Transaction History**: No comprehensive transaction tracking
❌ **Contact Lists**: No address book or contact synchronization

## Privacy-Preserving Technologies

### Pseudonymous Identity
```typescript
// Privacy-preserving user identification
class PrivacyPreservingAuth {
    static generateUserIdentifier(walletAddress: string): string {
        // Use wallet address as pseudonymous identifier
        return walletAddress // Public key, inherently pseudonymous
    }
    
    static validateIdentity(walletAddress: string, signature: string): boolean {
        // Verify ownership without revealing private information
        return this.verifySignature(walletAddress, signature)
    }
}
```

### Encrypted Message Storage
- **Client-Side Encryption**: Messages encrypted before transmission
- **Zero-Knowledge Server**: Server cannot decrypt message content
- **Unique Chat Keys**: Each conversation has separate encryption keys
- **Forward Secrecy**: Key rotation prevents historical message compromise

### Minimal Analytics
```typescript
// Privacy-safe analytics
interface SafeAnalytics {
    event_type: 'message_sent' | 'chat_created' | 'login'
    timestamp: string
    wallet_address_hash: string  // Hashed for privacy
    success: boolean
    // No content, recipients, or sensitive data
}
```

## User Privacy Rights

### Right to Access
- **Data Export**: Download all your encrypted messages and data
- **Audit Trail**: Review all authentication and access events
- **NFT Ownership**: Verify your chat access tokens on the blockchain
- **Account History**: Access your account creation and activity logs

### Right to Deletion
```typescript
// User-initiated data deletion
export async function deleteUserData(walletAddress: string) {
    // Delete messages (respects other participants' rights)
    await deleteUserMessages(walletAddress)
    
    // Delete media files
    await deleteUserMedia(walletAddress)
    
    // Clear authentication tokens
    await revokeAllTokens(walletAddress)
    
    // Note: Blockchain data (NFTs, transactions) cannot be deleted
}
```

### Right to Portability
- **Message Export**: Download encrypted messages in standard format
- **NFT Transfer**: Move chat access rights to different wallets
- **Data Migration**: Export data for use in other compatible services
- **Backup Creation**: Generate complete data backups

### Right to Rectification
- **Profile Updates**: Modify any profile information
- **Message Editing**: Edit or delete your own messages
- **Access Control**: Transfer or revoke chat access permissions
- **Consent Management**: Update privacy preferences and consents

## Blockchain Privacy Considerations

### Public Blockchain Data
⚠️ **Important Disclosure**: Some data is permanently stored on the Solana blockchain and cannot be deleted:

#### Publicly Visible Data
- **Wallet Addresses**: All Solana addresses are publicly visible
- **NFT Ownership**: Chat access NFT ownership is public record
- **Transaction History**: Blockchain transactions are permanently public
- **Smart Contract Interactions**: All contract interactions are auditable

#### Privacy Protection on Blockchain
```typescript
// Privacy-preserving blockchain interactions
interface PrivateBlockchainData {
    // Visible on blockchain
    wallet_addresses: string[]
    nft_mint_addresses: string[]
    transaction_signatures: string[]
    
    // NOT visible on blockchain
    message_content: never        // Encrypted off-chain
    personal_information: never   // Not collected
    chat_metadata: never         // Private database only
}
```

## Anonymous Features (Coming Soon)

### Anonymous Messaging
- **Temporary Wallets**: Generate disposable wallet addresses
- **Message Mixing**: Obfuscate message timing and patterns
- **Tor Integration**: Route traffic through privacy networks
- **Stealth Addresses**: One-time use receiving addresses

### Privacy-Enhanced Chat
- **Self-Destructing Messages**: Automatic message deletion
- **Anonymous Group Chat**: Privacy-preserving group messaging
- **Hidden Participants**: Obfuscated participant lists
- **Private NFT Transfers**: Anonymous chat access trading

## Compliance & Regulations

### GDPR Compliance (European Users)
✅ **Lawful Basis**: Legitimate interest for blockchain operations
✅ **Data Minimization**: Only necessary data collected
✅ **Purpose Limitation**: Data used only for stated purposes
✅ **Storage Limitation**: Automatic data retention limits
✅ **User Rights**: Full access, deletion, and portability rights

### CCPA Compliance (California Users)
✅ **Right to Know**: Transparent data collection disclosure
✅ **Right to Delete**: User-initiated data deletion
✅ **Right to Opt-Out**: No personal information sales
✅ **Non-Discrimination**: No service degradation for privacy requests

### Privacy by Design
- **Proactive Measures**: Privacy built into system architecture
- **Default Settings**: Maximum privacy as default configuration
- **End-to-End Protection**: Privacy throughout entire data lifecycle
- **Transparency**: Open-source privacy implementations

## Third-Party Services

### Service Providers
```typescript
// Privacy-compliant service integrations
const serviceProviders = {
    database: {
        provider: 'Supabase',
        dataLocation: 'US/EU regions',
        encryption: 'AES-256 at rest',
        privacy: 'SOC 2 Type II compliant'
    },
    storage: {
        provider: 'Cloudflare R2',
        dataLocation: 'Global CDN',
        encryption: 'TLS in transit, encrypted at rest',
        retention: '30 days maximum'
    },
    blockchain: {
        provider: 'Solana Network',
        dataType: 'Public ledger (NFTs, transactions)',
        privacy: 'Pseudonymous by design',
        deletion: 'Immutable (cannot be deleted)'
    }
}
```

### No Third-Party Tracking
- **No Google Analytics**: No behavioral tracking scripts
- **No Social Media Pixels**: No cross-platform tracking
- **No Ad Networks**: No advertising or retargeting
- **No Data Brokers**: No personal data sales or sharing

## Privacy Monitoring

### Privacy Audit Trail
```sql
-- Privacy-focused logging
CREATE TABLE privacy_audit_log (
    event_type TEXT NOT NULL,           -- 'data_export', 'data_deletion', etc.
    wallet_address_hash TEXT NOT NULL,  -- Hashed for privacy
    request_timestamp TIMESTAMPTZ NOT NULL,
    completion_timestamp TIMESTAMPTZ,
    success BOOLEAN NOT NULL,
    data_types JSONB,                   -- Types of data affected
    user_agent_hash TEXT,               -- Hashed browser info
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Privacy Metrics
- **Data Retention Rates**: Monitor automatic data deletion
- **User Rights Requests**: Track privacy request fulfillment
- **Encryption Coverage**: Verify all sensitive data is encrypted
- **Third-Party Compliance**: Monitor service provider privacy practices

## Privacy Best Practices

### For Users
1. **Wallet Security**: Keep your wallet private keys secure
2. **Address Privacy**: Consider using different wallets for different purposes
3. **Message Awareness**: Remember that message recipients can see content
4. **NFT Privacy**: Understand that NFT ownership is publicly visible
5. **Regular Cleanup**: Periodically delete old messages and media

### For Developers
1. **Privacy by Design**: Build privacy into every feature
2. **Data Minimization**: Collect only absolutely necessary data
3. **Encryption First**: Encrypt all sensitive data
4. **Regular Audits**: Continuously review privacy implementations
5. **User Education**: Clearly communicate privacy features and limitations

## Future Privacy Enhancements

### Planned Features
- **Anonymous Messaging**: Zero-knowledge proof-based anonymous chat
- **Private Groups**: Enhanced privacy for group conversations
- **Decentralized Identity**: Self-sovereign identity integration
- **Privacy Coins**: Support for privacy-focused cryptocurrencies

### Research Areas
- **Zero-Knowledge Proofs**: Advanced cryptographic privacy
- **Homomorphic Encryption**: Computation on encrypted data
- **Secure Multi-Party Computation**: Private group operations
- **Quantum-Resistant Privacy**: Future-proof privacy technologies

Stork SMS is committed to advancing digital privacy while enabling the benefits of Web3 technology. Your privacy is not just a feature – it's a fundamental right we actively protect.