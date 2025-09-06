"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Edit3, Trash2, X, Save, Upload } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import useContactManagement from "@/hooks/useContactManagement"
import { processContactAvatar } from "@/lib/image-processing"
import type { ContactManagementModalProps, Contact, UpdateUserContactData } from "@/types/contacts"

const ContactManagementModal: React.FC<ContactManagementModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false
}) => {
  const { isAuthenticated } = useAuth()
  const { 
    contacts,
    userContacts,
    loading,
    error,
    saving,
    fetchUserContacts,
    updateContact,
    deleteContact,
    validateContactData,
    checkDuplicateAddress,
    clearError
  } = useContactManagement()

  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    contactName: '',
    contactAddress: '',
    profilePicture: null as File | null
  })
  const [editProfilePreview, setEditProfilePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666'
  }

  // Load contacts when modal opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchUserContacts()
    }
  }, [isOpen, isAuthenticated, fetchUserContacts])

  // Filter to only user contacts (exclude hardcoded ones)
  const editableContacts = contacts.filter(contact => contact.isUserContact)

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const startEdit = (contact: Contact) => {
    setEditingContactId(contact.id)
    setEditFormData({
      contactName: contact.name,
      contactAddress: contact.publicAddress,
      profilePicture: null
    })
    setEditProfilePreview(contact.pfp || null)
    clearError()
  }

  const cancelEdit = () => {
    setEditingContactId(null)
    setEditFormData({
      contactName: '',
      contactAddress: '',
      profilePicture: null
    })
    if (editProfilePreview && !editProfilePreview.startsWith('http')) {
      URL.revokeObjectURL(editProfilePreview)
    }
    setEditProfilePreview(null)
    setProcessing(false)
    clearError()
  }

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
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
      const avatarBlob = await processContactAvatar(file)

      // Convert blob back to file
      const avatarFile = new File([avatarBlob], `avatar_${file.name}`, {
        type: avatarBlob.type
      })

      setEditFormData(prev => ({ ...prev, profilePicture: avatarFile }))

      // Clean up previous preview if it's a blob URL
      if (editProfilePreview && !editProfilePreview.startsWith('http')) {
        URL.revokeObjectURL(editProfilePreview)
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(avatarBlob)
      setEditProfilePreview(previewUrl)

    } catch (error) {
      console.error('Error processing image:', error)
      alert('Failed to process image. Please try another image.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingContactId) return

    const { contactName, contactAddress, profilePicture } = editFormData

    // Validate form data
    const validationError = validateContactData(contactName.trim(), contactAddress.trim())
    if (validationError) {
      alert(validationError)
      return
    }

    // Check for duplicate address (excluding current contact)
    if (checkDuplicateAddress(contactAddress.trim(), editingContactId)) {
      alert('Another contact already exists with this address')
      return
    }

    const updateData: UpdateUserContactData = {}
    const originalContact = contacts.find(c => c.id === editingContactId)
    
    // Only include changed fields
    if (contactName.trim() !== originalContact?.name) {
      updateData.contact_name = contactName.trim()
    }
    if (contactAddress.trim() !== originalContact?.publicAddress) {
      updateData.contact_public_address = contactAddress.trim()
    }
    if (profilePicture) {
      updateData.profile_picture = profilePicture
    }

    // Check if anything changed
    if (Object.keys(updateData).length === 0) {
      cancelEdit()
      return
    }

    const updatedContact = await updateContact(editingContactId, updateData)
    if (updatedContact) {
      cancelEdit()
    }
  }

  const handleDelete = async (contactId: string, contactName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${contactName}"? This action cannot be undone.`)
    if (!confirmed) return

    const success = await deleteContact(contactId)
    if (success && editingContactId === contactId) {
      cancelEdit()
    }
  }

  const handleClose = () => {
    cancelEdit()
    onClose()
  }

  const isEditing = editingContactId !== null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-[10000] p-4 pt-16 sm:pt-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div
        className="border-4 relative w-[600px] max-w-[95vw] max-h-[80vh] overflow-y-auto my-auto"
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
              Manage Contacts
            </h2>
            <button
              onClick={handleClose}
              disabled={saving}
              className="w-6 h-6 flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{ color: colors.text }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {loading && !contacts.length ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              <span 
                className="ml-3 text-sm"
                style={{ 
                  fontFamily: 'Helvetica Neue, sans-serif',
                  color: colors.textSecondary
                }}
              >
                Loading contacts...
              </span>
            </div>
          ) : editableContacts.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto mb-4" style={{ color: colors.textSecondary }} />
              <p 
                className="text-lg font-medium mb-2"
                style={{ 
                  fontFamily: 'Helvetica Neue, sans-serif',
                  color: colors.text
                }}
              >
                No contacts yet
              </p>
              <p 
                className="text-sm"
                style={{ 
                  fontFamily: 'Helvetica Neue, sans-serif',
                  color: colors.textSecondary
                }}
              >
                {isAuthenticated 
                  ? 'Use the "Add Contact" button in the three-dot menu to add your first contact'
                  : 'Connect your wallet to manage contacts'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {editableContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="border-2 p-4"
                  style={{ borderColor: colors.border }}
                >
                  {editingContactId === contact.id ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      {/* Profile Picture */}
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary
                          }}
                        >
                          {editProfilePreview ? (
                            <img
                              src={editProfilePreview}
                              alt="Avatar preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6" style={{ color: colors.textSecondary }} />
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processing || saving}
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
                                Change Photo
                              </>
                            )}
                          </Button>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      {/* Edit Form */}
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label
                            className="block text-sm font-medium mb-1"
                            style={{ 
                              fontFamily: "Helvetica Neue, sans-serif",
                              color: colors.text
                            }}
                          >
                            Name
                          </label>
                          <Input
                            value={editFormData.contactName}
                            onChange={(e) => handleEditInputChange('contactName', e.target.value)}
                            className="border-2 rounded-none focus:ring-0"
                            style={{ 
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                              color: colors.text,
                              fontFamily: "Helvetica Neue, sans-serif"
                            }}
                          />
                        </div>
                        <div>
                          <label
                            className="block text-sm font-medium mb-1"
                            style={{ 
                              fontFamily: "Helvetica Neue, sans-serif",
                              color: colors.text
                            }}
                          >
                            Wallet Address
                          </label>
                          <Input
                            value={editFormData.contactAddress}
                            onChange={(e) => handleEditInputChange('contactAddress', e.target.value)}
                            className="border-2 rounded-none focus:ring-0"
                            style={{ 
                              borderColor: colors.border,
                              backgroundColor: colors.bg,
                              color: colors.text,
                              fontFamily: "Helvetica Neue, sans-serif"
                            }}
                          />
                        </div>
                      </div>

                      {/* Edit Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={handleSaveEdit}
                          disabled={saving || processing}
                          className="px-3 py-1 text-sm hover:opacity-80"
                          style={{
                            backgroundColor: '#3388FF',
                            color: '#FFF',
                            border: '2px solid #38F',
                            fontFamily: "Helvetica Neue, sans-serif"
                          }}
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-1" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-3 py-1 text-sm hover:opacity-80"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `2px solid ${colors.border}`,
                            fontFamily: "Helvetica Neue, sans-serif"
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Profile Picture */}
                        <div 
                          className="w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center"
                          style={{
                            borderColor: colors.border,
                            backgroundColor: colors.bgSecondary
                          }}
                        >
                          {contact.pfp ? (
                            <img
                              src={contact.pfp}
                              alt={`${contact.name}'s profile picture`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-icon') as HTMLElement
                                if (placeholder) placeholder.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <User className={`w-6 h-6 text-gray-400 placeholder-icon ${contact.pfp ? 'hidden' : ''}`} />
                        </div>

                        {/* Contact Info */}
                        <div>
                          <div 
                            className="font-medium"
                            style={{ 
                              fontFamily: "Helvetica Neue, sans-serif",
                              color: colors.text
                            }}
                          >
                            {contact.name}
                          </div>
                          <div 
                            className="text-sm"
                            style={{ 
                              fontFamily: "Helvetica Neue, sans-serif",
                              color: colors.textSecondary
                            }}
                          >
                            {contact.publicAddress.slice(0, 8)}...{contact.publicAddress.slice(-4)}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(contact)}
                          disabled={isEditing || saving}
                          className="p-2 hover:opacity-70"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(contact.id, contact.name)}
                          disabled={isEditing || saving}
                          className="p-2 hover:opacity-70"
                          style={{
                            backgroundColor: colors.bg,
                            color: '#ef4444',
                            border: '1px solid #ef4444'
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div 
              className="text-sm p-3 border mt-4"
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

          {/* Close Button */}
          {!isEditing && (
            <div className="flex justify-end pt-6">
              <Button
                onClick={handleClose}
                disabled={saving}
                className="px-6 py-2 hover:opacity-80"
                style={{
                  backgroundColor: colors.bg,
                  color: colors.text,
                  border: `2px solid ${colors.border}`,
                  fontFamily: "Helvetica Neue, sans-serif"
                }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ContactManagementModal