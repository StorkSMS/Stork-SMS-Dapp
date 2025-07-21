import React from 'react'
import { Check, CheckCheck, Clock, X, Shield, Eye, Slash, RotateCcw } from 'lucide-react'

export type MessageStatusType = 'sending' | 'optimistic' | 'sent' | 'delivered' | 'read' | 'failed' | 'encrypted' | 'retrying' | 'received'

interface MessageStatusProps {
  status: MessageStatusType
  encrypted?: boolean
  timestamp?: string
  size?: 'sm' | 'md'
  isDarkMode?: boolean
  onRetry?: () => void
  showStatusIcon?: boolean
  isReadByRecipient?: boolean // New prop for read receipt confirmation
  timeRemaining?: string // For voice messages - shows expiration countdown
  isOwnMessage?: boolean // For positioning time remaining on correct side
}

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  encrypted = false,
  timestamp,
  size = 'sm',
  isDarkMode = false,
  onRetry,
  showStatusIcon = true,
  isReadByRecipient = false,
  timeRemaining,
  isOwnMessage = true
}) => {
  const colors = {
    sending: '#F59E0B',
    sent: '#6B7280',
    delivered: '#3B82F6',
    read: '#10B981',
    readConfirmed: '#3388FF', // #38F for confirmed read receipts
    failed: '#EF4444',
    encrypted: '#8B5CF6',
    text: isDarkMode ? '#E5E7EB' : '#374151',
    textSecondary: isDarkMode ? '#9CA3AF' : '#6B7280'
  }

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  const getStatusInfo = () => {
    switch (status) {
      case 'sending':
        return {
          icon: <Clock className={iconSize} />,
          color: colors.sending,
          text: 'Sending...'
        }
      case 'optimistic':
        return {
          icon: <Check className={iconSize} style={{ color: colors.textSecondary, transform: 'translateY(3px)' }} />,
          color: colors.textSecondary,
          text: 'Sending...'
        }
      case 'sent':
        return {
          icon: <CheckCheck className={iconSize} style={{ color: isReadByRecipient ? colors.readConfirmed : colors.textSecondary, transform: 'translateY(3px)' }} />,
          color: isReadByRecipient ? colors.readConfirmed : colors.textSecondary,
          text: 'Sent'
        }
      case 'delivered':
        return {
          icon: <CheckCheck className={iconSize} style={{ color: isReadByRecipient ? colors.readConfirmed : colors.textSecondary, transform: 'translateY(3px)' }} />,
          color: isReadByRecipient ? colors.readConfirmed : colors.textSecondary,
          text: 'Delivered'
        }
      case 'read':
        return {
          icon: <CheckCheck className={iconSize} style={{ color: isReadByRecipient ? colors.readConfirmed : colors.delivered, transform: 'translateY(3px)' }} />,
          color: isReadByRecipient ? colors.readConfirmed : colors.delivered,
          text: 'Read'
        }
      case 'failed':
        return {
          icon: <X className={iconSize} />,
          color: colors.failed,
          text: 'Failed'
        }
      case 'retrying':
        return {
          icon: <RotateCcw className={iconSize} />,
          color: colors.sending,
          text: 'Retrying...'
        }
      case 'encrypted':
        return {
          icon: <Shield className={iconSize} />,
          color: colors.encrypted,
          text: 'Encrypted'
        }
      case 'received':
        return {
          icon: null,
          color: colors.textSecondary,
          text: 'Received'
        }
      default:
        return {
          icon: <Clock className={iconSize} />,
          color: colors.sending,
          text: 'Unknown'
        }
    }
  }

  const statusInfo = getStatusInfo()

  if (timeRemaining && !isOwnMessage) {
    // For received messages with time remaining - use justify-between to separate status and time remaining
    return (
      <div className="flex items-baseline justify-between gap-1 w-full">
        {/* Left side: Main status content */}
        <div className="flex items-baseline gap-1">
          {/* Encryption indicator */}
          {encrypted && status !== 'encrypted' && (
            <Shield 
              className={iconSize} 
              style={{ color: colors.encrypted }}
            />
          )}
          
          {/* Status icon */}
          {showStatusIcon && statusInfo.icon && (
            <span 
              style={{ 
                color: statusInfo.color,
                transition: 'color 0.3s ease, opacity 0.3s ease',
                display: 'inline-flex',
                alignItems: 'baseline'
              }} 
              title={statusInfo.text}
              className={status === 'failed' && onRetry ? 'cursor-pointer hover:opacity-70' : ''}
              onClick={status === 'failed' && onRetry ? onRetry : undefined}
            >
              {statusInfo.icon}
            </span>
          )}
          
          {/* Timestamp */}
          {timestamp && (
            <span 
              className={textSize}
              style={{ color: colors.textSecondary }}
            >
              {new Date(timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          )}
        </div>
        
        {/* Right side: Time remaining */}
        <span 
          className={textSize}
          style={{ color: colors.textSecondary, fontSize: '11px' }}
        >
          {timeRemaining}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-baseline gap-1 ${timeRemaining && isOwnMessage ? 'w-full' : ''}`}>
      {/* Time remaining for voice messages - LEFT side for SENDER */}
      {timeRemaining && isOwnMessage && (
        <span 
          className={textSize}
          style={{ color: colors.textSecondary, fontSize: '11px' }}
        >
          {timeRemaining}
        </span>
      )}
      
      {/* Spacer to push status/timestamp to right for sender with time remaining */}
      {timeRemaining && isOwnMessage && <div className="flex-1" />}
      
      {/* Main status content */}
      <div className="flex items-baseline gap-1">
        {/* Encryption indicator */}
        {encrypted && status !== 'encrypted' && (
          <Shield 
            className={iconSize} 
            style={{ color: colors.encrypted }}
          />
        )}
        
        {/* Status icon */}
        {showStatusIcon && statusInfo.icon && (
          <span 
            style={{ 
              color: statusInfo.color,
              transition: 'color 0.3s ease, opacity 0.3s ease',
              display: 'inline-flex',
              alignItems: 'baseline'
            }} 
            title={statusInfo.text}
            className={status === 'failed' && onRetry ? 'cursor-pointer hover:opacity-70' : ''}
            onClick={status === 'failed' && onRetry ? onRetry : undefined}
          >
            {statusInfo.icon}
          </span>
        )}
        
        {/* Timestamp */}
        {timestamp && (
          <span 
            className={textSize}
            style={{ color: colors.textSecondary }}
          >
            {new Date(timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        )}
      </div>
    </div>
  )
}

// Hook for managing message status
export const useMessageStatus = () => {
  const getStatusFromMessage = (message: any): MessageStatusType => {
    // Check if message is optimistic (local, not yet confirmed by database)
    if (message.optimistic) return 'optimistic'
    if (message.metadata?.retrying) return 'retrying'
    if (message.metadata?.failed) return 'failed'
    if (message.metadata?.read_at) return 'read'
    if (message.metadata?.delivered_at) return 'delivered'
    if (message.metadata?.sent_at || message.created_at) return 'sent'
    return 'sending'
  }

  const isMessageEncrypted = (message: any): boolean => {
    return message.encrypted || message.metadata?.encrypted === true
  }

  const getMessageTimestamp = (message: any): string => {
    return message.metadata?.read_at || 
           message.metadata?.delivered_at || 
           message.metadata?.sent_at || 
           message.created_at ||
           new Date().toISOString()
  }

  return {
    getStatusFromMessage,
    isMessageEncrypted,
    getMessageTimestamp
  }
}