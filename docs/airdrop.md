---
cover: ./.gitbook/assets/nft showcase.png
coverY: 0
---

# 🪂 Airdrop Program

Stork SMS will distribute tokens to early adopters and active community members through a multi-round airdrop program designed to reward engagement and ecosystem participation.

## Airdrop Overview

The Stork SMS token airdrop consists of **5% of total supply** distributed across three strategic rounds, each targeting different segments of our community:

### Total Allocation: 5% of Token Supply

- **Round 1**: 2% - Solana Seeker NFT Holders
- **Round 2**: 1% - Exclusive Seeker User Rewards  
- **Round 3**: 2% - Stork SMS User Achievement System

## Round 1: Solana Seeker NFT Holders (2% of Supply)

### Eligibility Requirements

**Snapshot Date**: To be announced before token launch

**Who Qualifies:**
- Holders of any Solana Seeker NFT at snapshot time
- Must hold NFT in personal wallet (not custodial)
- One allocation per unique wallet address

### Allocation Structure
```
Base Allocation: Equal distribution among all qualifying holders
Bonus Multipliers:
- Genesis Seeker NFTs: 2x allocation
- Rare Trait Holders: 1.5x allocation
- Long-term Holders (6+ months): 1.25x allocation
```

### Why Seeker Holders?
Solana Seeker represents the pinnacle of Web3 mobile technology and aligns perfectly with Stork SMS's vision of hardware-secured, mobile-first blockchain communication. Seeker NFT holders are forward-thinking Web3 adopters who understand the value of decentralized, secure technology.

## Round 2: Exclusive Seeker User Rewards (1% of Supply)

### Eligibility Requirements

**Active Seeker Usage**: Must demonstrate active use of Stork SMS on Solana Seeker device

**Verification Criteria:**
- Minimum 10 conversations created on Seeker
- At least 100 messages sent via Seeker device
- Minimum 30 days of active usage
- Hardware verification through Seed Vault integration

### Enhanced Rewards for Seeker Integration
```
Base Seeker User: 1x allocation
Advanced Features Usage:
- Biometric Authentication: +25% bonus
- Hardware Transaction Signing: +25% bonus
- Native Seeker Features: +50% bonus
- Beta Testing Participation: +100% bonus
```

### Verification Process
- **Hardware Verification**: Seeker's Seed Vault provides cryptographic proof of device usage
- **Usage Analytics**: On-device analytics verify genuine usage patterns
- **Feature Engagement**: Bonus allocations for using Seeker-exclusive features
- **Community Participation**: Additional rewards for feedback and bug reports

## Round 3: Achievement-Based User Rewards (2% of Supply)

### The Egg Collection System

Earn **Stork Eggs** through various achievements in the Stork SMS ecosystem. Different egg tiers unlock increasing airdrop allocations.

#### 🥉 Bronze Eggs
**Requirement**: Complete basic platform activities

**Bronze Achievements:**
- **First Flight**: Send your first message
- **NFT Pioneer**: Create your first chat NFT
- **Media Maven**: Send first image or voice message
- **Sticker Enthusiast**: Send 10 sticker messages
- **Week Warrior**: Use platform for 7 consecutive days

**Reward**: 1 Bronze Egg each | **Airdrop Value**: 0.1% of personal allocation

#### 🥈 Silver Eggs  
**Requirement**: Demonstrate regular engagement

**Silver Achievements:**
- **Conversation Creator**: Start 10 different conversations
- **Message Master**: Send 1,000 total messages
- **NFT Collector**: Own 5 different chat NFTs
- **Social Butterfly**: Engage with 25 unique wallet addresses
- **Monthly Veteran**: Active user for 30 consecutive days

**Reward**: 1 Silver Egg each | **Airdrop Value**: 0.5% of personal allocation

#### 🥇 Gold Eggs
**Requirement**: Advanced platform usage and community leadership

**Gold Achievements:**
- **Chat Champion**: Participate in 100 different conversations
- **NFT Trader**: Successfully transfer chat access NFTs
- **Community Builder**: Refer 10 new active users
- **Feature Explorer**: Use all available message types
- **Loyalty Legend**: Active user for 90 consecutive days

**Reward**: 1 Gold Egg each | **Airdrop Value**: 1.0% of personal allocation

#### 💎 Platinum Eggs
**Requirement**: Exceptional dedication and extreme platform usage

**Platinum Achievements:**
- **Platform Pioneer**: Among first 100 users
- **Message Titan**: Send 50,000+ messages
- **NFT Empire**: Create and send 150+ NFTs to others
- **Community Architect**: Refer 100+ new active users
- **Volume Legend**: Participate in 500+ different conversations
- **Ecosystem Builder**: Contribute to platform development and testing

**Reward**: 1 Platinum Egg each | **Airdrop Value**: 2.5% of personal allocation

### Achievement Tracking System

#### Real-Time Progress
```typescript
interface UserAchievements {
    wallet_address: string
    bronze_eggs: number
    silver_eggs: number  
    gold_eggs: number
    platinum_eggs: number
    total_score: number
    achievements_unlocked: Achievement[]
    progress_tracking: ProgressMetrics
}
```

#### Transparent Verification
- **On-Chain Verification**: Achievement data verified through blockchain activity
- **Smart Contract Integration**: Achievements recorded in tamper-proof smart contracts
- **Real-Time Updates**: Achievement progress updated in real-time
- **Public Leaderboard**: Transparent ranking system for community engagement

### Allocation Calculation Formula

```typescript
// Personal airdrop allocation calculation
function calculateAirdropAllocation(eggs: UserEggs): number {
    const baseAllocation = 100 // Base tokens per user
    
    const bronzeValue = eggs.bronze * 0.1
    const silverValue = eggs.silver * 0.5
    const goldValue = eggs.gold * 1.0
    const platinumValue = eggs.platinum * 2.5
    
    const multiplier = 1 + (bronzeValue + silverValue + goldValue + platinumValue) / 100
    
    return baseAllocation * multiplier
}
```

### Leaderboard & Competition

#### Community Rankings
- **Top Collectors**: Users with most eggs across all tiers
- **Category Leaders**: Specialists in specific achievement types
- **Streak Champions**: Longest consecutive activity periods
- **Early Adopters**: First to unlock new achievements

#### Bonus Rewards
- **Top 100 Overall**: Additional 50% airdrop bonus
- **Top 10 Per Category**: Additional 25% airdrop bonus  
- **Perfect Score**: Unlock all achievements for 100% bonus
- **Community Choice**: User-voted exceptional contributors

## Airdrop Timeline

### Phase 1: Preparation (Q3 2025)
- Achievement system deployment
- Seeker integration completion
- Community announcement and education

### Phase 2: Accumulation Period (Q4 2025 - Q1 2026)
- Achievement tracking begins
- Seeker usage verification
- Community engagement campaigns

### Phase 3: Snapshot & Distribution (Q2 2026)
- Final snapshots taken
- Allocation calculations completed
- Token distribution executed

## Claiming Process

### Simple Claim Interface
1. **Connect Wallet**: Connect your qualifying Solana wallet
2. **Verify Eligibility**: System automatically verifies your achievements
3. **Review Allocation**: See your egg collection and total allocation
4. **Claim Tokens**: One-click claiming process
5. **Confirmation**: Receive tokens directly to your wallet

### Security Features
- **Multi-Signature Verification**: Secure distribution process
- **Anti-Sybil Measures**: Prevent gaming the system
- **Fraud Detection**: Advanced algorithms detect suspicious activity
- **Appeal Process**: Fair resolution for disputed claims

## Fair Distribution Principles

### Anti-Gaming Measures
- **Identity Verification**: Advanced Sybil resistance
- **Behavioral Analysis**: Detect bot or fake activity
- **Manual Review**: Human verification for large allocations
- **Community Reporting**: User-reported suspicious behavior

### Accessibility
- **Multiple Opportunities**: Various ways to earn across different skill levels
- **Time-Based Rewards**: Long-term engagement valued over short bursts
- **Inclusive Design**: Achievements accessible to all user types
- **Educational Support**: Guides to help users understand the system

## Token Utility

### Governance Rights
- **Platform Decisions**: Vote on feature development
- **Economic Parameters**: Influence tokenomics decisions
- **Community Initiatives**: Direct community project funding
- **Protocol Upgrades**: Participate in technical governance

### Platform Benefits
- **Premium Features**: Access to advanced functionality
- **Transaction Discounts**: Reduced fees for token holders
- **Priority Support**: Enhanced customer service
- **Exclusive Content**: Access to special features and content

## Community Benefits

### Network Effects
- **User Acquisition**: Incentivize new user onboarding
- **Engagement Rewards**: Recognize active community members
- **Platform Growth**: Align user success with platform success
- **Ecosystem Development**: Fund continued innovation

### Long-Term Vision
The airdrop program is designed to bootstrap a thriving, engaged community of Web3 communication enthusiasts who will shape the future of decentralized messaging.

## FAQ

### General Questions

**Q: When will the airdrop happen?**
A: Token distribution is planned for Q2 2026, following the accumulation period.

**Q: Can I qualify for multiple rounds?**
A: Yes! You can qualify for all three rounds if you meet the requirements.

**Q: What if I don't own a Seeker device?**
A: You can still participate in Round 3 through the achievement system on any supported device.

### Achievement Questions

**Q: How are achievements verified?**
A: Through a combination of on-chain activity verification and platform usage analytics.

**Q: Can achievements be lost?**
A: No, once earned, achievements are permanently recorded.

**Q: Is there a maximum number of eggs I can earn?**
A: No limit! The more you engage, the more you can earn.

### Technical Questions

**Q: Which wallets are supported for claiming?**
A: All Solana-compatible wallets (Phantom, Solflare, Ledger, etc.)

**Q: How do I track my progress?**
A: Real-time achievement tracking is available in your Stork SMS dashboard.

**Q: What if I transfer my NFTs?**
A: Snapshots are taken at specific dates, so transfers after snapshot don't affect eligibility.

---

**Ready to start earning your eggs?** Connect your wallet to Stork SMS and begin your journey toward Web3 communication rewards! 🥚✨