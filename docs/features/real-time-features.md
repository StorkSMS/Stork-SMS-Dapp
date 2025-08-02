---
cover: >-
  ../.gitbook/assets/hyangrrrr_A_Japanese_peaceful_landscape_featuring_reeds_in_th_a3a00df0-c3f5-4755-9838-b92c0abb13e2_1.png
coverY: 0
---

# Real-Time Features

Stork SMS provides instant communication with real-time updates across all connected clients.

## Typing Indicators

### How It Works

When a user types in the message input field, other participants see a visual indication of typing activity.

### Technical Implementation

* **Trigger**: Activated after 1 second of typing
* **Duration**: Shows for 3 seconds after last keystroke
* **Network**: Uses WebSocket connections for instant updates
* **Privacy**: Only visible to chat participants

### Visual Design

* **Animation**: Three animated dots (...)
* **Position**: Below the last message
* **Color**: Subtle gray to avoid distraction
* **Sound**: Optional typing sound effect

### User Experience

1. Start typing in any chat
2. Other user sees "Username is typing..."
3. Indicator disappears when you stop
4. Automatic cleanup after timeout

## Online Status

### Presence Detection

Real-time tracking of user availability:

* **Green Dot**: User is currently active
* **Last Seen**: Time since last activity (coming soon)
* **Away Status**: After 5 minutes of inactivity (coming soon)
* **Offline**: No active connection

### How It Works

1. **Connection Monitoring**: Tracks WebSocket connection state
2. **Activity Detection**: Updates on user interaction
3. **Heartbeat System**: Regular pings to maintain status
4. **Graceful Degradation**: Handles connection interruptions

### Privacy Controls

* Status visible only to chat participants
* No global online status (by design)
* Option to hide status (coming soon)
* Anonymous mode planning

## Read Receipts

### Receipt Types

#### Sent (✓)

* Message successfully sent to blockchain
* Transaction confirmed
* Available for recipient to receive

#### Delivered (✓✓)

* Message received by recipient's client
* Decrypted successfully
* Ready to be viewed

#### Read (✓✓ in blue)

* Message viewed by recipient
* Timestamp recorded
* Notification cleared

### Implementation Details

* **Real-time Updates**: Instant status changes
* **Persistent State**: Survives page refreshes
* **Batch Updates**: Efficient for multiple messages
* **Retroactive**: Updates previous messages when read

### Privacy Options

* Read receipts enabled by default
* Disable option coming soon
* Per-chat settings planned
* Maintain delivery receipts even when read receipts disabled

## Message Synchronization

### Cross-Device Sync

* **Instant Updates**: Messages appear on all devices
* **Order Preservation**: Maintains message sequence
* **Conflict Resolution**: Handles simultaneous sends
* **Offline Queue**: Stores messages when disconnected

### Sync Process

1. Message sent from Device A
2. Server receives and stores message
3. Real-time broadcast to all participants
4. Device B receives and displays instantly
5. Read status syncs back to Device A

## Connection Management

### Connection States

#### Connected

* Full functionality available
* Real-time updates active
* Green status indicator

#### Connecting

* Attempting to establish connection
* Yellow status indicator
* Queues outgoing messages

#### Disconnected

* No active connection
* Red status indicator
* Switches to offline mode

#### Reconnecting

* Automatic retry with exponential backoff
* Preserves unsent messages
* Syncs missed updates on reconnection

### Reliability Features

* **Auto-reconnection**: Handles network interruptions
* **Message Queue**: Prevents message loss
* **State Recovery**: Restores chat state after reconnection
* **Duplicate Prevention**: Ensures messages aren't sent twice

## Real-Time Notifications

### Notification Types

#### New Message

* **Visual**: Unread indicator in sidebar
* **Sound**: Customizable alert tone
* **Browser**: Push notification (coming soon)
* **Badge**: Unread count display

#### Mention Notifications (Coming Soon)

* **@username**: Direct mentions
* **Highlight**: Message highlighting
* **Priority**: Higher notification priority
* **Sound**: Distinct mention sound

### Notification Settings

* **Global Toggle**: Enable/disable all notifications
* **Per-Chat Mute**: Silence specific conversations
* **Sound Selection**: Choose notification sounds
* **Do Not Disturb**: Time-based muting (coming soon)

## Performance Optimization

### Efficiency Measures

* **Debouncing**: Reduces typing indicator spam
* **Batching**: Groups read receipt updates
* **Compression**: Minimizes data transfer
* **Caching**: Stores frequently accessed data

### Scalability

* **WebSocket Pooling**: Efficient connection management
* **Regional Servers**: Reduced latency (coming soon)
* **Load Balancing**: Distributes connection load
* **Horizontal Scaling**: Handles growing user base

## Technical Architecture

### WebSocket Implementation

```javascript
// Simplified connection flow
1. Establish WebSocket connection
2. Authenticate with JWT token
3. Subscribe to chat channels
4. Receive real-time updates
5. Handle reconnection logic
```

### Event Types

* `presence_update`: Online status changes
* `typing_start`: User starts typing
* `typing_stop`: User stops typing
* `message_new`: New message received
* `message_read`: Message read status update

### Best Practices

#### For Users

* Maintain stable internet connection
* Allow browser notifications
* Keep app tab active for best performance
* Report any sync issues

#### For Developers

* Handle all connection states
* Implement proper error recovery
* Cache data appropriately
* Monitor WebSocket health
