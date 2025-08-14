---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# Security & Authentication

Security is at the core of Stork SMS. Our multi-layered security architecture ensures that your conversations remain private and accessible only to authorized participants.

## Core Security Principles

### 1. Zero-Knowledge Architecture
- We never see your unencrypted messages
- No access to private keys
- Minimal metadata collection
- Client-side encryption/decryption

### 2. Blockchain-Based Access Control
- NFT ownership determines chat access
- Immutable permission system
- No backdoors or admin overrides
- Transparent verification on-chain

### 3. End-to-End Encryption
- AES-256-GCM encryption
- Keys derived from participant wallets
- Forward secrecy (planned)
- No key escrow

## Security Sections

### [Wallet-Based Authentication](wallet-authentication.md)
Learn how we use cryptographic signatures for passwordless authentication.

### [NFT-Based Access Control](nft-access-control.md)
Understand how NFTs serve as unbreakable access tokens for conversations.

### [End-to-End Encryption](end-to-end-encryption.md)
Explore our encryption implementation and key management.

### [Security Measures](security-measures.md)
Review our comprehensive security implementations and best practices.

### [Privacy Features](privacy-features.md)
Discover how we protect your privacy and minimize data collection.

## Quick Security Facts

- **No Passwords**: Authentication via wallet signatures
- **No Phone Numbers**: Only wallet addresses used
- **No Central Database**: Messages encrypted before storage
- **No Admin Access**: Even we can't read your messages
- **Open Source**: Security through transparency ([GitHub](https://github.com/StorkSMS/Stork-SMS-Dapp))

## Security Guarantees

### What We Protect
✅ Message content (end-to-end encrypted)
✅ Chat access (NFT-gated)
✅ User identity (pseudonymous)
✅ Transaction integrity (blockchain-verified)

### What We Don't Store
❌ Unencrypted messages
❌ Private keys
❌ Personal information
❌ IP addresses (beyond rate limiting)
❌ Device fingerprints

## Reporting Security Issues

Found a vulnerability? Please report it to:
- Email: info@stork-sms.net
- Bug Bounty: Coming soon

We take security seriously and will respond to all reports within 48 hours.