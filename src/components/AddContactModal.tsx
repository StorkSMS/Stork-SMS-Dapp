"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Upload, X, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import useContactManagement from "@/hooks/useContactManagement"
import { processContactAvatar } from "@/lib/image-processing"
import type { AddContactModalProps } from "@/types/contacts"

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onContactAdded,
  isDarkMode = false
}) => {
  const { isAuthenticated, walletAddress } = useAuth()
  const { 
    addContact, 
    saving, 
    error, 
    validateContactData, 
    checkDuplicateAddress, 
    clearError 
  } = useContactManagement()

  // Form state
  const [formData, setFormData] = useState({
    contactName: '',
    contactAddress: '',
    profilePicture: null as File | null
  })
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) clearError()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file must be smaller than 5MB')
      return
    }

    setProcessing(true)

    try {
      // Process the image to 64x64 avatar
      const avatarBlob = await processContactAvatar(file, (progress, message) => {
        console.log(`Image processing: ${progress}% - ${message}`)
      })

      // Convert blob back to file
      const avatarFile = new File([avatarBlob], `avatar_${file.name}`, {
        type: avatarBlob.type
      })

      setFormData(prev => ({ ...prev, profilePicture: avatarFile }))

      // Create preview URL
      const previewUrl = URL.createObjectURL(avatarBlob)
      if (profilePreview) {
        URL.revokeObjectURL(profilePreview)
      }
      setProfilePreview(previewUrl)

    } catch (error) {
      console.error('Error processing image:', error)
      alert('Failed to process image. Please try another image.')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, profilePicture: null }))
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview)
      setProfilePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated || !walletAddress) {
      alert('Please connect and authenticate your wallet first')
      return
    }

    const { contactName, contactAddress, profilePicture } = formData

    // Validate form data
    const validationError = validateContactData(contactName.trim(), contactAddress.trim())
    if (validationError) {
      alert(validationError)
      return
    }

    // Check for duplicate address
    if (checkDuplicateAddress(contactAddress.trim())) {
      alert('A contact with this address already exists')
      return
    }

    try {
      const newContact = await addContact({
        contact_name: contactName.trim(),
        contact_public_address: contactAddress.trim(),
        profile_picture: profilePicture || undefined
      })

      if (newContact) {
        onContactAdded(newContact)
        handleClose()
      }
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  const handleClose = () => {
    // Clean up preview URL
    if (profilePreview) {
      URL.revokeObjectURL(profilePreview)
    }
    
    // Reset form
    setFormData({
      contactName: '',
      contactAddress: '',
      profilePicture: null
    })
    setProfilePreview(null)
    setProcessing(false)
    clearError()
    
    onClose()
  }

  const canSubmit = formData.contactName.trim() && 
                   formData.contactAddress.trim() && 
                   !saving && 
                   !processing &&
                   isAuthenticated

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-[9999] p-4 pt-16 sm:pt-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div
        className="border-4 relative w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto my-auto"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper Texture */}
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

        {/* Content */}
        <div className="relative z-[2] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-medium"
              style={{
                fontFamily: "Helvetica Neue, sans-serif",
                color: colors.text
              }}
            >
              Add New Contact
            </h2>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: colors.text }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Profile Picture */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ 
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.text
                }}
              >
                Profile Picture (optional)
              </label>
              
              <div className="flex items-center gap-4">
                {/* Avatar Preview */}
                <div 
                  className="w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bgSecondary
                  }}
                >
                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8" style={{ color: colors.textSecondary }} />
                  )}
                </div>

                {/* Upload/Remove Buttons */}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processing}
                    className="text-xs px-3 py-1 hover:opacity-80"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      fontFamily: "Helvetica Neue, sans-serif"
                    }}
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 mr-1" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  
                  {profilePreview && (
                    <Button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs px-3 py-1 hover:opacity-80"
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.textSecondary,
                        border: `1px solid ${colors.textSecondary}`,
                        fontFamily: "Helvetica Neue, sans-serif"
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              <p 
                className="text-xs mt-2"
                style={{ 
                  color: colors.textSecondary,
                  fontFamily: "Helvetica Neue, sans-serif"
                }}
              >
                Images will be resized to 64x64 pixels
              </p>
            </div>

            {/* Contact Name */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ 
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.text
                }}
              >
                Contact Name
              </label>
              <div 
                className="border-2"
                style={{ borderColor: colors.border }}
              >
                <Input
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  placeholder="Enter contact name..."
                  className="border-none rounded-none focus:ring-0 focus:border-none h-10"
                  style={{ 
                    fontFamily: "Helvetica Neue, sans-serif",
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}
                  maxLength={100}
                  required
                />
              </div>
            </div>

            {/* Contact Address */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ 
                  fontFamily: "Helvetica Neue, sans-serif",
                  color: colors.text
                }}
              >
                Wallet Address
              </label>
              <div 
                className="border-2"
                style={{ borderColor: colors.border }}
              >
                <Input
                  value={formData.contactAddress}
                  onChange={(e) => handleInputChange('contactAddress', e.target.value)}
                  placeholder="Enter Solana wallet address..."
                  className="border-none rounded-none focus:ring-0 focus:border-none h-10"
                  style={{ 
                    fontFamily: "Helvetica Neue, sans-serif",
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="text-sm p-3 border"
                style={{
                  color: '#ef4444',
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                  borderColor: '#ef4444',
                  fontFamily: "Helvetica Neue, sans-serif"
                }}
              >
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-10 disabled:opacity-50"
                style={{ fontFamily: "Helvetica Neue, sans-serif", fontWeight: 500 }}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Adding Contact...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Add Contact
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                onClick={handleClose}
                disabled={saving}
                className="flex-1 rounded-none h-10 hover:opacity-80"
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
      </div>
    </div>
  )
}

export default AddContactModal