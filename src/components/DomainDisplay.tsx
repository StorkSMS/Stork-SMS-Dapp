"use client"

import React, { useState, useEffect } from 'react'
import { useDomainDisplay } from '@/hooks/useDomainDisplay'

interface DomainDisplayProps {
  address: string
  onClick?: (address: string) => void
  showCopyToast?: boolean
  className?: string
  style?: React.CSSProperties
  isDarkMode?: boolean
  // Allow overriding display behavior
  showLoadingSkeleton?: boolean
  maxLength?: number
  // Control whether domain resolution should happen automatically
  enableDomainResolution?: boolean
}

const DomainDisplay: React.FC<DomainDisplayProps> = ({
  address,
  onClick,
  showCopyToast = false,
  className = '',
  style = {},
  isDarkMode = false,
  showLoadingSkeleton = true,
  maxLength,
  enableDomainResolution = false
}) => {
  const { resolveSingleAddress, getDisplayInfo } = useDomainDisplay()
  const [hasResolved, setHasResolved] = useState(false)
  
  const colors = {
    text: isDarkMode ? '#FFF' : '#000',
    textSecondary: isDarkMode ? '#CCC' : '#666',
    skeletonBg: isDarkMode ? '#333' : '#E5E7EB',
    skeletonShimmer: isDarkMode ? '#444' : '#F3F4F6'
  }

  // Get current display info (sync)
  const displayInfo = getDisplayInfo(address)


  // Trigger resolution on mount and address change (only if enabled)
  useEffect(() => {
    if (enableDomainResolution && address && address.trim().length > 0) {
      resolveSingleAddress(address).then((result) => {
        setHasResolved(true)
      }).catch((error) => {
        setHasResolved(true) // Set to true even on error to prevent infinite retries
      })
    }
  }, [enableDomainResolution, address, resolveSingleAddress])

  // Reset resolution state when address changes
  useEffect(() => {
    setHasResolved(false)
  }, [address])

  const handleClick = () => {
    if (onClick) {
      // Always pass the actual wallet address, not the domain name
      onClick(displayInfo.actualAddress)
    }
  }

  // Get display text - with fallback error handling
  let displayText = displayInfo.displayName
  
  // Fallback: if displayName is empty/invalid or domain resolution is disabled, create truncated version
  if (!enableDomainResolution || !displayText || displayText.length === 0) {
    displayText = address && address.length > 12 
      ? `${address.slice(0, 8)}...${address.slice(-4)}`
      : address || 'Unknown'
  }
  
  
  // Apply maxLength truncation if specified and needed
  if (maxLength && displayText.length > maxLength) {
    if (displayInfo.isDomain) {
      // For domains, truncate intelligently (keep TLD visible)
      const parts = displayText.split('.')
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1]
        const name = parts.slice(0, -1).join('.')
        const availableLength = maxLength - tld.length - 4 // Account for '...' and '.'
        if (name.length > availableLength) {
          displayText = `${name.substring(0, availableLength)}...${tld}`
        }
      } else {
        displayText = displayText.substring(0, maxLength - 3) + '...'
      }
    } else {
      // For addresses, use the standard truncation pattern if maxLength is smaller than current
      if (maxLength < displayText.length) {
        displayText = `${address.slice(0, 6)}...${address.slice(-4)}`
      }
    }
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div 
      className={`animate-pulse h-4 rounded ${className}`}
      style={{
        backgroundColor: colors.skeletonBg,
        width: '100px', // Approximate width of "12345678...ABCD"
        ...style
      }}
    >
      {/* Shimmer effect */}
      <div 
        className="h-full w-full rounded animate-pulse"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.skeletonShimmer}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite'
        }}
      />
    </div>
  )

  // Show loading skeleton if enabled and we're loading (with error boundary)
  if (showLoadingSkeleton && displayInfo.isLoading && !hasResolved) {
    try {
      return <LoadingSkeleton />
    } catch (error) {
      // Fallback to displaying the text immediately if skeleton fails
    }
  }

  // Main display component
  return (
    <span
      onClick={handleClick}
      className={`${onClick ? 'cursor-pointer transition-colors duration-200' : ''} ${className}`}
      style={{
        color: colors.text,
        fontFamily: "Helvetica Neue, sans-serif",
        ...style
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.color = '#38F'
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.color = colors.text
        }
      }}
      title={
        onClick 
          ? "Click to copy wallet address" 
          : displayInfo.isDomain 
            ? `${displayInfo.domainInfo?.type?.toUpperCase()} domain: ${displayText}` 
            : undefined
      }
    >
      {displayText}
    </span>
  )
}

export default DomainDisplay

// CSS for shimmer animation (add to global CSS if needed)
const shimmerKeyframes = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`

// Export shimmer styles for global CSS inclusion
export const DomainDisplayStyles = shimmerKeyframes