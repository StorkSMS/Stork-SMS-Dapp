"use client"

import { useMemo } from 'react'

interface TypingIndicatorProps {
  typingUsers: Set<string>
  className?: string
  colors?: any
  isDarkMode?: boolean
}

export default function TypingIndicator({ typingUsers, className = '', colors, isDarkMode }: TypingIndicatorProps) {
  const typingUsersArray = useMemo(() => Array.from(typingUsers), [typingUsers])
  
  if (typingUsersArray.length === 0) {
    return null
  }

  // Get the first typing user for display (in case of multiple users)
  const primaryTypingUser = typingUsersArray[0]
  const shortAddress = `${primaryTypingUser.slice(0, 6)}...${primaryTypingUser.slice(-4)}`

  // Default colors if not provided
  const defaultColors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }
  const themeColors = colors || defaultColors

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="max-w-xs lg:max-w-md">
        {/* Sender info - matches normal message style */}
        <div className="text-xs mb-2" style={{ color: themeColors.textSecondary }}>
          {shortAddress}
        </div>
        
        {/* Message bubble - exactly like a received message */}
        <div 
          className="rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border relative"
          style={{
            backgroundColor: themeColors.bgSecondary,
            borderColor: themeColors.border,
            borderWidth: '1px'
          }}
        >
          <div className="flex items-center gap-2">
            <span 
              className="text-sm italic"
              style={{ 
                color: themeColors.textSecondary,
                fontFamily: 'Helvetica Neue, sans-serif'
              }}
            >
              Typing
            </span>
            
            {/* Animated typing dots */}
            <div className="flex gap-1">
              <div 
                className="w-1 h-1 rounded-full animate-bounce" 
                style={{ 
                  backgroundColor: themeColors.textSecondary,
                  animationDelay: '0ms',
                  animationDuration: '1200ms',
                  animationIterationCount: 'infinite'
                }}
              />
              <div 
                className="w-1 h-1 rounded-full animate-bounce" 
                style={{ 
                  backgroundColor: themeColors.textSecondary,
                  animationDelay: '200ms',
                  animationDuration: '1200ms',
                  animationIterationCount: 'infinite'
                }}
              />
              <div 
                className="w-1 h-1 rounded-full animate-bounce" 
                style={{ 
                  backgroundColor: themeColors.textSecondary,
                  animationDelay: '400ms',
                  animationDuration: '1200ms',
                  animationIterationCount: 'infinite'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}