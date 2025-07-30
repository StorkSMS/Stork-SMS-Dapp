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
      {/* Chat sticker icon - sticky note design */}
      <svg 
        className="w-5 h-5" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
        <path d="M15 3v4a2 2 0 0 0 2 2h4"/>
      </svg>
    </Button>
  )
})

ChatStickerButton.displayName = 'ChatStickerButton'

export default ChatStickerButton