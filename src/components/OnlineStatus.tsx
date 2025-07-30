"use client"

import { useState, useEffect } from 'react'

interface OnlineStatusProps {
  isOnline: boolean
  isTyping?: boolean
  showCopyFeedback?: boolean
  className?: string
}

export default function OnlineStatus({ isOnline, isTyping = false, showCopyFeedback = false, className = '' }: OnlineStatusProps) {
  const [dots, setDots] = useState('')

  // Animate the dots when typing
  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev === '') return '.'
          if (prev === '.') return '..'
          if (prev === '..') return '...'
          return ''
        })
      }, 500)

      return () => clearInterval(interval)
    } else {
      setDots('')
    }
  }, [isTyping])

  // Determine colors and text based on state
  const getStatusColor = () => {
    if (showCopyFeedback) return '#38F' // Bright blue when showing copy feedback
    if (isTyping) return '#38F' // Bright blue when typing
    if (isOnline) return '#10B981' // Green when online
    return '#6B7280' // Gray when offline
  }

  const getStatusText = () => {
    if (showCopyFeedback) return 'Address copied to clipboard'
    if (isTyping) return `User typing${dots}`
    if (isOnline) return 'User online'
    return 'User offline'
  }

  const statusColor = getStatusColor()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status dot */}
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: statusColor,
          boxShadow: (isOnline || isTyping || showCopyFeedback) ? `0 0 4px ${statusColor}40` : 'none'
        }}
      />
      
      {/* Status text */}
      <span 
        className="text-xs transition-colors duration-200"
        style={{ 
          color: statusColor,
          fontFamily: 'Helvetica Neue, sans-serif'
        }}
      >
        {getStatusText()}
      </span>
    </div>
  )
}