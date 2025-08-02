"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NFTPreviewCanvas from "@/components/NFTPreviewCanvas"

interface NewChatData {
  to: string
  from: string
  message: string
  selectedSticker?: string | null
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
  
  const canSubmit = connected && publicKey && isAuthenticated && !isAuthenticating && !isWaitingForSignature && newChatData.to && stickerState.getEffectiveMessage()
  
  const getSubmitButtonText = () => {
    if (!connected) return "Connect Wallet First"
    if (!publicKey) return "Wallet Connection Required"
    if (isAuthenticating) return "Authenticating..."
    if (!isAuthenticated) return "Authentication Required"
    if (isWaitingForSignature) return "Waiting for Signature..."
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
              <form onSubmit={onSubmit} className="flex flex-col gap-2 h-full">
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
                  <div 
                    className="border-2"
                    style={{ borderColor: colors.border }}
                  >
                    <Input
                      value={newChatData.to}
                      onChange={(e) => onChatDataChange({ ...newChatData, to: e.target.value })}
                      placeholder="Enter wallet address or username..."
                      className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                      style={{ 
                        fontFamily: "Helvetica Neue, sans-serif",
                        backgroundColor: colors.bg,
                        color: colors.text
                      }}
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
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8l-4 4-4-4" />
                        <path d="M20 4l-4 4" />
                      </svg>
                    </Button>
                  </div>
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
              <form onSubmit={onSubmit} className="flex flex-col gap-3 h-full">
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
                  <div 
                    className="border-2"
                    style={{ borderColor: colors.border }}
                  >
                    <Input
                      value={newChatData.to}
                      onChange={(e) => onChatDataChange({ ...newChatData, to: e.target.value })}
                      placeholder="Enter wallet address or username..."
                      className="border-none rounded-none focus:ring-0 focus:border-none h-12"
                      style={{ 
                      fontFamily: "Helvetica Neue, sans-serif",
                      color: colors.text
                    }}
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
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8l-4 4-4-4" />
                        <path d="M20 4l-4 4" />
                      </svg>
                    </Button>
                  </div>
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