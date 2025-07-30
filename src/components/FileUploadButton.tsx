'use client'

import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon } from 'lucide-react'

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void
  colors: {
    bg: string
    text: string
    border: string
  }
  className?: string
  disabled?: boolean
}

const FileUploadButton = React.forwardRef<HTMLButtonElement, FileUploadButtonProps>(({
  onFileSelect,
  colors,
  className = '',
  disabled = false
}, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleButtonClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
        return
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (file.size > maxSize) {
        alert('File size must be less than 5MB')
        return
      }

      onFileSelect(file)
    }
    
    // Reset input value to allow selecting the same file again
    event.target.value = ''
  }

  return (
    <>
      <Button
        ref={ref}
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`rounded-none p-0 hover:opacity-80 transition-all duration-200 disabled:opacity-50 ${className}`}
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          border: `2px solid ${colors.border}`,
          height: '52px',
          width: '52px'
        }}
        aria-label="Upload image"
      >
        <ImageIcon className="w-5 h-5" />
      </Button>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={false}
      />
    </>
  )
})

FileUploadButton.displayName = 'FileUploadButton'

export default FileUploadButton