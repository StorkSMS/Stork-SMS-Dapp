---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# NFT-Based Access Control

The cornerstone of Stork SMS security is our innovative NFT-based access control system. Only holders of conversation NFTs can access and view the associated messages.

## How NFT Access Works

### The Dual NFT System

When a conversation begins, two NFTs are created:
1. **Sender NFT**: Owned by the conversation initiator
2. **Recipient NFT**: Owned by the message recipient

Both NFTs are required for the conversation to function - one for each participant.

### Access Verification Flow

1. **User Requests Chat Access**
   ```
   User → Server: "Show me chat XYZ"
   ```

2. **Server Checks NFT Ownership**
   ```
   Server → Blockchain: "Does wallet ABC own NFT for chat XYZ?"
   ```

3. **Blockchain Verification**
   ```
   Blockchain → Server: "Yes, confirmed ownership"
   ```

4. **Access Granted**
   ```
   Server → User: "Here are your encrypted messages"
   ```

## Security Properties

### Immutable Permissions
- **Blockchain-Based**: Access rules stored on Solana
- **No Admin Override**: Even Stork team can't bypass
- **Transparent**: Anyone can verify ownership
- **Permanent**: Access rights persist forever

### Unforgeable Access
- **Cryptographic Proof**: NFT ownership is mathematically proven
- **No Backdoors**: System has no alternative access methods
- **Decentralized**: No single point of failure
- **Trustless**: Don't need to trust Stork SMS

### Transfer Capabilities
- **Sellable**: NFTs can be sold on marketplaces
- **Transferable**: Send chat access to another wallet
- **Inheritable**: Pass conversations to heirs
- **Recoverable**: With wallet recovery methods

## Technical Implementation

### NFT Structure
```json
{
  "name": "Stork Chat #abc123",
  "symbol": "STORK",
  "uri": "https://metadata.stork-sms.net/...",
  "sellerFeeBasisPoints": 500,
  "creators": [{
    "address": "StorkCompanyWallet...",
    "verified": true,
    "share": 100
  }]
}
```

### Ownership Verification
```typescript
// On-chain verification
async function verifyNFTOwnership(
  walletAddress: string,
  chatId: string
): Promise<boolean> {
  // 1. Get NFT mint addresses for chat
  const { senderMint, recipientMint } = await getChatNFTs(chatId);
  
  // 2. Check if wallet owns either NFT
  const ownsNFT = await checkOwnership(
    walletAddress,
    [senderMint, recipientMint]
  );
  
  // 3. Return access decision
  return ownsNFT;
}
```

### Database Integration
- **Row Level Security**: Postgres RLS policies
- **NFT Verification**: Custom SQL functions
- **Cached Results**: Performance optimization
- **Real-time Updates**: Ownership change detection

## Access Control Scenarios

### Starting a Chat
1. Alice sends message to Bob
2. Two NFTs are minted simultaneously
3. Alice receives sender NFT
4. Bob receives recipient NFT
5. Both can now access the chat

### Accessing Messages
1. User connects wallet
2. Requests chat messages
3. Server verifies NFT ownership
4. Encrypted messages returned
5. Client decrypts locally

### Transferring Access
1. Alice sends her NFT to Carol
2. Carol now has chat access
3. Alice loses chat access
4. Bob unaffected (still has access)

### Lost Wallet Recovery
1. If wallet is recovered → Access restored
2. If wallet is lost → Access permanently lost
3. No customer support override possible
4. Emphasizes wallet security importance

## Security Benefits

### vs Traditional Systems

| Traditional | Stork SMS |
|------------|-----------|
| Username/Password | NFT Ownership |
| Centralized Database | Blockchain Verification |
| Admin Can Access | No Admin Access |
| Account Recovery | Wallet Recovery Only |
| Server Compromise = Data Leak | Server Compromise = No Access |

### Attack Resistance

#### Server Compromise
- Attacker gets: Encrypted messages only
- Attacker can't: Decrypt without NFTs
- User impact: None (messages stay secure)

#### Database Leak
- Leaked data: Encrypted blobs
- Useful info: None without NFTs
- Recovery: Not needed (no compromise)

#### Phishing Attacks
- Can't phish: NFT ownership
- Can't fake: Blockchain verification
- Protection: Automatic

## Best Practices

### For Users
1. **Secure Your Wallet**: NFT = Chat Access
2. **Backup Recovery Phrase**: Only way to recover
3. **Verify Recipients**: NFTs are permanent
4. **Consider Hardware Wallets**: Maximum security

### For Developers
1. **Always Verify On-Chain**: Don't trust client claims
2. **Cache Carefully**: Ownership can change
3. **Handle Edge Cases**: Transferred NFTs
4. **Monitor Gas Costs**: Optimize verification

## Advanced Features

### Multi-Signature Chats (Coming Soon)
- Require multiple NFTs for access
- Group chat functionality
- Organizational use cases
- Enhanced security options

### Time-Locked Access (Planned)
- NFTs with expiration dates
- Temporary conversations
- Scheduled access rights
- Compliance features

### Delegated Access (Future)
- Grant temporary access
- Without transferring NFT
- Revocable permissions
- Audit trail

## Common Questions

### Can I share my chat?
Yes, by transferring your NFT to another wallet. Note that you'll lose access when you do this.

### What if I lose my wallet?
If you can recover your wallet (using seed phrase), you regain access. Otherwise, access is permanently lost.

### Can Stork SMS read my messages?
No. Without the NFTs, even we cannot decrypt or access your messages.

### Can NFTs be forged?
No. Solana blockchain ensures NFT authenticity and ownership cannot be faked.

### What about screenshots?
While we can't prevent screenshots, the blockchain provides proof of who had legitimate access.