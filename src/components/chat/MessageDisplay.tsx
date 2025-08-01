"use client"

import React, { RefObject } from "react"
import { detectUrls, calculateSkeletonDimensions } from "@/lib/url-utils"
import { PRIORITY_LEVELS } from "@/lib/link-loading-queue"
import LinkPreview from "@/components/LinkPreview"
import VoiceMessageBubble from "@/components/VoiceMessageBubble"
import ImageMessageBubble from "@/components/ImageMessageBubble"
import { MessageStatus } from "@/components/MessageStatus"

interface Message {
  id: string
  type: 'text' | 'nft' | 'sticker' | 'voice' | 'image' | 'file' | 'system'
  sender_wallet: string
  message_content: string
  created_at: string
  nft_image_url?: string
  metadata?: any
  file_url?: string
  sticker_name?: string
}

interface MessageDisplayProps {
  selectedChat: string | null
  currentChatMessages: Message[]
  isLoadingMessages: boolean
  publicKey: string | null
  connected: boolean
  isAuthenticated: boolean
  isDarkMode: boolean
  isMobile: boolean
  messagesContainerRef: RefObject<HTMLDivElement>
  conversations: any[]
  readReceipts: Record<string, string>
  
  // Message status functions
  getStatusFromMessage: (message: any) => 'sending' | 'optimistic' | 'sent' | 'delivered' | 'read' | 'failed' | 'encrypted' | 'retrying' | 'received'
  isMessageEncrypted: (message: any) => boolean
  getMessageTimestamp: (message: any) => string
  retryMessage: (message: any) => void
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({
  selectedChat,
  currentChatMessages,
  isLoadingMessages,
  publicKey,
  connected,
  isAuthenticated,
  isDarkMode,
  isMobile,
  messagesContainerRef,
  conversations,
  readReceipts,
  getStatusFromMessage,
  isMessageEncrypted,
  getMessageTimestamp,
  retryMessage,
}) => {
  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }
  
  return (
    <>
      {/* Gradient Fade Overlay */}
      <div 
        className="absolute top-0 left-0 z-10 pointer-events-none"
        style={{ 
          background: `linear-gradient(to bottom, #F7F7F7, transparent)`,
          height: '10px',
          width: 'calc(100% - 17px)'
        }}
      />
      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto relative" style={{ overflowX: 'visible', paddingLeft: isMobile ? '16px' : '50px', paddingRight: isMobile ? '16px' : '50px', paddingBottom: isMobile ? '100px' : '24px', minHeight: 0 }}>
            {isLoadingMessages ? (
              <div className="text-center mt-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: colors.border }}></div>
                <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>Loading messages...</p>
              </div>
            ) : currentChatMessages.length === 0 ? (
              <div className="text-center mt-20">
                <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>No messages yet</p>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>Send your first message!</p>
              </div>
            ) : (
              <div className="relative max-w-6xl mx-auto">
                {/* Pinned First NFT Message */}
                {(() => {
                  const firstMsg = currentChatMessages[0]
                  if (!firstMsg) return null
                  
                  // Check if it's an NFT message
                  const shouldShow = firstMsg.type === 'nft'
                  
                  if (!shouldShow) {
                    return null
                  }
                  
                  return (
                  <div className="flex flex-col items-center mb-8 relative">
                    <div 
                      className="group relative transform rotate-3 hover:rotate-1 transition-transform duration-300 cursor-pointer hover:scale-105"
                      style={{
                        filter: 'drop-shadow(8px 12px 16px rgba(0, 0, 0, 0.25))',
                        overflow: 'visible',
                        margin: '20px'
                      }}
                      onClick={() => {
                        // TODO: Open NFT details modal
                      }}
                    >
                      {firstMsg.nft_image_url ? (
                        <img 
                          src={firstMsg.nft_image_url} 
                          alt="Pinned NFT Message" 
                          className="w-64 h-64 object-cover rounded-sm hover:shadow-2xl transition-shadow duration-300"
                          style={{ 
                            backgroundColor: 'transparent'
                          }}
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div 
                          className="w-64 h-64 rounded-sm hover:shadow-2xl transition-shadow duration-300 flex items-center justify-center p-4"
                          style={{ 
                            backgroundColor: colors.bg
                          }}
                        >
                          <p 
                            className="text-center text-sm"
                            style={{ 
                              fontFamily: "Helvetica Neue, sans-serif",
                              color: colors.text 
                            }}
                          >
                            {firstMsg.message_content}
                          </p>
                        </div>
                      )}
                      {/* Pin shadow effect */}
                      <img 
                        src="/pin-shadow.png"
                        alt=""
                        className="absolute -top-2 -left-2 w-10 h-10 opacity-80 transition-all duration-300 group-hover:translate-y-2 group-hover:translate-x-2 group-hover:scale-y-150 group-hover:opacity-20"
                        style={{ 
                          objectFit: 'contain',
                          zIndex: 10
                        }}
                      />
                      {/* Pin effect */}
                      <img 
                        src="/pin.png"
                        alt="Pin"
                        className="absolute -top-2 -left-2 w-10 h-10 transition-all duration-300 group-hover:-translate-y-2 group-hover:translate-x-2 group-hover:scale-110"
                        style={{ 
                          objectFit: 'contain',
                          zIndex: 9999
                        }}
                      />
                      {/* Paper texture overlay */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          backgroundImage: 'url(/Paper-Texture-7.jpg)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          mixBlendMode: 'multiply',
                          opacity: isDarkMode ? 0.3 : 0.1
                        }}
                      />
                    </div>
                    
                    {/* Faint timestamp and sender info that hides on hover */}
                    <div 
                      className="mt-3 text-center opacity-50 text-xs group-hover:opacity-0 transition-opacity duration-300"
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.textSecondary
                      }}
                    >
                      <div>
                        {new Date(firstMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {firstMsg.sender_wallet}
                      </div>
                      <div>
                        started a chat
                      </div>
                    </div>
                  </div>
                  )
                })()}
                
                {/* Regular Messages */}
                <div className="space-y-4">
                  {(!connected || !publicKey) && (
                    <div className="p-4 text-center" style={{ 
                      backgroundColor: colors.bg,
                      border: `2px solid ${colors.border}`,
                      color: colors.textSecondary
                    }}>
                      <p className="text-sm" style={{ fontFamily: "Helvetica Neue, sans-serif" }}>
                        Please connect your wallet to view messages
                      </p>
                    </div>
                  )}
                  
                  {connected && publicKey && !isAuthenticated && (
                    <div className="p-4 text-center" style={{ 
                      backgroundColor: colors.bg,
                      border: `2px solid ${colors.border}`,
                      color: colors.textSecondary
                    }}>
                      <p className="text-sm" style={{ fontFamily: "Helvetica Neue, sans-serif" }}>
                        Please sign with your wallet to view messages
                      </p>
                    </div>
                  )}
                  
                  
                  {connected && publicKey && isAuthenticated && currentChatMessages.map((msg, index) => {
                    const isOwnMessage = msg.sender_wallet === publicKey?.toString()
                    const isFirstMessage = index === 0
                    
                    // Determine if message has been read by recipient via read receipts
                    const currentConversation = conversations.find(c => c.id === selectedChat)
                    const recipientWallet = currentConversation?.participants.find(p => p !== publicKey?.toString())
                    const isReadByRecipient = !!(isOwnMessage && recipientWallet && readReceipts[msg.id] === recipientWallet)
                    
                    // Skip displaying the first NFT message in normal format since it's pinned above
                    if (isFirstMessage && msg.type === 'nft') {
                      return null
                    }
                    
                    // Check if message has a link preview
                    const hasLinkPreview = msg.type === 'text' && detectUrls(msg.message_content).length > 0;
                    
                    // Check if message is optimistic (temporary/pending)
                    const isOptimisticMessage = msg.id.startsWith('optimistic_') || (msg as any).optimistic === true;
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`${msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image' ? '' : hasLinkPreview ? (isMobile ? 'max-w-[85%]' : 'max-w-[50%]') : (isMobile ? 'max-w-[90%]' : 'max-w-[60%]')}`}>
                          {/* Link Preview - Rendered outside and above the message box */}
                          {hasLinkPreview && (() => {
                            const url = detectUrls(msg.message_content)[0];
                            const skeletonDimensions = calculateSkeletonDimensions(url);
                            
                            // Calculate priority based on message recency (newest messages get higher priority)
                            const totalMessages = currentChatMessages.length;
                            const isNewest = index >= totalMessages - 5; // Last 5 messages
                            const messagePriority = isNewest ? PRIORITY_LEVELS.NEWEST : PRIORITY_LEVELS.NORMAL;
                            
                            return (
                              <LinkPreview 
                                url={url} 
                                isDarkMode={isDarkMode}
                                colors={colors}
                                initialDimensions={skeletonDimensions}
                                priority={messagePriority}
                                isOptimistic={isOptimisticMessage}
                              />
                            );
                          })()}
                          
                          <div
                            className={`${
                              msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image'
                                ? '' // No styling for sticker, voice, and image messages (they handle their own styling)
                                : `p-3 border-2 ${isOwnMessage ? 'bg-blue-50' : ''}`
                            }`}
                            style={msg.type === 'sticker' || msg.type === 'voice' || msg.type === 'image' ? {} : {
                              borderColor: colors.border,
                              backgroundColor: isOwnMessage ? (isDarkMode ? '#1E3A8A20' : '#EFF6FF') : colors.bg,
                              // Remove top border if there's a link preview
                              ...(hasLinkPreview ? { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 } : {})
                            }}
                          >
                            {msg.type === 'nft' && msg.nft_image_url && (
                              <div className="mb-2">
                                <img 
                                  src={msg.nft_image_url} 
                                  alt="NFT Message" 
                                  className="w-full max-w-[200px] rounded-sm"
                                />
                              </div>
                            )}
                            
                            {msg.type === 'sticker' && ((msg as any).sticker_name || msg.metadata?.sticker_name) && (
                              <div>
                                <img 
                                  src={`/Message-Stickers/${(msg as any).sticker_name || msg.metadata?.sticker_name}`} 
                                  alt="Sticker" 
                                  className="w-64 h-64"
                                  style={{ imageRendering: 'crisp-edges' }}
                                />
                              </div>
                            )}

                            {/* Voice Message */}
                            {msg.type === 'voice' && (
                              <VoiceMessageBubble
                                message={msg as any}
                                isOwnMessage={isOwnMessage}
                                colors={colors}
                                isDarkMode={isDarkMode}
                                isMobile={isMobile}
                                status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                isReadByRecipient={isReadByRecipient}
                              />
                            )}

                            {/* Image Message */}
                            {msg.type === 'image' && (
                              <ImageMessageBubble
                                message={msg}
                                onImageClick={(imageUrl) => window.open(imageUrl, '_blank')}
                                onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                isDarkMode={isDarkMode}
                                isOwnMessage={isOwnMessage}
                              />
                            )}

                            {/* Text content for image messages - show in colored bubble */}
                            {msg.type === 'image' && msg.message_content && msg.message_content.trim() && (
                              <div 
                                className="p-3 border-2 mt-2"
                                style={{
                                  borderColor: colors.border,
                                  backgroundColor: isOwnMessage ? (isDarkMode ? '#1E3A8A20' : '#EFF6FF') : colors.bg,
                                }}
                              >
                                <p 
                                  className="text-sm"
                                  style={{ 
                                    fontFamily: "Helvetica Neue, sans-serif",
                                    color: colors.text 
                                  }}
                                >
                                  {msg.message_content}
                                </p>
                                
                                {/* Timestamp/status inside text bubble for images with text */}
                                <div 
                                  className={`flex items-center mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                  <MessageStatus
                                    status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                    encrypted={isMessageEncrypted(msg)}
                                    timestamp={getMessageTimestamp(msg)}
                                    size="sm"
                                    isDarkMode={isDarkMode}
                                    onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                    showStatusIcon={isOwnMessage}
                                    isReadByRecipient={isReadByRecipient}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Timestamp/status for images without text - show directly after image */}
                            {msg.type === 'image' && (!msg.message_content || !msg.message_content.trim()) && (
                              <div 
                                className={`flex items-center mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              >
                                <MessageStatus
                                  status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                  encrypted={isMessageEncrypted(msg)}
                                  timestamp={getMessageTimestamp(msg)}
                                  size="sm"
                                  isDarkMode={isDarkMode}
                                  onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                  showStatusIcon={isOwnMessage}
                                  isReadByRecipient={isReadByRecipient}
                                />
                              </div>
                            )}

                          {/* Only show message text for non-sticker/voice/image messages or special messages with custom text */}
                          {((msg.type !== 'sticker' && msg.type !== 'voice' && msg.type !== 'image') || 
                            (msg.type === 'sticker' && msg.message_content !== 'Sent a sticker') ||
                            (msg.type === 'voice' && !msg.message_content.match(/^Voice message \(\d+s\)$/))) && (
                            <p 
                              className="text-sm"
                              style={{ 
                                fontFamily: "Helvetica Neue, sans-serif",
                                color: colors.text 
                              }}
                            >
                              {msg.type === 'text' && detectUrls(msg.message_content).length > 0 ? (
                                // Parse message and make URLs clickable
                                (() => {
                                  const urls = detectUrls(msg.message_content);
                                  let lastIndex = 0;
                                  const parts: React.ReactNode[] = [];
                                  
                                  urls.forEach((url, index) => {
                                    const urlIndex = msg.message_content.indexOf(url, lastIndex);
                                    
                                    // Add text before URL
                                    if (urlIndex > lastIndex) {
                                      parts.push(msg.message_content.slice(lastIndex, urlIndex));
                                    }
                                    
                                    // Add URL as clickable link
                                    parts.push(
                                      <a
                                        key={`url-${index}`}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="break-all overflow-wrap-anywhere"
                                        style={{
                                          color: '#3388FF',
                                          textDecoration: 'underline',
                                          cursor: 'pointer',
                                          overflowWrap: 'anywhere',
                                          wordBreak: 'break-all'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {url}
                                      </a>
                                    );
                                    
                                    lastIndex = urlIndex + url.length;
                                  });
                                  
                                  // Add remaining text
                                  if (lastIndex < msg.message_content.length) {
                                    parts.push(msg.message_content.slice(lastIndex));
                                  }
                                  
                                  return <>{parts}</>;
                                })()
                              ) : (
                                msg.message_content
                              )}
                            </p>
                          )}
                          {/* Show timestamp/status for all messages except voice and image (they handle their own) */}
                          {msg.type !== 'voice' && msg.type !== 'image' && (
                            <div 
                              className={`flex items-center mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                              style={{ opacity: msg.type === 'sticker' ? 0.8 : 1 }}
                            >
                              <MessageStatus
                                status={isOwnMessage ? getStatusFromMessage(msg) : 'received'}
                                encrypted={isMessageEncrypted(msg)}
                                timestamp={getMessageTimestamp(msg)}
                                size="sm"
                                isDarkMode={isDarkMode}
                                onRetry={getStatusFromMessage(msg) === 'failed' ? () => retryMessage(msg) : undefined}
                                showStatusIcon={isOwnMessage}
                                isReadByRecipient={isReadByRecipient}
                              />
                            </div>
                          )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
      </div>
    </>
  )
}

export default MessageDisplay