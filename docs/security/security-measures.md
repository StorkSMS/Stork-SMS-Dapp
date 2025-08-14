---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# Security Measures

Stork SMS implements comprehensive security measures across all layers of the application to protect user data, prevent attacks, and ensure system integrity.

## Authentication Security

### Wallet-Based Authentication
- **Ed25519 Signatures**: Cryptographic signature verification using Solana wallet keys
- **Challenge-Response Protocol**: Structured signing messages with timestamp and nonce
- **Replay Attack Prevention**: Time-bounded challenges expire after 10 minutes
- **Request Deduplication**: Prevents concurrent authentication attempts

### Session Management
```typescript
// Secure session token generation
const sessionToken = jwt.sign({
    wallet_address: walletAddress,
    timestamp: Date.now(),
    nonce: secureNonce
}, JWT_SECRET, { expiresIn: '24h' })
```

### Authentication Flow Security
1. **Challenge Generation**: Server creates cryptographically secure nonce
2. **Message Signing**: User signs structured message with private key
3. **Signature Verification**: Server validates using public key cryptography
4. **JWT Generation**: Secure token with expiration and wallet metadata
5. **Session Validation**: Every request validates JWT and wallet ownership

## Database Security

### Row Level Security (RLS)
```sql
-- Chat access control
CREATE POLICY "Wallet chat access" ON public.chats FOR SELECT
USING (
    get_wallet_from_header() IS NOT NULL AND (
        sender_wallet = get_wallet_from_header() OR 
        recipient_wallet = get_wallet_from_header()
    )
);

-- Message access control  
CREATE POLICY "Wallet message access" ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chats 
        WHERE chats.id = messages.chat_id 
        AND (
            chats.sender_wallet = get_wallet_from_header() OR
            chats.recipient_wallet = get_wallet_from_header()
        )
    )
);
```

### Data Encryption at Rest
- **Message Content**: AES-256-GCM encrypted before database storage
- **Sensitive Metadata**: Additional encryption for user data
- **Database Encryption**: Supabase native encryption for infrastructure
- **Backup Security**: Encrypted database backups

## API Security

### Rate Limiting Protection
```typescript
// Multi-tier rate limiting
const rateLimits = {
    authentication: { requests: 10, window: '1 minute' },
    messaging: { requests: 100, window: '1 minute' },
    nftCreation: { requests: 5, window: '1 minute' },
    general: { requests: 200, window: '1 minute' }
}
```

### Input Validation & Sanitization
- **Type Checking**: Comprehensive input type validation
- **Schema Validation**: Zod schemas for API request validation
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Protection**: Content sanitization and CSP headers

### API Authentication Guards
```typescript
// Protected route authentication
export async function authenticateRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
        throw new AuthenticationError('Missing authentication token')
    }
    
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded.wallet_address
}
```

## Infrastructure Security

### TLS/HTTPS Enforcement
- **End-to-End TLS**: All communications encrypted in transit
- **Certificate Pinning**: HSTS headers for connection security
- **Secure Cookies**: HttpOnly and Secure flags for session cookies
- **CSP Headers**: Content Security Policy prevents XSS attacks

### CORS Configuration
```typescript
// Production CORS settings
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://dapp.stork-sms.net']
        : ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}
```

### Environment Security
- **Secret Management**: Environment variables for sensitive data
- **API Key Rotation**: Regular rotation of service API keys
- **Dependency Scanning**: Automated vulnerability scanning
- **Security Headers**: Comprehensive security header configuration

## Blockchain Security

### NFT Ownership Verification
```typescript
// Real-time ownership verification
async function verifyNFTOwnership(nftAddress: string, walletAddress: string) {
    const connection = new Connection(SOLANA_RPC_URL)
    const tokenAccounts = await connection.getTokenAccountsByOwner(
        new PublicKey(walletAddress),
        { mint: new PublicKey(nftAddress) }
    )
    
    return tokenAccounts.value.length > 0
}
```

### Transaction Security
- **Signature Validation**: Cryptographic verification of all transactions
- **Wallet Address Validation**: Public key format verification
- **Solana Network Integration**: Secure interaction with Solana blockchain
- **Metaplex Standards**: Compliance with NFT security standards

### Smart Contract Security
- **Compressed NFTs (cNFTs)**: Efficient and secure NFT implementation
- **Merkle Tree Verification**: Cryptographic proof of NFT ownership
- **On-Chain Validation**: Blockchain-verified access control
- **Audit Trail**: Immutable transaction history

## Monitoring & Logging

### Security Event Logging
```sql
-- Comprehensive audit trail
CREATE TABLE security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    wallet_address TEXT,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Monitored Events
- **Authentication Attempts**: Success/failure with wallet addresses
- **Message Encryption Operations**: Encryption/decryption events
- **NFT Ownership Verification**: Access control validations
- **Rate Limit Violations**: Suspicious activity detection
- **API Errors**: Security-relevant error conditions

### Alerting System
- **Failed Authentication**: Multiple failed attempts trigger alerts
- **Unusual Activity**: Pattern detection for suspicious behavior
- **System Errors**: Critical security system failures
- **Performance Anomalies**: Potential DDoS or attack indicators

## Error Handling Security

### Secure Error Management
```typescript
// Privacy-safe error responses
class SecurityErrorHandler {
    static sanitizeError(error: Error, context: string): string {
        // Log full error details securely
        console.error(`Security Error [${context}]:`, error)
        
        // Return user-safe error message
        return 'Authentication failed. Please try again.'
    }
}
```

### Information Disclosure Prevention
- **Generic Error Messages**: No sensitive information in user-facing errors
- **Detailed Logging**: Full error details logged securely for debugging
- **Stack Trace Protection**: Stack traces not exposed in production
- **Timing Attack Prevention**: Consistent response times for auth operations

## Client-Side Security

### Browser Security Features
- **Content Security Policy**: Prevents script injection attacks
- **Subresource Integrity**: Verifies external resource integrity
- **Secure Context**: HTTPS-only sensitive operations
- **Same-Origin Policy**: Enforced for sensitive operations

### Local Storage Security
```typescript
// Secure token storage
class SecureStorage {
    static setToken(walletAddress: string, token: string) {
        const key = `auth_token_${walletAddress}`
        localStorage.setItem(key, token)
    }
    
    static clearAllTokens() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('auth_token_')) {
                localStorage.removeItem(key)
            }
        })
    }
}
```

### Memory Security
- **Key Clearing**: Encryption keys cleared from memory after use
- **Cache Limits**: Bounded caches prevent memory exhaustion
- **Garbage Collection**: Explicit cleanup of sensitive data
- **No Persistence**: Sensitive data not stored persistently

## Incident Response

### Security Incident Detection
- **Automated Monitoring**: Real-time security event detection
- **Anomaly Detection**: Pattern-based suspicious activity identification
- **Manual Reporting**: User-reported security issues
- **Third-Party Alerts**: External security service notifications

### Response Procedures
1. **Immediate Assessment**: Rapid evaluation of security incident scope
2. **Containment**: Isolation of affected systems or accounts
3. **Investigation**: Detailed analysis of security breach
4. **Remediation**: Implementation of fixes and security improvements
5. **Communication**: Transparent user notification when required

### Recovery Measures
- **Service Restoration**: Rapid restoration of secure service
- **Data Integrity**: Verification of data integrity post-incident
- **Security Hardening**: Implementation of additional protections
- **Post-Incident Review**: Analysis and improvement of security measures

## Compliance & Standards

### Security Standards Compliance
- **OWASP Top 10**: Protection against common web vulnerabilities
- **NIST Cybersecurity Framework**: Implementation of security controls
- **SOC 2 Type II**: Security and availability criteria compliance
- **ISO 27001**: Information security management principles

### Privacy Regulations
- **GDPR Compliance**: European data protection requirements
- **CCPA Compliance**: California consumer privacy rights
- **Data Minimization**: Collection of only necessary data
- **User Rights**: Access, deletion, and portability rights

## Security Testing

### Automated Security Testing
- **SAST**: Static application security testing
- **DAST**: Dynamic application security testing
- **Dependency Scanning**: Automated vulnerability detection
- **Container Scanning**: Security scanning of deployment containers

### Manual Security Testing
- **Penetration Testing**: Regular third-party security assessments
- **Code Reviews**: Security-focused code review processes
- **Architecture Reviews**: Security assessment of system design
- **Red Team Exercises**: Simulated attack scenarios

### Bug Bounty Program
- **Community Security Testing**: Incentivized security research
- **Responsible Disclosure**: Coordinated vulnerability disclosure
- **Reward Structure**: Compensation for security findings
- **Scope Definition**: Clear boundaries for security testing

## Future Security Enhancements

### Planned Improvements
- **Hardware Security Modules**: Enhanced key protection
- **Multi-Factor Authentication**: Additional authentication factors
- **Advanced Threat Detection**: ML-based security monitoring
- **Zero Trust Architecture**: Comprehensive identity verification

### Emerging Threats Protection
- **Quantum Resistance**: Post-quantum cryptography preparation
- **AI/ML Attacks**: Protection against automated attacks
- **Supply Chain Security**: Enhanced dependency verification
- **Cloud Security**: Advanced cloud-native security measures

Stork SMS security is continuously evolving to address emerging threats and maintain the highest standards of user protection and data security.