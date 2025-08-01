# Technology Stack

Stork SMS leverages cutting-edge technologies to deliver a secure, decentralized messaging experience. Our stack combines proven Web2 technologies with innovative Web3 solutions.

## Frontend Technologies

### Core Framework
- **Next.js 15** - React framework with App Router
  - Server-side rendering for improved performance
  - API routes for backend integration
  - Automatic code splitting and optimization
  - Built-in TypeScript support

- **React 18** - Modern UI library
  - Component-based architecture
  - Hooks for state management
  - Concurrent features for better UX
  - Server Components support

- **TypeScript** - Static type checking
  - Enhanced developer experience
  - Runtime error prevention
  - Better code documentation
  - IDE integration and autocomplete

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
  - Responsive design system
  - Custom color palette
  - Component variants
  - Dark/light theme support

- **shadcn/ui** - Component library
  - Radix UI primitives
  - Accessible components
  - Customizable design system
  - "New York" style variant

- **Lucide React** - Icon library
  - Consistent iconography
  - Lightweight SVG icons
  - Easy customization

### Web3 Integration
- **@solana/wallet-adapter-react** - Wallet connectivity
  - Multi-wallet support (Phantom, Solflare, Ledger, Torus)
  - Automatic wallet detection
  - Hardware wallet compatibility
  - Error handling and reconnection

- **@solana/web3.js** - Solana blockchain interaction
  - Transaction creation and signing
  - Account and balance queries
  - Network communication
  - RPC endpoint management

## Backend Technologies

### Server Framework
- **Next.js API Routes** - Serverless backend functions
  - RESTful API design
  - Automatic scaling
  - Edge runtime support
  - Built-in request/response handling

- **Node.js Runtime** - JavaScript server environment
  - Async/await support
  - NPM ecosystem access
  - Performance optimization
  - Memory management

### Authentication & Security
- **JSON Web Tokens (JWT)** - Stateless authentication
  - Secure token generation
  - Wallet-based claims
  - Expiration handling
  - Signature verification

- **TweetNaCl** - Cryptographic operations
  - Signature verification
  - Random number generation
  - Lightweight crypto library
  - Cross-platform compatibility

- **Crypto-JS** - Encryption utilities
  - AES-256-GCM encryption
  - Hash functions
  - HMAC verification
  - Key derivation

### API Management
- **Rate Limiter Flexible** - Request rate limiting
  - DDoS protection
  - Per-IP rate limits
  - Flexible configuration
  - Redis-backed storage (optional)

## Database & Storage

### Primary Database
- **Supabase (PostgreSQL)** - Managed database service
  - ACID compliance
  - JSON/JSONB support
  - Full-text search
  - Geographic data types
  - Advanced indexing

**Key Features**:
- **Row Level Security (RLS)** - Fine-grained access control
- **Real-time Subscriptions** - Live data updates
- **Automatic Backups** - Point-in-time recovery
- **Connection Pooling** - Efficient resource usage

### File Storage
- **Cloudflare R2** - Object storage service
  - S3-compatible API
  - Global CDN distribution
  - Zero egress fees
  - High durability (99.999999999%)

**Stored Content**:
- User-uploaded images
- Voice message files
- Generated NFT assets
- Metadata files

## Blockchain Technologies

### Solana Ecosystem
- **Solana Mainnet/Devnet** - High-performance blockchain
  - Sub-second finality
  - Low transaction costs
  - Proof of Stake consensus
  - Parallel transaction processing

### NFT Infrastructure
- **Metaplex Foundation**
  - **@metaplex-foundation/mpl-bubblegum** - Compressed NFTs
  - **@metaplex-foundation/mpl-core** - Core NFT functionality
  - **@metaplex-foundation/umi** - Unified Metaplex Interface

**Compressed NFT Benefits**:
- 99% cost reduction vs regular NFTs
- Merkle tree-based storage
- Batch operations support
- Scalable collection management

### Wallet Integration
- **Phantom** - Browser extension wallet
- **Solflare** - Mobile and web wallet
- **Ledger** - Hardware wallet support
- **Torus** - Social login wallet

## Development Tools

### Build & Development
- **npm** - Package manager
- **Webpack** - Module bundler (via Next.js)
- **Babel** - JavaScript compiler (via Next.js)
- **PostCSS** - CSS post-processor

### Code Quality
- **ESLint** - JavaScript linting
- **Prettier** - Code formatting (optional)
- **TypeScript Compiler** - Type checking
- **Husky** - Git hooks (optional)

### Testing (Planned)
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Cypress** - End-to-end testing
- **Solana Test Validator** - Local blockchain testing

## Deployment & Infrastructure

### Hosting
- **Netlify** - Static site hosting
  - Next.js optimization
  - Edge functions
  - Automatic deployments
  - Branch previews

### Database Hosting
- **Supabase Cloud** - Managed PostgreSQL
  - Global distribution
  - Automatic scaling
  - SSL encryption
  - Regular backups

### CDN & Storage
- **Cloudflare R2** - Global object storage
  - Automatic CDN distribution
  - Edge caching
  - DDoS protection
  - Analytics

## Monitoring & Analytics

### Performance Monitoring
- **Next.js Analytics** - Core web vitals
- **Netlify Analytics** - Traffic insights
- **Supabase Dashboard** - Database metrics

### Error Tracking (Planned)
- **Sentry** - Error monitoring
- **LogRocket** - Session replay
- **DataDog** - Application monitoring

## Development Environment

### Required Tools
```bash
# Node.js (v18 or higher)
node --version

# Package manager
npm --version

# Solana CLI (for development)
solana --version

# Supabase CLI (for local development)
supabase --version
```

### Environment Setup
```bash
# Install dependencies
npm install

# Start local development
npm run dev

# Start local Supabase
supabase start

# Build for production
npm run build
```

## Package Dependencies

### Production Dependencies
```json
{
  "@solana/wallet-adapter-react": "^0.15.39",
  "@solana/web3.js": "^1.98.2",
  "@supabase/supabase-js": "^2.51.0",
  "@metaplex-foundation/mpl-bubblegum": "^5.0.2",
  "next": "15.3.5",
  "react": "^18",
  "canvas": "^3.1.2",
  "crypto-js": "^4.2.0",
  "jsonwebtoken": "^9.0.2",
  "rate-limiter-flexible": "^7.1.1"
}
```

### Development Dependencies
```json
{
  "@types/react": "^18",
  "@types/node": "^20",
  "typescript": "^5",
  "eslint": "^8",
  "tailwindcss": "^3.4.1",
  "postcss": "^8"
}
```

## Technology Decisions

### Why Next.js 15?
- **Full-stack Framework**: API routes eliminate need for separate backend
- **Performance**: Server components and automatic optimization
- **Developer Experience**: Hot reloading, TypeScript support, excellent docs
- **Deployment**: Perfect integration with Netlify and Vercel

### Why Supabase?
- **Real-time Features**: Built-in WebSocket support for live messaging
- **Security**: Row Level Security for data isolation
- **Scalability**: Managed PostgreSQL with automatic scaling
- **Developer Experience**: Excellent dashboard and client libraries

### Why Solana?
- **Performance**: 50,000+ TPS with sub-second finality
- **Cost**: Low transaction fees (< $0.01)
- **Developer Experience**: Great tooling and documentation
- **NFT Ecosystem**: Mature Metaplex infrastructure

### Why Compressed NFTs?
- **Cost Efficiency**: 99% cheaper than regular NFTs
- **Scalability**: Support for millions of NFTs per tree
- **Flexibility**: Dynamic metadata and batch operations
- **Ecosystem**: Full Metaplex tooling support

## Version Information

| Technology | Version | Latest Stable |
|------------|---------|---------------|
| Next.js | 15.3.5 | ✅ Current |
| React | 18.x | ✅ Current |
| TypeScript | 5.x | ✅ Current |
| Solana Web3.js | 1.98.2 | ✅ Current |
| Supabase JS | 2.51.0 | ✅ Current |
| Tailwind CSS | 3.4.1 | ✅ Current |

## Future Technology Considerations

### Planned Additions
- **Mobile App**: React Native with Expo
- **Push Notifications**: Firebase Cloud Messaging
- **Advanced Analytics**: Custom dashboard with D3.js
- **Multi-chain Support**: Ethereum, Polygon integration

### Performance Optimizations
- **Edge Computing**: Cloudflare Workers for global performance
- **Database Sharding**: Horizontal scaling for large user base
- **Caching Layer**: Redis for frequently accessed data
- **Image Optimization**: WebP conversion and dynamic resizing

This technology stack provides a solid foundation for Stork SMS to scale globally while maintaining security, performance, and developer productivity.

