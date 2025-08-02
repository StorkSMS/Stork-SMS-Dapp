---
cover: ../.gitbook/assets/App structure.png
coverY: 0
---

# Interface Guide

The Stork SMS interface is designed to be intuitive and familiar while incorporating Web3 elements seamlessly.

## Main Layout

### Desktop View

* **Left Sidebar** (300px): Chat list and navigation
* **Center Area**: Active conversation
* **Top Bar**: Wallet connection and chat info

### Mobile View

* **Hamburger Menu**: Access chat list
* **Full Screen Chat**: Maximized conversation view
* **Bottom Input**: Fixed message input area

## Interface Components

### 1. Wallet Connection

Located in the top-right corner (desktop) or header (mobile):

* **Connected State**: Shows wallet address and balance
* **Disconnected State**: "Connect Wallet" button
* **Network Indicator**: Shows Mainnet/Devnet status

### 2. Chat Sidebar

#### Active Chats Section

* **Chat Preview**: Shows recipient address and last message
* **Timestamp**: Relative time of last activity
* **Unread Indicator**: Blue dot for new messages
* **Online Status**: Green dot for active users

#### Pending Chats Section

* **Processing State**: Animated spinner
* **Failed State**: Red indicator with retry option
* **Complete State**: Green checkmark (5-second display)

### 3. Conversation View

#### Message Display

* **Sent Messages**: Aligned right with blue background
* **Received Messages**: Aligned left with white background
* **System Messages**: Centered, gray text
* **NFT Messages**: Special frame with NFT preview

#### Message Elements

* **Timestamp**: Shown on hover
* **Read Receipts**: Double checkmark when read
* **Delivery Status**: Single checkmark when delivered
* **Failed Indicator**: Red exclamation with retry option

### 4. Message Input Area

#### Input Field

* **Auto-resize**: Expands up to 4 lines
* **Emoji Support**: Full Unicode emoji
* **Paste Support**: Images and text
* **Character Counter**: For NFT messages (shown in modal)

#### Action Buttons

* **Sticker Picker**: 9 custom Stork stickers
* **Voice Recorder**: Hold to record, release to review
* **Image Upload**: Select or drag-drop images
* **Send Button**: Disabled when empty

## Interactive Features

### Real-Time Updates

#### Typing Indicator

* Shows "..." animation below chat
* Appears after 1 second of typing
* Disappears after 3 seconds of inactivity

#### Online Status

* **Green Dot**: User currently active
* **Gray Dot**: User offline
* Updates within 1 second

#### Read Receipts

* **Sent**: Message delivered to blockchain
* **Delivered**: Message received by recipient's client
* **Read**: Message viewed by recipient

### Notifications

#### Visual Indicators

* **Unread Badge**: Number of unread messages
* **Push Notifications**: Available on Solana Seeker devices, browser push coming soon
* **Sound Alert**: Optional notification sound

### Media Handling

#### Images

* **Thumbnail Preview**: In message bubble
* **Full Screen View**: Click to expand
* **Download Option**: Save original quality

#### Voice Messages

* **Waveform Display**: Visual representation
* **Playback Controls**: Play/pause button
* **Duration Display**: Total and current time

#### Stickers

* **Instant Preview**: Hover to preview
* **Grid Layout**: 3x3 sticker grid
* **Recent Section**: Last used stickers (coming soon)

## Responsive Design

### Breakpoints

* **Mobile**: < 768px
* **Tablet**: 768px - 1024px
* **Desktop**: > 1024px

### Mobile Optimizations

* **Touch Targets**: Minimum 44px
* **Swipe Gestures**: Navigate between chats (coming soon)
* **Keyboard Handling**: Auto-scroll on input focus

## Accessibility Features

* **Keyboard Navigation**: Tab through all interactive elements
* **Screen Reader Support**: ARIA labels on all buttons
* **High Contrast Mode**: Respects system preferences
* **Focus Indicators**: Clear visual focus states

## Theme Customization

Currently, Stork SMS uses a light theme with:

* **Primary Color**: #3B82F6 (Blue)
* **Background**: #FFFFFF (White)
* **Text**: #000000 (Black)
* **Borders**: #E5E7EB (Gray)

Dark mode support is planned for future releases.
