# Performance

Stork SMS is optimized for speed, efficiency, and scale. Our performance architecture ensures smooth user experience while handling high message volumes and maintaining security.

## Performance Metrics

### Current Benchmarks

| Metric | Target | Achieved | Notes |
|--------|--------|----------|--------|
| **Message Delivery** | <500ms | ~200ms | End-to-end encrypted message delivery |
| **Chat Loading** | <1s | ~400ms | Full chat history with last 50 messages |
| **NFT Creation** | <5s | ~3s | Dual NFT generation on Solana |
| **File Upload** | <2s | ~1.5s | 5MB image upload to R2 storage |
| **Voice Message** | <1s | ~800ms | Audio encoding and upload |
| **Real-time Updates** | <100ms | ~50ms | WebSocket message propagation |

### Core Web Vitals

- **Largest Contentful Paint (LCP)**: <2.5s
- **First Input Delay (FID)**: <100ms  
- **Cumulative Layout Shift (CLS)**: <0.1
- **First Contentful Paint (FCP)**: <1.8s
- **Time to Interactive (TTI)**: <3.5s

## Frontend Performance

### Next.js Optimizations

#### Server-Side Rendering (SSR)
- **Chat List**: Pre-rendered for faster initial load
- **Static Assets**: Optimized bundling and compression
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: WebP conversion and responsive images

```javascript
// Automatic image optimization
import Image from 'next/image'

<Image
  src="/stork-logo.svg"
  alt="Stork SMS"
  width={200}
  height={100}
  priority // LCP optimization
  placeholder="blur" // Smooth loading
/>
```

#### Bundle Optimization
- **Tree Shaking**: Unused code elimination
- **Dynamic Imports**: Lazy loading of heavy components
- **Webpack Optimization**: Custom bundle splitting

```javascript
// Dynamic component loading
const VoiceRecorder = dynamic(() => import('./VoiceRecorder'), {
  loading: () => <div>Loading recorder...</div>,
  ssr: false // Client-side only
});
```

### React Performance

#### Component Optimization
- **React.memo**: Prevent unnecessary re-renders
- **useMemo**: Expensive calculation caching
- **useCallback**: Function reference stability
- **Virtual Scrolling**: Large message list optimization

```javascript
// Optimized message component
const MessageBubble = React.memo(({ message, isOwn }) => {
  const decryptedContent = useMemo(() => 
    decryptMessage(message.encryptedContent), 
    [message.encryptedContent]
  );
  
  return <div className={isOwn ? 'own-message' : 'other-message'}>
    {decryptedContent}
  </div>;
});
```

#### State Management
- **Context Optimization**: Split contexts to minimize renders
- **Local State**: Prefer local state over global when possible
- **Batch Updates**: Group state updates to reduce renders

### Real-time Performance

#### WebSocket Optimization
- **Connection Pooling**: Reuse WebSocket connections
- **Message Batching**: Group frequent updates
- **Selective Subscriptions**: Subscribe only to active chats

```javascript
// Optimized real-time subscription
const useMessagesSubscription = (chatId: string, isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return; // Only subscribe to active chats
    
    const subscription = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [chatId, isActive]);
};
```

## Backend Performance

### API Optimization

#### Response Time Targets
- **Authentication**: <200ms
- **Message Creation**: <300ms
- **Chat Retrieval**: <400ms
- **NFT Generation**: <3s
- **File Upload**: <2s

#### Caching Strategy
- **Memory Caching**: Frequently accessed data
- **CDN Caching**: Static assets and images
- **Database Query Caching**: Repeated queries

```javascript
// API route with caching
export async function GET(request: NextRequest) {
  const cacheKey = `chat:${chatId}`;
  
  // Check memory cache first
  let chatData = cache.get(cacheKey);
  
  if (!chatData) {
    chatData = await fetchChatFromDB(chatId);
    cache.set(cacheKey, chatData, { ttl: 300 }); // 5 min cache
  }
  
  return Response.json(chatData);
}
```

#### Request Optimization
- **Connection Pooling**: Efficient database connections
- **Query Batching**: Multiple operations in single request
- **Parallel Processing**: Concurrent API calls where possible

### Database Performance

#### Query Optimization
- **Index Usage**: Strategic indexing for common patterns
- **Query Planning**: Explain analyze for slow queries
- **Connection Limits**: Proper pool sizing

```sql
-- Optimized chat retrieval with indexes
EXPLAIN ANALYZE
SELECT c.*, m.encrypted_content as last_message
FROM chats c
LEFT JOIN LATERAL (
    SELECT encrypted_content 
    FROM messages 
    WHERE chat_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
) m ON true
WHERE c.sender_wallet = $1 OR c.recipient_wallet = $1
ORDER BY c.updated_at DESC;

-- Uses indexes: idx_chats_sender_wallet, idx_chats_recipient_wallet
```

#### Database Monitoring
- **Slow Query Log**: Queries >1s automatically logged
- **Connection Pool**: Monitor active connections
- **Index Usage**: Track unused and missing indexes

## Blockchain Performance

### Solana Optimization

#### Transaction Efficiency
- **Compressed NFTs**: 99% cost reduction
- **Batch Operations**: Multiple NFTs per transaction
- **Priority Fees**: Dynamic fee calculation for speed

```typescript
// Optimized NFT creation with priority fees
const createNFTTransaction = async (metadata: NFTMetadata) => {
  const priorityFee = await getDynamicPriorityFee();
  
  const transaction = new Transaction()
    .add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee
      })
    )
    .add(createNFTInstruction);
  
  return transaction;
};
```

#### RPC Optimization
- **Endpoint Selection**: Choose fastest available RPC
- **Request Batching**: Group multiple RPC calls
- **Fallback Strategy**: Automatic failover to backup RPCs

```typescript
// RPC with fallback and performance monitoring
class OptimizedRPCClient {
  private endpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ];
  
  async sendTransaction(transaction: Transaction) {
    for (const endpoint of this.endpoints) {
      try {
        const startTime = performance.now();
        const result = await this.send(endpoint, transaction);
        const latency = performance.now() - startTime;
        
        this.recordMetric(endpoint, latency);
        return result;
      } catch (error) {
        console.warn(`RPC ${endpoint} failed, trying next...`);
      }
    }
    throw new Error('All RPC endpoints failed');
  }
}
```

## File Storage Performance

### Cloudflare R2 Optimization

#### Upload Strategy
- **Direct Upload**: Client-to-R2 direct uploads
- **Presigned URLs**: Secure, time-limited upload URLs
- **Multipart Upload**: Large file optimization
- **Progress Tracking**: Real-time upload feedback

```typescript
// Optimized file upload with progress
const uploadFile = async (file: File, onProgress?: (progress: number) => void) => {
  const uploadUrl = await getPresignedUploadUrl(file.name, file.type);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    };
    
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(xhr.statusText);
    
    xhr.open('PUT', uploadUrl);
    xhr.send(file);
  });
};
```

#### CDN Performance
- **Global Distribution**: 200+ edge locations
- **Automatic Compression**: Gzip/Brotli compression
- **Smart Caching**: Intelligent cache headers
- **WebP Conversion**: Automatic format optimization

## Memory Management

### Client-Side Memory

#### Message Caching
- **LRU Cache**: Least Recently Used eviction
- **Memory Limits**: 50MB chat history cache
- **Smart Preloading**: Preload likely-needed data

```typescript
// Efficient message cache with size limits
class MessageCache {
  private cache = new Map<string, Message[]>();
  private maxSize = 50 * 1024 * 1024; // 50MB
  private currentSize = 0;
  
  set(chatId: string, messages: Message[]) {
    const size = this.calculateSize(messages);
    
    // Evict if necessary
    while (this.currentSize + size > this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(chatId, messages);
    this.currentSize += size;
  }
  
  private evictOldest() {
    const [oldestKey] = this.cache.keys();
    const oldestMessages = this.cache.get(oldestKey);
    this.cache.delete(oldestKey);
    this.currentSize -= this.calculateSize(oldestMessages);
  }
}
```

#### Garbage Collection
- **WeakMap Usage**: Automatic cleanup of references
- **Event Cleanup**: Remove event listeners properly
- **Timer Cleanup**: Clear intervals and timeouts

### Server-Side Memory

#### Node.js Optimization
- **Heap Size**: Optimized for expected load
- **Garbage Collection**: Tuned GC parameters
- **Memory Leaks**: Regular monitoring and detection

## Network Optimization

### Request Optimization

#### HTTP/2 Benefits
- **Multiplexing**: Multiple requests per connection
- **Header Compression**: Reduced overhead
- **Server Push**: Proactive resource delivery

#### GraphQL-style Batching
```typescript
// Batch multiple API calls into single request
const batchRequests = async (requests: APIRequest[]) => {
  const response = await fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({ requests }),
    headers: { 'Content-Type': 'application/json' }
  });
  
  return response.json();
};
```

### Compression
- **Gzip**: Text content compression
- **Brotli**: Better compression for modern browsers
- **Image Optimization**: WebP, AVIF format support

## Monitoring & Analytics

### Performance Monitoring

#### Real User Monitoring (RUM)
- **Core Web Vitals**: Automatic collection
- **Custom Metrics**: Message delivery times
- **Error Tracking**: Performance-related errors

#### Synthetic Monitoring
- **Uptime Checks**: 24/7 availability monitoring
- **Performance Tests**: Regular automated testing
- **Load Testing**: Capacity planning

### Metrics Collection

#### Frontend Metrics
```typescript
// Custom performance metrics
const trackMessageDelivery = (startTime: number) => {
  const deliveryTime = performance.now() - startTime;
  
  analytics.track('message_delivery_time', {
    duration: deliveryTime,
    timestamp: Date.now()
  });
};
```

#### Backend Metrics
```typescript
// API performance tracking
const trackAPIPerformance = (endpoint: string, duration: number) => {
  metrics.histogram('api_request_duration', duration, {
    endpoint,
    status: 'success'
  });
};
```

## Optimization Roadmap

### Short-term Improvements (Q1 2025)
- **Service Worker**: Offline message caching
- **WebAssembly**: Faster encryption/decryption
- **IndexedDB**: Client-side message storage
- **Image Lazy Loading**: Reduce initial bundle size

### Medium-term Improvements (Q2-Q3 2025)
- **Edge Computing**: Cloudflare Workers for API
- **Database Sharding**: Horizontal scaling
- **Redis Caching**: Advanced caching layer
- **CDN Optimization**: Smart asset delivery

### Long-term Improvements (Q4 2025+)
- **Global Database**: Multi-region replication
- **AI Optimization**: Smart prefetching
- **Advanced Compression**: Custom algorithms
- **Hardware Acceleration**: GPU-based encryption

## Performance Best Practices

### Development Guidelines
1. **Measure First**: Always profile before optimizing
2. **User-Centric**: Focus on user-perceived performance
3. **Progressive Enhancement**: Core functionality first
4. **Lazy Loading**: Load features when needed
5. **Bundle Analysis**: Regular bundle size monitoring

### Deployment Optimization
1. **Asset Minification**: Compress all assets
2. **Tree Shaking**: Remove unused code
3. **Code Splitting**: Route-based chunking
4. **Preloading**: Critical resource hints
5. **Monitoring**: Continuous performance tracking

### Testing Strategy
1. **Load Testing**: Simulate high user volumes
2. **Stress Testing**: Find breaking points
3. **Performance Regression**: Automated testing
4. **Real User Monitoring**: Production metrics
5. **A/B Testing**: Performance impact measurement

This comprehensive performance strategy ensures Stork SMS delivers exceptional user experience while scaling efficiently to serve millions of users worldwide.

