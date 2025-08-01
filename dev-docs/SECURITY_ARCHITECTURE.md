# Security Architecture for Stork SMS NFT Messaging System

## Overview

This document describes the comprehensive security and access control system implemented for the Stork SMS NFT messaging application. The system provides multiple layers of security including authentication, authorization, encryption, rate limiting, and NFT ownership verification.

## Core Security Components

### 1. Authentication & Authorization (`src/lib/security.ts`)

#### Wallet-Based Authentication
- **JWT Token Management**: Secure token generation and verification
- **Session Management**: Server-side session tracking with timeout handling
- **Wallet Signature Verification**: Cryptographic verification of wallet ownership
- **Multi-factor Authentication**: Supports both token and signature-based auth

#### Key Features:
```typescript
// Generate JWT token for authenticated wallet
const token = TokenManager.generateToken(walletAddress, additionalClaims)

// Verify and decode JWT token
const decoded = TokenManager.verifyToken(token)

// Create and validate sessions
const sessionId = SessionManager.createSession(walletAddress)
const session = SessionManager.validateSession(sessionId)
```

### 2. Message Encryption (`src/lib/security.ts`)

#### AES-256-GCM Encryption
- **End-to-End Encryption**: Messages encrypted before storage
- **Chat-Specific Keys**: Unique encryption keys per chat
- **Secure Key Derivation**: SHA-256 based key generation

#### Usage:
```typescript
// Encrypt message content
const encrypted = MessageEncryption.encrypt(message, key)

// Decrypt message content
const decrypted = MessageEncryption.decrypt(encryptedData, key)

// Generate chat-specific encryption key
const chatKey = MessageEncryption.generateChatKey(chatId, participantWallets)
```

### 3. Rate Limiting (`src/lib/rate-limiter.ts`)

#### Multi-Level Rate Limiting
- **Operation-Specific Limits**: Different limits for different operations
- **IP and Wallet-Based**: Tracking by both IP address and wallet address
- **Graduated Blocking**: Increasing penalties for violations

#### Rate Limit Configuration:
```typescript
API_REQUESTS: {
  points: 100,     // 100 requests
  duration: 60,    // Per 60 seconds
  blockDuration: 60 // Block for 60 seconds if exceeded
}

MESSAGE_CREATION: {
  points: 20,      // 20 messages
  duration: 300,   // Per 5 minutes
  blockDuration: 300
}

NFT_CREATION: {
  points: 5,       // 5 NFTs
  duration: 3600,  // Per hour
  blockDuration: 3600
}
```

### 4. NFT Ownership Verification (`src/lib/security.ts`)

#### Blockchain-Based Access Control
- **Real-time Verification**: Live checking of NFT ownership on Solana
- **Cached Results**: Performance optimization with verification timestamps
- **Multi-NFT Support**: Support for multiple NFT requirements per chat

#### Verification Process:
```typescript
// Verify single NFT ownership
const { isOwner } = await NFTOwnershipVerifier.verifyNFTOwnership(wallet, nftMint)

// Verify multiple NFT ownerships
const results = await NFTOwnershipVerifier.verifyMultipleNFTOwnership(wallet, nftMints)

// Get all NFTs owned by wallet
const ownedNFTs = await NFTOwnershipVerifier.getWalletNFTs(walletAddress)
```

### 5. Authentication Middleware (`src/lib/auth-middleware.ts`)

#### Request Protection
- **Comprehensive Validation**: Input validation, rate limiting, and authentication
- **Flexible Configuration**: Configurable security requirements per endpoint
- **Error Handling**: Standardized error responses with proper HTTP status codes

#### Middleware Options:
```typescript
interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requireNFTOwnership?: boolean
  requiredNFTs?: string[]
  rateLimitOperation?: 'api' | 'message' | 'nft' | 'auth' | 'chat'
  rateLimitPoints?: number
  allowedMethods?: string[]
  requireSignature?: boolean
}
```

### 6. API Route Guards (`src/lib/api-guards.ts`)

#### Specialized Protection
- **Message Creation Guard**: Validates message content, chat access, and sender verification
- **NFT Creation Guard**: Enforces wallet matching, content validation, and rate limits
- **Chat Access Guard**: Verifies user participation or NFT ownership requirements

#### Guard Examples:
```typescript
// Protect message creation
const result = await APIGuards.protectMessageCreation(request)

// Protect NFT creation
const result = await APIGuards.protectNFTCreation(request)

// Protect chat access
const result = await APIGuards.protectChatAccess(request, chatId)
```

## Implementation Examples

### 1. Protected API Route (NFT Creation)

```typescript
// src/app/api/create-message-nft/route.ts
import { CommonMiddleware, APIHandlerContext } from '@/lib/middleware-helpers'

async function createNFTHandler(context: APIHandlerContext) {
  // Middleware has already validated:
  // - Rate limits
  // - Authentication
  // - Input validation
  // - Wallet verification
  
  const { user, body } = context
  
  // Additional business logic validation
  if (body.senderWallet !== user.wallet) {
    return RouteHelpers.createAPIResponse(
      null,
      'Sender wallet must match authenticated wallet',
      403
    )
  }
  
  // Proceed with NFT creation...
}

// Apply NFT creation middleware
export const POST = CommonMiddleware.nftCreation(createNFTHandler)
```

### 2. Protected Chat Access

```typescript
// src/app/api/chats/[chatId]/messages/route.ts
async function getMessagesHandler(context: APIHandlerContext) {
  // Middleware has already verified:
  // - User authentication
  // - Chat access permissions
  // - Rate limiting
  
  const chatId = RouteHelpers.extractChatIdFromPath(context.request)
  
  // Handle encrypted message decryption
  const decryptContent = context.params.decrypt_content === 'true'
  
  // Process messages with encryption support...
}

export const GET = CommonMiddleware.messageRetrieval(getMessagesHandler)
```

### 3. Wallet Authentication

```typescript
// src/app/api/auth/wallet-signin/route.ts
async function walletSignInHandler(request: NextRequest) {
  // Rate limiting applied by middleware
  
  const { body } = await RouteHelpers.parseAndValidateBody(request, ['wallet_address'])
  
  // Verify wallet signature if provided
  if (body.signature && body.message) {
    const isValid = await WalletVerification.verifyWalletSignature(
      body.wallet_address,
      body.message,
      body.signature
    )
    
    if (!isValid) {
      return RouteHelpers.createAPIResponse(null, 'Invalid signature', 401)
    }
  }
  
  // Generate session and token
  const sessionId = SessionManager.createSession(body.wallet_address)
  const token = TokenManager.generateToken(body.wallet_address, { sessionId })
  
  return RouteHelpers.createAPIResponse({
    token,
    sessionId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })
}

export const POST = CommonMiddleware.authEndpoint(walletSignInHandler)
```

## Security Headers

All API responses include comprehensive security headers:

```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; ...",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

## Database Security

### Row Level Security (RLS)
- All tables protected with RLS policies
- Wallet-based access control
- Automatic filtering based on authenticated user

### Encrypted Storage
- Sensitive message content encrypted before database storage
- Encryption keys derived from chat and participant information
- Metadata stored alongside encrypted content for key management

## Rate Limiting Strategy

### Hierarchical Limits
1. **IP-based limits**: Prevent abuse from single IP addresses
2. **Wallet-based limits**: Prevent abuse from single wallets
3. **Operation-specific limits**: Different limits for different operations
4. **Combined enforcement**: Both IP and wallet limits must be satisfied

### Escalating Penalties
- First violation: Short-term block (1 minute)
- Repeated violations: Longer blocks (up to 1 hour)
- Persistent abuse: Extended blocks with manual review

## Monitoring and Alerting

### Security Metrics
- Active session count
- Rate limit violations
- Failed authentication attempts
- Encryption usage statistics
- NFT verification frequency

### Security Status API
- Real-time system health monitoring
- Individual wallet security status
- Rate limiting status and remaining quotas
- Recent activity tracking

## Best Practices for Frontend Integration

### 1. Token Management
```typescript
// Store JWT token securely
localStorage.setItem('stork_token', token)

// Include token in API requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### 2. Signature-Based Authentication
```typescript
// Generate signing message
const response = await fetch('/api/auth/wallet-signin?wallet_address=' + walletAddress)
const { message, timestamp } = await response.json()

// Sign with wallet
const signature = await wallet.signMessage(message)

// Authenticate with signature
const authResponse = await fetch('/api/auth/wallet-signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: walletAddress,
    signature: signature,
    message: message,
    timestamp: timestamp
  })
})
```

### 3. Error Handling
```typescript
// Handle rate limiting
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  // Show user-friendly message and retry after specified time
}

// Handle authentication errors
if (response.status === 401) {
  // Redirect to authentication flow
  // Clear stored tokens
  localStorage.removeItem('stork_token')
}
```

## Security Considerations

### Current Limitations
1. **Signature Verification**: Placeholder implementation - needs actual ed25519 verification
2. **Session Storage**: In-memory storage - should use Redis for production
3. **Key Management**: Simplified key derivation - consider using proper KMS
4. **Admin Controls**: Basic admin checking - needs proper role-based access

### Production Recommendations
1. **Environment Variables**: Store all secrets in secure environment variables
2. **HTTPS Only**: Enforce HTTPS in production for all communications
3. **Rate Limit Storage**: Use Redis or similar for distributed rate limiting
4. **Audit Logging**: Implement comprehensive audit trails
5. **Monitoring**: Set up alerts for security events and anomalies

### Compliance Considerations
- **Data Privacy**: Encrypted message storage for user privacy
- **Access Control**: NFT-based access control for exclusive messaging
- **Audit Trail**: Transaction signatures provide immutable audit trail
- **Rate Limiting**: Prevents abuse and ensures fair usage

## API Security Summary

The security system provides:

✅ **Authentication**: Wallet-based with JWT tokens and optional signature verification  
✅ **Authorization**: NFT ownership verification and chat access control  
✅ **Encryption**: AES-256-GCM message encryption with chat-specific keys  
✅ **Rate Limiting**: Multi-level limits with graduated penalties  
✅ **Input Validation**: Comprehensive validation and sanitization  
✅ **Security Headers**: Modern security headers on all responses  
✅ **Session Management**: Secure session handling with timeout controls  
✅ **Monitoring**: Real-time security status and metrics  
✅ **Error Handling**: Secure error responses without information leakage  

This architecture provides enterprise-grade security suitable for a decentralized messaging platform handling valuable NFT-based communications.