"use client"

import React, { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import ChatStickerPicker from "@/components/ChatStickerPicker"
import ChatStickerButton from "@/components/ChatStickerButton"
import ExpandingVoiceRecorder from "@/components/ExpandingVoiceRecorder"
import FileUploadButton from "@/components/FileUploadButton"
import ImagePreview from "@/components/ImagePreview"

interface MessageInputProps {
  // State
  message: string
  isInputFocused: boolean
  isChatStickerPickerOpen: boolean
  selectedImages: File[]
  
  // Display
  isMobile: boolean
  isDarkMode: boolean
  
  // Auth/connection
  connected: boolean
  publicKey: string | null
  isAuthenticated: boolean
  
  // Refs
  chatStickerButtonRef: RefObject<HTMLButtonElement>
  
  // Actions
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSendMessage: (e: React.FormEvent) => void
  onInputFocus: () => void
  onInputBlur: () => void
  onStickerPickerToggle: () => void
  onStickerPickerClose: () => void
  onStickerSend: (stickerName: string) => void
  onFileSelect: (file: File) => void
  onRemoveImage: (index: number) => void
  onSendVoice: (audioBlob: Blob, duration: number) => void
  
  // Helper
  handleNewChat: () => void
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  isInputFocused,
  isChatStickerPickerOpen,
  selectedImages,
  isMobile,
  isDarkMode,
  connected,
  publicKey,
  isAuthenticated,
  chatStickerButtonRef,
  onMessageChange,
  onSendMessage,
  onInputFocus,
  onInputBlur,
  onStickerPickerToggle,
  onStickerPickerClose,
  onStickerSend,
  onFileSelect,
  onRemoveImage,
  onSendVoice,
  handleNewChat,
}) => {
  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }
  
  const canSend = (message.trim() || selectedImages.length > 0) && connected && publicKey && isAuthenticated
  
  return (
    <>
      {/* Input Area - Fixed Container */}
      <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0' : 'relative'} flex items-center justify-center flex-shrink-0 z-[999]`} style={{ 
        backgroundColor: colors.bg, 
        borderTop: `4px solid ${colors.border}`,
        height: '80px',
        padding: '0 20px'
      }}>
        
        {/* Solid background layer - above sticker picker */}
        <div 
          className="absolute z-[2]"
          style={{
            backgroundColor: colors.bg,
            top: '0',
            left: '-2px',
            right: '-2px',
            bottom: '-2px'
          }}
        />
        {/* Chat Sticker Picker - Positioned above input, full width */}
        <ChatStickerPicker
          isOpen={isChatStickerPickerOpen}
          onStickerSend={onStickerSend}
          onClose={onStickerPickerClose}
          colors={colors}
          isDarkMode={isDarkMode}
          buttonRef={chatStickerButtonRef}
        />
        
        {/* Image Previews - positioned above input area */}
        {selectedImages.length > 0 && (
          <div 
            className="absolute bottom-full left-0 right-0 p-3 flex flex-wrap gap-3 z-[2]"
            style={{
              backgroundColor: colors.bg,
              borderTop: `2px solid ${colors.border}`
            }}
          >
            {selectedImages.map((file, index) => (
              <ImagePreview
                key={`${file.name}-${file.lastModified}-${index}`}
                file={file}
                onRemove={() => onRemoveImage(index)}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>
        )}
        
        {/* Paper Texture Overlay */}
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
        <div className="w-full" style={{ maxWidth: 'calc(72rem - 5px)' }}>
          
          {/* Input Controls Container - moved outside form to isolate voice recorder */}
          <div className="flex items-center gap-1 w-full relative z-[3] transition-all duration-300 ease-in-out">
            <form onSubmit={onSendMessage} className="flex items-center gap-3 flex-1 transition-all duration-300 ease-in-out">
              <div className="flex-1 flex items-center transition-all duration-300 ease-in-out" style={{ border: `2px solid ${colors.border}` }}>
                <Input
                  value={message}
                  onChange={onMessageChange}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                  placeholder="Type your message..."
                  disabled={!connected || !publicKey || !isAuthenticated}
                  className="flex-1 border-none rounded-none focus:ring-0 focus:border-none h-12 disabled:opacity-50"
                  style={{ 
                    fontFamily: "Helvetica Neue, sans-serif",
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}
                />
                <Button
                  type="submit"
                  onClick={(e) => {
                    if (!canSend) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  className="rounded-none h-12 w-12 p-0 hover:opacity-80"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    borderLeft: `2px solid ${colors.border}`
                  }}
                >
                  <Send 
                    className="w-4 h-4 transition-opacity duration-200" 
                    style={{ 
                      opacity: canSend ? 1 : 0.3
                    }} 
                  />
                </Button>
              </div>

              {/* Chat Sticker Button - kept inside form */}
              {!(isMobile && isInputFocused) && (
                <ChatStickerButton
                  ref={chatStickerButtonRef}
                  isOpen={isChatStickerPickerOpen}
                  onClick={onStickerPickerToggle}
                  colors={colors}
                />
              )}
            </form>

            {/* File Upload Button - outside form to prevent interference */}
            {!(isMobile && isInputFocused) && (
              <FileUploadButton
                onFileSelect={onFileSelect}
                colors={colors}
                disabled={!connected || !publicKey || !isAuthenticated}
              />
            )}

            {/* Voice Recorder - moved OUTSIDE form to prevent interference */}
            {!isMobile && (
              <ExpandingVoiceRecorder
                onSend={onSendVoice}
                colors={colors}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default MessageInput