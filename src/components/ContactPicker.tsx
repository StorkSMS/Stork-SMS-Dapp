'use client'

import React, { useState, useEffect, useRef } from 'react'
import { User } from 'lucide-react'
import type { Contact, ContactsData, ContactPickerProps } from '@/types/contacts'

export default function ContactPicker({
  selectedContact,
  onContactSelect,
  className = '',
  isOpen = false,
  onClose,
  isDarkMode = false,
  triggerRef,
  searchQuery = '',
  highlightedIndex = -1,
  contacts = [],
  loading = false,
  error = false
}: ContactPickerProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Contacts are now provided via props

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Don't close if clicking on the dropdown itself or the trigger button
      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          triggerRef?.current && !triggerRef.current.contains(target)) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleContactClick = (contact: Contact) => {
    onContactSelect(contact)
    onClose?.() // Close dropdown after selection
  }

  const truncateAddress = (address: string, startLength: number = 4, endLength: number = 4) => {
    if (address.length <= startLength + endLength) return address
    return `${address.slice(0, startLength)}...${address.slice(-endLength)}`
  }

  if (!isOpen) return null

  return (
    <div 
      ref={dropdownRef}
      className={`absolute top-full left-0 z-[130] mt-1 ${className}`}
      style={{
        backgroundColor: colors.bg,
        border: `2px solid ${colors.border}`,
        maxHeight: '200px',
        overflowY: 'auto',
        width: 'calc(100% - 60px)' // Account for the button width (48px) + gap (12px)
      }}
    >
      {/* Paper texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/Paper-Texture-7.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          mixBlendMode: 'multiply',
          opacity: isDarkMode ? 0.8 : 0.4
        }}
      />
      
      <div className="relative z-10">
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            <span 
              className="ml-2 text-sm"
              style={{ 
                fontFamily: 'Helvetica Neue, sans-serif',
                color: colors.textSecondary
              }}
            >
              Loading contacts...
            </span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center p-4 text-center">
            <span 
              className="text-sm"
              style={{ 
                fontFamily: 'Helvetica Neue, sans-serif',
                color: colors.textSecondary
              }}
            >
              Failed to load contacts
            </span>
          </div>
        )}
        
        {!loading && !error && contacts.length === 0 && (
          <div className="flex items-center justify-center p-4 text-center">
            <span 
              className="text-sm"
              style={{ 
                fontFamily: 'Helvetica Neue, sans-serif',
                color: colors.textSecondary
              }}
            >
              No contacts available
            </span>
          </div>
        )}
        
        {!loading && !error && contacts.length > 0 && (() => {
          // Filter contacts based on search query
          const filteredContacts = contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contact.publicAddress.toLowerCase().includes(searchQuery.toLowerCase())
          )
          
          if (filteredContacts.length === 0) {
            return (
              <div className="flex items-center justify-center p-4 text-center">
                <span 
                  className="text-sm"
                  style={{ 
                    fontFamily: 'Helvetica Neue, sans-serif',
                    color: colors.textSecondary
                  }}
                >
                  No contacts match "{searchQuery}"
                </span>
              </div>
            )
          }
          
          return (
            <div>
              {filteredContacts.map((contact, index) => {
                const isSelected = selectedContact?.id === contact.id
                const isHighlighted = index === highlightedIndex
                
                return (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className={`
                    w-full p-3 text-left hover:opacity-80 transition-all duration-200
                    border-b border-opacity-20 flex items-center gap-3
                    ${isSelected 
                      ? 'bg-blue-50 bg-opacity-50' 
                      : isHighlighted 
                        ? 'bg-gray-100 bg-opacity-70' 
                        : 'hover:bg-gray-50 hover:bg-opacity-30'
                    }
                  `}
                  style={{
                    backgroundColor: isSelected 
                      ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 246, 255, 0.5)')
                      : isHighlighted 
                        ? (isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                        : 'transparent',
                    borderBottomColor: colors.border,
                    fontFamily: 'Helvetica Neue, sans-serif',
                    color: colors.text
                  }}
                  aria-label={`Select contact: ${contact.name}`}
                >
                  {/* Profile Picture or Placeholder */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                    {contact.pfp ? (
                      <img
                        src={contact.pfp}
                        alt={`${contact.name}'s profile picture`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Replace with placeholder on error
                          e.currentTarget.style.display = 'none'
                          const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-icon') as HTMLElement
                          if (placeholder) placeholder.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <User className={`w-4 h-4 text-gray-400 placeholder-icon ${contact.pfp ? 'hidden' : ''}`} />
                  </div>
                  
                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {contact.name}
                    </div>
                    <div 
                      className="text-xs truncate"
                      style={{ color: colors.textSecondary }}
                    >
                      {truncateAddress(contact.publicAddress, 6, 4)}
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          )
        })()}
      </div>
    </div>
  )
}