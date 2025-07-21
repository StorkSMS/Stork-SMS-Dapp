'use client'

import React from 'react'
import { Button } from '@/components/ui/button'

interface ChatStickerButtonProps {
  isOpen: boolean
  onClick: () => void
  colors: {
    bg: string
    text: string
    border: string
  }
  className?: string
}

const ChatStickerButton = React.forwardRef<HTMLButtonElement, ChatStickerButtonProps>(({
  isOpen,
  onClick,
  colors,
  className = ''
}, ref) => {
  return (
    <Button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`rounded-none p-0 hover:opacity-80 transition-all duration-200 ${className}`}
      style={{
        backgroundColor: isOpen ? colors.border : colors.bg,
        color: colors.text,
        border: `2px solid ${colors.border}`,
        height: '52px',
        width: '52px',
        transform: isOpen ? 'scale(0.95)' : 'scale(1)'
      }}
      aria-label={isOpen ? 'Close sticker picker' : 'Open sticker picker'}
      aria-pressed={isOpen}
    >
      {/* Chat sticker icon - different from NFT sticker picker */}
      <svg 
        className="w-5 h-5" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="8" cy="10" r="1" fill="currentColor" />
        <circle cx="16" cy="10" r="1" fill="currentColor" />
        <path d="M8 16s1.5 2 4 2 4-2 4-2" strokeLinecap="round" />
      </svg>
    </Button>
  )
})

ChatStickerButton.displayName = 'ChatStickerButton'

export default ChatStickerButton