# Wallet-Based Authentication

Stork SMS uses a cryptographic authentication system that eliminates passwords entirely, relying instead on digital signatures from your Solana wallet.

## How It Works

### Authentication Flow

1. **Wallet Connection**
   - User clicks "Connect Wallet"
   - Selects their preferred wallet (Phantom, Solflare, etc.)
   - Approves the connection request

2. **Signature Challenge**
   - Server generates a unique message with timestamp
   - Message includes: wallet address, timestamp, and nonce
   - Example: `Sign this message to authenticate with Stork SMS\n\nWallet: ABC123...\nTimestamp: 2025-08-15T10:30:00Z\nNonce: xyz789`

3. **Cryptographic Signature**
   - User signs the message with their private key
   - Signature is created using ed25519 algorithm
   - Private key never leaves the wallet

4. **Server Verification**
   - Server receives public key, message, and signature
   - Verifies signature matches the message and public key
   - Confirms timestamp is recent (prevents replay attacks)

5. **Session Creation**
   - JWT token generated with wallet address
   - Token expires after 24 hours of inactivity
   - Refresh available with new signature

## Security Benefits

### No Password Vulnerabilities
- **No Password Leaks**: Nothing to steal from databases
- **No Weak Passwords**: Cryptographic strength by default
- **No Password Reuse**: Each wallet is unique
- **No Phishing**: Can't trick users into entering passwords

### Cryptographic Strength
- **Ed25519 Signatures**: Military-grade cryptography
- **256-bit Security**: Practically unbreakable
- **Quantum Resistant**: Future-proof security (with updates)
- **Non-Repudiation**: Signatures prove identity

### User Benefits
- **Nothing to Remember**: Wallet is your identity
- **Instant Login**: One click authentication
- **Cross-Device**: Same wallet works everywhere
- **No Recovery Needed**: As long as you have your wallet

## Technical Implementation

### Message Format
```json
{
  "message": "Sign this message to authenticate with Stork SMS\n\nWallet: 5xYz...def\nTimestamp: 2025-08-15T10:30:00Z\nNonce: abc123",
  "timestamp": "2025-08-15T10:30:00Z",
  "nonce": "abc123"
}
```

### Signature Verification
```typescript
// Server-side verification
const verified = nacl.sign.detached.verify(
  new TextEncoder().encode(message),
  bs58.decode(signature),
  bs58.decode(publicKey)
);
```

### JWT Token Structure
```json
{
  "wallet": "5xYz...def",
  "iat": 1705318200,
  "exp": 1705404600,
  "type": "access"
}
```

## Session Management

### Token Lifecycle
1. **Creation**: Generated after successful authentication
2. **Storage**: Stored in secure HTTP-only cookies
3. **Validation**: Checked on every API request
4. **Refresh**: Extended on activity
5. **Expiration**: Removed after 24 hours of inactivity

### Security Measures
- **HTTP-Only Cookies**: Prevents XSS attacks
- **Secure Flag**: HTTPS transmission only
- **SameSite**: CSRF protection
- **Short Lifetime**: Limits exposure window

## Multi-Wallet Support

### Supported Wallets
- **Phantom**: Most popular Solana wallet
- **Solflare**: Feature-rich alternative
- **Torus**: Social login integration
- **Ledger**: Hardware wallet security

### Wallet Standards
- Uses Solana Wallet Adapter
- Supports all standard wallets
- Hardware wallet compatible
- Mobile wallet support

## Best Practices

### For Users
1. **Secure Your Wallet**: Use strong wallet passwords
2. **Verify Requests**: Only sign messages from dapp.stork-sms.net
3. **Check URLs**: Beware of phishing sites
4. **Update Wallets**: Keep wallet software current

### For Security
1. **Never Share Private Keys**: We'll never ask for them
2. **Verify Signatures**: Check what you're signing
3. **Use Hardware Wallets**: For maximum security
4. **Enable 2FA**: On your wallet when available

## Common Issues

### "Signature Failed"
- Ensure you're signing the exact message shown
- Check that your wallet is unlocked
- Try disconnecting and reconnecting

### "Session Expired"
- Normal after 24 hours of inactivity
- Simply sign in again with your wallet
- Your chats and messages are preserved

### "Wallet Not Detected"
- Install a supported wallet extension
- Ensure it's enabled for this site
- Try refreshing the page

## Advanced Features

### Remember Me (Coming Soon)
- Optional longer session duration
- Encrypted device tokens
- Revocable from settings

### Multi-Device Sync (Coming Soon)
- Link multiple devices
- Shared session management
- Device-specific revocation

### Biometric Auth (Planned)
- Fingerprint/Face ID support
- Combined with wallet signature
- Enhanced security layer