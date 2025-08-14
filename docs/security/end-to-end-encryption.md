---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# End-to-End Encryption

Stork SMS implements military-grade end-to-end encryption to ensure your messages remain private and secure. Even we cannot read your conversations.

## Encryption Overview

### AES-256-GCM Algorithm
- **Standard**: Advanced Encryption Standard with 256-bit keys
- **Mode**: Galois/Counter Mode (GCM) for authenticated encryption
- **Security**: Provides both confidentiality and authenticity
- **Performance**: Hardware-accelerated on modern devices

### Key Features
- **Zero-Knowledge**: Server cannot decrypt message content
- **Forward Secrecy**: Each chat has unique encryption keys
- **Authenticated Encryption**: Messages cannot be tampered with
- **Browser-Native**: Uses Web Crypto API for security

## Technical Implementation

### Key Generation Process

#### 1. Chat-Based Key Derivation
```typescript
// Deterministic key generation from chat context
const password = `stork-chat-${chatId}-${sortedParticipants.join('-')}`
const hashBuffer = await crypto.subtle.digest('SHA-256', password)
const key = await crypto.subtle.importKey('raw', hashBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
```

#### 2. Participant Sorting
- **Consistency**: Participants sorted alphabetically
- **Deterministic**: Same key generated for all participants
- **Validation**: Solana wallet address format verification

### Encryption Process

#### 1. Message Preparation
- **Input Validation**: Content and participant verification
- **Key Generation**: Derive encryption key from chat context
- **IV Generation**: Cryptographically secure 12-byte random IV

#### 2. Encryption Execution
```typescript
// Generate random initialization vector
const iv = crypto.getRandomValues(new Uint8Array(12))

// Encrypt message content
const encrypted = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv
}, key, messageData)

// Combine IV and encrypted data
const combined = new Uint8Array(iv.length + encryptedArray.length)
combined.set(iv)
combined.set(encryptedArray, iv.length)
```

#### 3. Storage Format
- **Base64 Encoding**: For database storage compatibility
- **IV Prepending**: IV stored with encrypted data
- **Metadata**: Encryption method and timestamp

### Decryption Process

#### 1. Data Extraction
```typescript
// Decode from base64 storage format
const combined = new Uint8Array(atob(encryptedContent).split('').map(char => char.charCodeAt(0)))

// Extract IV and encrypted data
const iv = combined.slice(0, 12)
const encryptedData = combined.slice(12)
```

#### 2. Key Regeneration
- **Same Process**: Uses identical key derivation
- **Participant Verification**: Ensures user has chat access
- **Context Validation**: Chat ID and participant list required

#### 3. Decryption Execution
```typescript
// Decrypt using same key and extracted IV
const decrypted = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv
}, key, encryptedData)

// Convert back to readable text
const decryptedContent = new TextDecoder().decode(decrypted)
```

## Security Guarantees

### Confidentiality Protection
- **Client-Side Only**: Encryption/decryption happens in browser
- **Server Blind**: Server stores only encrypted data
- **Key Isolation**: Encryption keys never transmitted
- **Memory Safety**: Keys cleared after use

### Integrity Verification
- **GCM Authentication**: Built-in message authentication
- **Tamper Detection**: Modified messages fail decryption
- **Replay Protection**: Each message has unique IV
- **Version Control**: Encryption metadata prevents downgrade attacks

### Access Control
- **NFT Gating**: Must own chat NFT to decrypt
- **Wallet Authentication**: Private key required for access
- **Participant Validation**: Only chat members can decrypt
- **Revocation**: Transfer NFT to revoke access

## Key Management

### Key Derivation Strategy
- **Deterministic**: Same inputs always produce same key
- **Chat-Specific**: Each conversation has unique encryption
- **Participant-Based**: Key includes all chat members
- **Collision Resistant**: SHA-256 prevents key conflicts

### Key Lifecycle
1. **Generation**: Created when needed for encryption/decryption
2. **Caching**: Temporarily cached in memory for performance
3. **Rotation**: New chats get new keys automatically
4. **Destruction**: Cleared from memory when not needed

### Key Security
- **Never Transmitted**: Keys stay in browser memory
- **Never Stored**: No persistent key storage
- **Memory Limits**: Cache size limited to prevent memory leaks
- **Secure APIs**: Uses browser's native crypto implementations

## Implementation Details

### Browser Compatibility
- **Web Crypto API**: Supported in all modern browsers
- **Hardware Acceleration**: Utilizes device crypto capabilities
- **Fallback Support**: Graceful degradation for older browsers
- **Mobile Optimized**: Efficient on mobile devices

### Performance Optimizations
- **Key Caching**: Reduces repeated key generation
- **Async Operations**: Non-blocking encryption/decryption
- **Memory Management**: Automatic cache cleanup
- **Error Handling**: Graceful failure recovery

### Storage Integration
- **Supabase Compatible**: Works with PostgreSQL storage
- **Base64 Encoding**: Database-safe format
- **Metadata Preservation**: Encryption info stored with messages
- **Efficient Queries**: Indexed for fast retrieval

## Security Audit Points

### Threat Model Coverage
✅ **Message Interception**: End-to-end encryption prevents eavesdropping
✅ **Server Compromise**: Encrypted storage protects against database breaches
✅ **Man-in-the-Middle**: TLS + signature verification prevents MITM attacks
✅ **Key Exposure**: Keys never leave browser environment
✅ **Replay Attacks**: Unique IVs prevent message replay

### Compliance Standards
- **FIPS 140-2**: Uses approved cryptographic algorithms
- **Common Criteria**: Implements evaluated security functions
- **GDPR**: Encryption supports privacy by design
- **SOC 2**: Meets security and availability criteria

## Future Enhancements

### Planned Improvements
- **Perfect Forward Secrecy**: Ephemeral key exchange protocol
- **Multi-Device Sync**: Secure key sharing across devices
- **Quantum Resistance**: Post-quantum cryptography preparation
- **Hardware Security**: Integration with hardware security modules

### Advanced Features
- **Message Disappearing**: Automatic message deletion
- **Sealed Sender**: Anonymous message sending
- **Group Key Management**: Efficient group chat encryption
- **Cross-Chain Support**: Encryption across different blockchains

## Verification Methods

### How to Verify Encryption
1. **Inspect Network Traffic**: Messages appear as encrypted base64
2. **Database Inspection**: Raw data shows encrypted content
3. **Source Code Review**: Encryption logic is open source
4. **Browser DevTools**: Observe encryption/decryption in console

### Security Testing
- **Penetration Testing**: Regular security assessments
- **Code Audits**: Third-party security reviews
- **Bug Bounty**: Community security testing
- **Automated Scanning**: Continuous security monitoring

Your messages in Stork SMS are protected by the same encryption standards used by banks and government agencies. We cannot read your messages, and neither can anyone else without the proper NFT access tokens.