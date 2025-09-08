"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NFTPreviewCanvas from "@/components/NFTPreviewCanvas"
import PaymentToggle, { type PaymentMethod } from "@/components/ui/PaymentToggle"
import ContactPicker from "@/components/ContactPicker"
import type { Contact } from "@/types/contacts"
import { useContacts } from "@/hooks/useContacts"
import { useDomainResolution } from "@/hooks/useDomainResolution"

interface NewChatData {
  to: string
  from: string
  message: string
  selectedSticker?: string | null
  paymentMethod?: PaymentMethod
}

interface StickerState {
  currentMessage: string
  selectedSticker: string | null
  isStickerHidden: boolean
  isTextFaded: boolean
  getEffectiveMessage: () => string
  handleMessageChange: (value: string) => void
  handleStickerSelect: (sticker: string | null) => void
  setCurrentMessage: (value: string) => void
}

interface NewChatModalProps {
  isOpen: boolean
  isMobile: boolean
  isDarkMode: boolean
  connected: boolean
  publicKey: string | null
  isAuthenticated: boolean
  isAuthenticating: boolean
  isWaitingForSignature: boolean
  
  newChatData: NewChatData
  stickerState: StickerState
  
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onChatDataChange: (data: NewChatData) => void
  onStickerPickerOpen: () => void
  onCanvasReady: (canvasDataUrl: string) => void
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  isMobile,
  isDarkMode,
  connected,
  publicKey,
  isAuthenticated,
  isAuthenticating,
  isWaitingForSignature,
  newChatData,
  stickerState,
  onClose,
  onSubmit,
  onChatDataChange,
  onStickerPickerOpen,
  onCanvasReady,
}) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const contactButtonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { contacts, loading: contactsLoading, error: contactsError, filterContacts } = useContacts()
  
  // Domain resolution hook
  const {
    isResolving: isDomainResolving,
    result: domainResult,
    error: domainError,
    debouncedResolveInput,
    clearResult: clearDomainResult,
    getDisplayAddress,
    getValidationMessage,
    isDomainFormat
  } = useDomainResolution()
  
  if (!isOpen) return null
  
  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }
  
  const handleContactSelect = (contact: Contact | null) => {
    setSelectedContact(contact)
    if (contact) {
      onChatDataChange({ ...newChatData, to: contact.publicAddress })
    } else {
      onChatDataChange({ ...newChatData, to: '' })
    }
  }
  
  const handleClearContact = () => {
    setSelectedContact(null)
    onChatDataChange({ ...newChatData, to: '' })
    setSearchQuery('')
    setIsContactPickerOpen(false)
    setHighlightedIndex(-1)
    clearDomainResult()
  }
  
  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear selected contact if user starts typing
    if (selectedContact && value !== selectedContact.publicAddress) {
      setSelectedContact(null)
    }
    
    // Always update the input value first, but trim spaces for wallet addresses
    const trimmedValue = value.trim()
    onChatDataChange({ ...newChatData, to: trimmedValue })
    
    // Handle domain resolution
    if (isDomainFormat(value)) {
      // This looks like a domain - resolve it
      debouncedResolveInput(value, 300)
    } else if (value.length >= 32) {
      // This might be a wallet address - resolve it to validate
      debouncedResolveInput(value, 300)
    } else {
      // Regular input - clear domain result
      clearDomainResult()
    }
    
    // Show dropdown if user is typing and it's not a domain format
    if (value.trim().length > 0 && !selectedContact && !isDomainFormat(value)) {
      setIsContactPickerOpen(true)
      setHighlightedIndex(-1)
    } else if (value.trim().length === 0 || isDomainFormat(value)) {
      setIsContactPickerOpen(false)
      setHighlightedIndex(-1)
    }
  }
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const filteredContacts = filterContacts(searchQuery)
    
    if (!isContactPickerOpen || filteredContacts.length === 0) return
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredContacts.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredContacts.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < filteredContacts.length) {
          handleContactSelect(filteredContacts[highlightedIndex])
          setIsContactPickerOpen(false)
          setHighlightedIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsContactPickerOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }
  
  const handleContactPickerToggle = () => {
    setIsContactPickerOpen(!isContactPickerOpen)
    if (!isContactPickerOpen) {
      setHighlightedIndex(-1)
    }
  }
  
  // We need this function to calculate filtered contacts for keyboard navigation
  const getFilteredContacts = (allContacts: Contact[], query: string) => {
    return allContacts.filter(contact =>
      contact.name.toLowerCase().includes(query.toLowerCase()) ||
      contact.publicAddress.toLowerCase().includes(query.toLowerCase())
    )
  }
  
  const handleContactPickerClose = () => {
    setIsContactPickerOpen(false)
  }
  
  // Custom form submission that uses resolved addresses
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get the resolved address (could be from domain resolution, contact, or direct input)
    const resolvedAddress = getResolvedAddress()
    
    if (!resolvedAddress) {
      console.warn('No resolved address available for submission')
      return
    }
    
    // Always ensure the chat data has the final resolved address
    if (resolvedAddress !== newChatData.to) {
      console.log(`📝 Updating chat data with resolved address: ${newChatData.to} -> ${resolvedAddress}`)
      onChatDataChange({ ...newChatData, to: resolvedAddress })
      
      // Use setTimeout to ensure state updates before submission
      setTimeout(() => {
        onSubmit(e)
      }, 10)
    } else {
      onSubmit(e)
    }
  }
  
  // Enhanced submit validation that considers domain resolution
  const getResolvedAddress = () => {
    if (selectedContact) {
      return selectedContact.publicAddress
    }
    if (domainResult && domainResult.isValid) {
      return domainResult.address
    }
    return newChatData.to
  }
  
  // Enhanced submit validation that considers domain resolution
  const canSubmit = (() => {
    // Basic authentication checks
    if (!connected || !publicKey || !isAuthenticated || isAuthenticating || isWaitingForSignature) {
      return false
    }
    
    // Must have a message
    if (!stickerState.getEffectiveMessage()) {
      return false
    }
    
    // Must have a recipient
    const resolvedAddress = getResolvedAddress()
    if (!resolvedAddress) {
      return false
    }
    
    // If we're currently resolving a domain, don't allow submit yet
    if (isDomainResolving) {
      return false
    }
    
    // If we have a domain result, it must be valid
    if (domainResult) {
      return domainResult.isValid
    }
    
    // For non-domain inputs, just check we have something valid
    return resolvedAddress.length > 0
  })()
  
  const getSubmitButtonText = () => {
    if (!connected) return "Connect Wallet First"
    if (!publicKey) return "Wallet Connection Required"
    if (isAuthenticating) return "Authenticating..."
    if (!isAuthenticated) return "Authentication Required"
    if (isWaitingForSignature) return "Waiting for Signature..."
    if (isDomainResolving) return "Resolving Domain..."
    if (domainResult && !domainResult.isValid) return "Invalid Domain"
    if (!getResolvedAddress()) return "Enter Recipient"
    if (!stickerState.getEffectiveMessage()) return "Enter Message"
    return "Create NFT Chat"
  }
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110]"
      onClick={handleOverlayClick}
    >
      <div
        className={`border-4 relative ${
          isMobile ? 'w-full h-full flex flex-col overflow-y-auto' : 'w-[850px] h-[400px] flex'
        }`}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper Texture Over Modal */}
        <div 
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            backgroundImage: 'url(/Paper-Texture-7.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            mixBlendMode: 'multiply',
            opacity: isDarkMode ? 0.8 : 0.4
          }}
        />
        {isMobile ? (
          <>
            {/* Mobile: X Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-[10] w-8 h-8 flex items-center justify-center"
              style={{
                fontFamily: "Helvetica Neue, sans-serif",
                fontSize: "24px",
                fontWeight: "300",
                color: colors.text,
                backgroundColor: "transparent",
                border: "none",
              }}
            >
              ×
            </button>
            
            {/* Mobile: Chat Preview on Top - Perfect Square */}
            <div 
              className="w-[280px] h-[280px] ml-6 flex items-center justify-center flex-shrink-0 relative z-[2] mt-12"
            >
              <NFTPreviewCanvas
                messageContent={stickerState.getEffectiveMessage()}
                selectedSticker={stickerState.selectedSticker}
                isStickerHidden={stickerState.isStickerHidden}
                isTextFaded={stickerState.isTextFaded}
                width={280}
                height={280}
                className="rounded-sm"
                onCanvasReady={onCanvasReady}
              />
            </div>

            {/* Mobile: Form Section Below */}
            <div className="flex-1 p-6 flex flex-col relative z-[2]">
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 h-full">
                {/* To Field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                  >
                    To
                  </label>
                  <div className="flex items-center gap-3 relative">
                    <div 
                      className="flex-1 border-2"
                      style={{ borderColor: colors.border }}
                    >
                      {selectedContact ? (
                        /* Contact Card */
                        <div 
                          className="h-12 flex items-center justify-between px-3"
                          style={{ 
                            fontFamily: "Helvetica Neue, sans-serif",
                            backgroundColor: colors.bg,
                            color: colors.text
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Profile Picture */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {selectedContact.pfp ? (
                                <img
                                  src={selectedContact.pfp}
                                  alt={`${selectedContact.name}'s profile picture`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-icon') as HTMLElement
                                    if (placeholder) placeholder.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <svg className={`w-4 h-4 text-gray-400 placeholder-icon ${selectedContact.pfp ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            </div>
                            
                            {/* Contact Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {selectedContact.name}
                              </div>
                              <div 
                                className="text-xs truncate"
                                style={{ color: colors.textSecondary }}
                              >
                                {selectedContact.publicAddress.slice(0, 6)}...{selectedContact.publicAddress.slice(-4)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Clear Button */}
                          <button
                            onClick={handleClearContact}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                            style={{ color: colors.textSecondary }}
                            aria-label="Clear selected contact"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <Input
                          ref={inputRef}
                          value={searchQuery || newChatData.to}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Enter wallet address, .sol/.skr domain, or search contacts..."
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                            fontFamily: "Helvetica Neue, sans-serif",
                            backgroundColor: colors.bg,
                            color: colors.text
                          }}
                        />
                      )}
                    </div>

                    {/* Contacts Button */}
                    <Button
                      ref={contactButtonRef}
                      type="button"
                      onClick={handleContactPickerToggle}
                      className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                        isContactPickerOpen ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                      style={{
                        backgroundColor: isContactPickerOpen ? '#EFF6FF' : colors.bg,
                        color: isContactPickerOpen ? '#3B82F6' : colors.text,
                        border: `2px solid ${isContactPickerOpen ? '#3B82F6' : colors.border}`
                      }}
                    >
                      {/* Contacts icon */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </Button>
                    
                    {/* Contact Picker Dropdown */}
                    <ContactPicker
                      selectedContact={selectedContact}
                      onContactSelect={handleContactSelect}
                      isOpen={isContactPickerOpen}
                      onClose={handleContactPickerClose}
                      isDarkMode={isDarkMode}
                      triggerRef={contactButtonRef}
                      searchQuery={searchQuery}
                      highlightedIndex={highlightedIndex}
                      contacts={contacts}
                      loading={contactsLoading}
                      error={contactsError}
                    />
                  </div>
                  
                </div>

                {/* From Field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                  >
                    From
                  </label>
                  <div 
                    className="border-2"
                    style={{ borderColor: colors.border }}
                  >
                    <Input
                      value={newChatData.from}
                      onChange={(e) => onChatDataChange({ ...newChatData, from: e.target.value })}
                      placeholder={connected ? "Auto-filled from connected wallet" : "Connect wallet to auto-fill"}
                      className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                      style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                      disabled={connected}
                    />
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label
                      className="text-sm font-medium"
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.text
                      }}
                    >
                      Message
                    </label>
                    {stickerState.selectedSticker && stickerState.currentMessage && (
                      <span
                        className="text-xs"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.textSecondary,
                          opacity: 0.7
                        }}
                      >
                        *Message included in metadata
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex-1 transition-opacity duration-300"
                      style={{ 
                        border: `2px solid ${colors.border}`,
                        opacity: stickerState.isTextFaded ? 0.5 : 1
                      }}
                    >
                      <Input
                        value={stickerState.currentMessage}
                        onChange={(e) => {
                          const value = e.target.value
                          stickerState.handleMessageChange(value)
                          // Also update newChatData to keep them in sync
                          onChatDataChange({ ...newChatData, message: value })
                        }}
                        placeholder="Type your invitation message..."
                        className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                        style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                      />
                    </div>

                    {/* Sticker Button */}
                    <Button
                      type="button"
                      onClick={onStickerPickerOpen}
                      className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                        stickerState.selectedSticker ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                      style={{
                        backgroundColor: stickerState.selectedSticker ? '#EFF6FF' : colors.bg,
                        color: stickerState.selectedSticker ? '#3B82F6' : colors.text,
                        border: `2px solid ${stickerState.selectedSticker ? '#3B82F6' : colors.border}`
                      }}
                    >
                      {/* Sticker icon - sticky note design */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
                        <path d="M15 3v4a2 2 0 0 0 2 2h4"/>
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Payment Method Toggle - Mobile */}
                <div>
                  <PaymentToggle
                    selectedPaymentMethod={newChatData.paymentMethod || 'SOL'}
                    onPaymentMethodChange={(method) => onChatDataChange({ ...newChatData, paymentMethod: method })}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* Action Button - Only Submit on Mobile */}
                <div className="pt-1 mt-auto">
                  <Button
                    type="submit"
                    className="w-full bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-10 disabled:opacity-50"
                    style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                    disabled={!canSubmit}
                  >
                    {getSubmitButtonText()}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* Desktop: Preview Box - Perfect Square */}
            <div 
              className="w-[400px] h-full border-r-4 flex items-center justify-center flex-shrink-0 relative z-[2]"
              style={{
                backgroundColor: colors.bg,
                borderRightColor: colors.border
              }}
            >
              <NFTPreviewCanvas
                messageContent={stickerState.getEffectiveMessage()}
                selectedSticker={stickerState.selectedSticker}
                isStickerHidden={stickerState.isStickerHidden}
                isTextFaded={stickerState.isTextFaded}
                width={360}
                height={360}
                className="rounded-sm"
                onCanvasReady={onCanvasReady}
              />
            </div>

            {/* Desktop: Form Section */}
            <div className="flex-1 p-4 flex flex-col relative z-[2]">
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 h-full">
                {/* To Field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                  >
                    To
                  </label>
                  <div className="flex items-center gap-3 relative">
                    <div 
                      className="flex-1 border-2"
                      style={{ borderColor: colors.border }}
                    >
                      {selectedContact ? (
                        /* Contact Card */
                        <div 
                          className="h-12 flex items-center justify-between px-3"
                          style={{ 
                            fontFamily: "Helvetica Neue, sans-serif",
                            backgroundColor: colors.bg,
                            color: colors.text
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Profile Picture */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                              {selectedContact.pfp ? (
                                <img
                                  src={selectedContact.pfp}
                                  alt={`${selectedContact.name}'s profile picture`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-icon') as HTMLElement
                                    if (placeholder) placeholder.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <svg className={`w-4 h-4 text-gray-400 placeholder-icon ${selectedContact.pfp ? 'hidden' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                            </div>
                            
                            {/* Contact Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {selectedContact.name}
                              </div>
                              <div 
                                className="text-xs truncate"
                                style={{ color: colors.textSecondary }}
                              >
                                {selectedContact.publicAddress.slice(0, 6)}...{selectedContact.publicAddress.slice(-4)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Clear Button */}
                          <button
                            onClick={handleClearContact}
                            className="flex-shrink-0 w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                            style={{ color: colors.textSecondary }}
                            aria-label="Clear selected contact"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <Input
                          value={searchQuery || newChatData.to}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onKeyDown={handleInputKeyDown}
                          placeholder="Enter wallet address, .sol/.skr domain, or search contacts..."
                          className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                          style={{ 
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.text
                        }}
                        />
                      )}
                    </div>

                    {/* Contacts Button */}
                    <Button
                      ref={contactButtonRef}
                      type="button"
                      onClick={handleContactPickerToggle}
                      className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                        isContactPickerOpen ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                      style={{
                        backgroundColor: isContactPickerOpen ? '#EFF6FF' : colors.bg,
                        color: isContactPickerOpen ? '#3B82F6' : colors.text,
                        border: `2px solid ${isContactPickerOpen ? '#3B82F6' : colors.border}`
                      }}
                    >
                      {/* Contacts icon */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </Button>
                    
                    {/* Contact Picker Dropdown */}
                    <ContactPicker
                      selectedContact={selectedContact}
                      onContactSelect={handleContactSelect}
                      isOpen={isContactPickerOpen}
                      onClose={handleContactPickerClose}
                      isDarkMode={isDarkMode}
                      triggerRef={contactButtonRef}
                      searchQuery={searchQuery}
                      highlightedIndex={highlightedIndex}
                      contacts={contacts}
                      loading={contactsLoading}
                      error={contactsError}
                    />
                  </div>
                  
                </div>

                {/* From Field */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                  >
                    From
                  </label>
                  <div 
                    className="border-2"
                    style={{ borderColor: colors.border }}
                  >
                    <Input
                      value={newChatData.from}
                      onChange={(e) => onChatDataChange({ ...newChatData, from: e.target.value })}
                      placeholder={connected ? "Auto-filled from connected wallet" : "Connect wallet to auto-fill"}
                      className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                      style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                      disabled={connected}
                    />
                  </div>
                </div>

                {/* Message Input */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label
                      className="text-sm font-medium"
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        color: colors.text
                      }}
                    >
                      Message
                    </label>
                    {stickerState.selectedSticker && stickerState.currentMessage && (
                      <span
                        className="text-xs"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          color: colors.textSecondary,
                          opacity: 0.7
                        }}
                      >
                        *Message included in metadata
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex-1 transition-opacity duration-300"
                      style={{ 
                        border: `2px solid ${colors.border}`,
                        opacity: stickerState.isTextFaded ? 0.5 : 1
                      }}
                    >
                      <Input
                        value={stickerState.currentMessage}
                        onChange={(e) => {
                          const value = e.target.value
                          stickerState.handleMessageChange(value)
                          // Also update newChatData to keep them in sync
                          onChatDataChange({ ...newChatData, message: value })
                        }}
                        placeholder="Type your invitation message..."
                        className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                        style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
                      />
                    </div>

                    {/* Sticker Button */}
                    <Button
                      type="button"
                      onClick={onStickerPickerOpen}
                      className={`rounded-none h-12 w-12 p-0 hover:opacity-80 ${
                        stickerState.selectedSticker ? 'bg-blue-50 border-blue-500' : ''
                      }`}
                      style={{
                        backgroundColor: stickerState.selectedSticker ? '#EFF6FF' : colors.bg,
                        color: stickerState.selectedSticker ? '#3B82F6' : colors.text,
                        border: `2px solid ${stickerState.selectedSticker ? '#3B82F6' : colors.border}`
                      }}
                    >
                      {/* Sticker icon - sticky note design */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
                        <path d="M15 3v4a2 2 0 0 0 2 2h4"/>
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Payment Method Toggle - Desktop */}
                <div>
                  <PaymentToggle
                    selectedPaymentMethod={newChatData.paymentMethod || 'SOL'}
                    onPaymentMethodChange={(method) => onChatDataChange({ ...newChatData, paymentMethod: method })}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-2 mt-auto">
                  <Button
                    type="submit"
                    className="flex-1 bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-12 disabled:opacity-50"
                    style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
                    disabled={!canSubmit}
                  >
                    {getSubmitButtonText()}
                  </Button>
                  <Button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-none h-12 hover:opacity-80"
                    style={{ 
                      fontFamily: "Helvetica Neue, sans-serif", 
                      fontWeight: 500,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `2px solid ${colors.border}`
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default NewChatModal