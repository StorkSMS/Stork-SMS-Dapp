"use client"

import React from 'react'
import { User } from 'lucide-react'

interface ContactHeaderProps {
  contactName: string
  contactAddress: string
  profilePictureUrl?: string
  onClick: (address: string) => void
  showCopyToast?: boolean
  isDarkMode?: boolean
  className?: string
  style?: React.CSSProperties
  isMobile?: boolean
}

const ContactHeader: React.FC<ContactHeaderProps> = ({
  contactName,
  contactAddress,
  profilePictureUrl,
  onClick,
  showCopyToast = false,
  isDarkMode = false,
  className = '',
  style = {},
  isMobile = false
}) => {
  const colors = {
    text: isDarkMode ? '#FFF' : '#000',
    textSecondary: isDarkMode ? '#CCC' : '#666',
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    border: isDarkMode ? '#FFF' : '#000'
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick(contactAddress)
  }

  const formatAddress = (address: string) => {
    if (address.length > 12) {
      return `${address.slice(0, 8)}...${address.slice(-4)}`
    }
    return address
  }

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      style={style}
      onClick={handleClick}
    >
      {/* Profile Picture */}
      <div 
        className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden border-2 flex items-center justify-center bg-gray-100 dark:bg-gray-800`}
        style={{
          borderColor: colors.border,
          backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9'
        }}
      >
        {profilePictureUrl ? (
          <img
            src={profilePictureUrl}
            alt={`${contactName}'s profile picture`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image and show fallback icon
              e.currentTarget.style.display = 'none'
              const fallbackIcon = e.currentTarget.parentElement?.querySelector('.fallback-icon') as HTMLElement
              if (fallbackIcon) {
                fallbackIcon.classList.remove('hidden')
              }
            }}
          />
        ) : null}
        <User 
          className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} fallback-icon ${profilePictureUrl ? 'hidden' : ''}`}
          style={{ color: colors.textSecondary }}
        />
      </div>

      {/* Contact Info */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Contact Name - Primary */}
        <div 
          className={`font-medium ${isMobile ? 'text-base' : 'text-lg'} truncate`}
          style={{ 
            fontFamily: "Helvetica Neue, sans-serif",
            color: colors.text
          }}
          title={contactName}
        >
          {contactName}
        </div>
        
        {/* Wallet Address - Secondary */}
        <div 
          className={`${isMobile ? 'text-xs' : 'text-sm'} truncate`}
          style={{ 
            fontFamily: "Helvetica Neue, sans-serif",
            color: colors.textSecondary
          }}
          title={contactAddress}
        >
          {formatAddress(contactAddress)}
        </div>
      </div>

      {/* Copy Toast Feedback */}
      {showCopyToast && (
        <div 
          className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-50"
          style={{
            backgroundColor: isDarkMode ? '#333' : '#000',
            color: '#FFF'
          }}
        >
          Address copied!
        </div>
      )}
    </div>
  )
}

export default ContactHeader