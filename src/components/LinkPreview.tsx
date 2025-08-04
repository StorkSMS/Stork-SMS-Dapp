'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LinkPreviewData, preloadImage, SkeletonDimensions } from '@/lib/url-utils'
import { linkLoadingQueue, PRIORITY_LEVELS } from '@/lib/link-loading-queue'

interface LinkPreviewProps {
  url: string
  isDarkMode: boolean
  colors: {
    bg: string
    text: string
    border: string
    bgSecondary: string
    textSecondary: string
  }
  initialDimensions?: SkeletonDimensions
  priority?: number
  isOptimistic?: boolean
}

// Cache for link preview data to avoid re-fetching
const previewCache = new Map<string, LinkPreviewData>()

// Track ongoing fetches to prevent duplicate requests
const ongoingFetches = new Map<string, Promise<LinkPreviewData | null>>()

export default function LinkPreview({ url, isDarkMode, colors, initialDimensions, priority = PRIORITY_LEVELS.NORMAL, isOptimistic = false }: LinkPreviewProps) {
  // Simplified state management
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Create keyframes for shimmer animation
  React.useEffect(() => {
    if (!document.getElementById('shimmer-keyframes')) {
      const style = document.createElement('style')
      style.id = 'shimmer-keyframes'
      style.textContent = `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Simple loading state management
  useEffect(() => {
    if (isOptimistic) {
      setIsLoading(true)
      return
    }

    // Show skeleton for at least 500ms for smooth UX
    const minLoadingTime = setTimeout(() => {
      if (previewData) {
        setIsLoading(false)
      }
    }, 500)

    return () => clearTimeout(minLoadingTime)
  }, [isOptimistic, previewData])

  // IntersectionObserver to track visibility and boost priority
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasVisible = isVisible;
          const nowVisible = entry.isIntersecting;
          
          setIsVisible(nowVisible);
          
          // If component just became visible and we don't have data yet, boost priority
          if (nowVisible && !wasVisible && !previewData) {
            const boostedPriority = Math.max(priority, PRIORITY_LEVELS.VISIBLE);
            linkLoadingQueue.updatePriority(url, boostedPriority);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading slightly before coming into view
        threshold: 0.1
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [url, priority, previewData, isVisible, isOptimistic]);

  // Simplified data fetching
  useEffect(() => {
    let isMounted = true

    // Don't fetch data for optimistic messages
    if (isOptimistic) {
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setHasError(false)

        let data: LinkPreviewData | null = null

        // Check cache first
        if (previewCache.has(url)) {
          data = previewCache.get(url)!
        } else if (ongoingFetches.has(url)) {
          // Wait for ongoing fetch
          data = await ongoingFetches.get(url)!
        } else {
          // Start a new fetch using priority queue
          const fetchPromise = linkLoadingQueue.addToQueue(url, priority)
          ongoingFetches.set(url, fetchPromise)

          try {
            data = await fetchPromise
            if (data) {
              // Cache the data
              previewCache.set(url, data)
            }
          } finally {
            // Clean up ongoing fetch
            ongoingFetches.delete(url)
          }
        }

        if (!isMounted) return

        // Preload image if exists
        if (data && data.image) {
          try {
            await preloadImage(data.image)
          } catch {
            // If image fails to load, still show the preview without image
            data.image = undefined
          }
        }

        if (isMounted && data) {
          console.log('LinkPreview: Setting preview data:', data)
          setPreviewData(data)
          // Loading will be set to false by the loading timer effect
        }

      } catch (error) {
        console.debug('Error loading link preview:', error)
        ongoingFetches.delete(url)
        if (isMounted) {
          setHasError(true)
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [url, priority, isOptimistic])

  // Don't render anything if there's an error
  if (hasError) {
    return null
  }

  // Show skeleton while loading or if no data yet
  if (isLoading || !previewData) {
    // Start with fixed dimensions for the animation
    let imageHeight = '180px'
    let titleWidth = '240px'
    let titleWidth2 = '180px'
    let descWidth = '300px' 
    let descWidth2 = '220px'
    let domainWidth = '120px'
    let showImage = true
    let showTitle2 = true
    let showDesc = true
    let showDesc2 = true
    let showDomain = true
    
    // Use initial dimensions if provided, otherwise use defaults
    if (initialDimensions) {
      imageHeight = initialDimensions.imageHeight
      titleWidth = initialDimensions.titleWidth
      titleWidth2 = initialDimensions.titleWidth2
      descWidth = initialDimensions.descWidth
      descWidth2 = initialDimensions.descWidth2
      domainWidth = initialDimensions.domainWidth
      showImage = initialDimensions.showImage
      showTitle2 = initialDimensions.showTitle2
      showDesc = initialDimensions.showDesc
      showDesc2 = initialDimensions.showDesc2
      showDomain = initialDimensions.showDomain
    }
    return (
      <div
        ref={containerRef}
        style={{
          opacity: 1, // Always visible for skeleton
          marginBottom: '0',
          border: `2px solid ${colors.border}`,
          borderTopLeftRadius: '4px',
          borderTopRightRadius: '4px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          overflow: 'hidden',
          backgroundColor: isDarkMode ? colors.bgSecondary : '#ffffff',
          width: '100%',
          transition: 'all 0.2s ease-out' // Smooth resize animation
        }}
      >
        {/* Image skeleton */}
        {showImage && (
          <div
            style={{
              width: '100%',
              height: imageHeight,
              background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              borderBottom: imageHeight !== '0px' ? `2px solid ${colors.border}` : 'none',
              backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
              transition: 'height 0.2s ease-out',
              overflow: 'hidden'
            }}
          />
        )}
        
        {/* Content skeleton - matches 12px padding and 60px minHeight */}
        <div style={{ 
          padding: '12px',
          minHeight: '60px',
          minWidth: '1000px', // Force skeleton content to be wide
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start'
        }}>
          {/* Title skeleton */}
          <div
            style={{
              width: titleWidth,
              height: titleWidth === '0px' ? '0px' : '20px',
              marginBottom: titleWidth === '0px' ? '0px' : '4px',
              background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              borderRadius: '2px',
              transition: 'width 0.2s ease-out, height 0.2s ease-out, margin-bottom 0.2s ease-out',
              overflow: 'hidden'
            }}
          />
          
          {/* Second title line */}
          {showTitle2 && (
            <div
              style={{
                width: titleWidth2,
                height: titleWidth2 === '0px' ? '0px' : '20px',
                marginBottom: titleWidth2 === '0px' ? '0px' : '8px',
                background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '2px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out, margin-bottom 0.2s ease-out',
                overflow: 'hidden'
              }}
            />
          )}
          
          {/* Description skeleton line 1 */}
          {showDesc && (
            <div
              style={{
                width: descWidth,
                height: descWidth === '0px' ? '0px' : '19px',
                marginBottom: descWidth === '0px' ? '0px' : '4px',
                background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '2px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out, margin-bottom 0.2s ease-out',
                overflow: 'hidden'
              }}
            />
          )}
          
          {/* Description skeleton line 2 */}
          {showDesc2 && (
            <div
              style={{
                width: descWidth2,
                height: descWidth2 === '0px' ? '0px' : '19px',
                marginBottom: descWidth2 === '0px' ? '0px' : '8px',
                background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '2px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out, margin-bottom 0.2s ease-out',
                overflow: 'hidden'
              }}
            />
          )}
          
          {/* Domain skeleton */}
          {showDomain && (
            <div
              style={{
                width: domainWidth,
                height: domainWidth === '0px' ? '0px' : '16px',
                background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '2px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out',
                overflow: 'hidden'
              }}
            />
          )}
        </div>
        
      </div>
    )
  }

  // Render the actual content
  if (!previewData) return null
  
  // Always show preview if we have at least a domain
  const hasFullPreview = !!(previewData.title || previewData.description || previewData.image)
  const isMinimalPreview = !hasFullPreview && !!previewData.domain

  return (
    <div
      ref={containerRef}
      className="link-preview-container loaded"
      style={{
        opacity: 1, // Always visible, no fade animation
        marginBottom: '0',
        border: `2px solid ${colors.border}`,
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px',
        borderBottomLeftRadius: '0',
        borderBottomRightRadius: '0',
        overflow: 'hidden',
        backgroundColor: isDarkMode ? colors.bgSecondary : '#ffffff',
        maxWidth: '100%'
      }}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline"
        style={{ color: 'inherit' }}
      >
        {previewData.image && (
          <div
            style={{
              width: '100%',
              height: '180px', // Reduced from 200px to match skeleton
              overflow: 'hidden',
              borderBottom: `2px solid ${colors.border}`,
              backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5'
            }}
          >
            <img
              src={previewData.image}
              alt={previewData.title || 'Link preview'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              onError={(e) => {
                // Hide image container if image fails to load after initial preload
                const target = e.target as HTMLImageElement
                if (target.parentElement) {
                  target.parentElement.style.display = 'none'
                }
              }}
            />
          </div>
        )}
        
        <div style={{ 
          padding: isMinimalPreview ? '8px 12px' : '12px',
          minHeight: isMinimalPreview ? 'auto' : '60px'
        }}>
          {(previewData.title || isMinimalPreview) && (
            <h3
              style={{
                margin: isMinimalPreview ? '0' : '0 0 4px 0',
                fontSize: isMinimalPreview ? '14px' : '16px',
                fontWeight: '600',
                fontFamily: 'Helvetica Neue, sans-serif',
                color: colors.text,
                lineHeight: '1.3',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                minWidth: '1000px' // Force LinkPreview to always be wide
              }}
            >
              {previewData.title || previewData.domain}
            </h3>
          )}
          
          {previewData.description && (
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontFamily: 'Helvetica Neue, sans-serif',
                color: colors.textSecondary,
                lineHeight: '1.4',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {previewData.description}
            </p>
          )}
          
          {!isMinimalPreview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: colors.textSecondary,
                fontFamily: 'Helvetica Neue, sans-serif'
              }}
            >
              {previewData.favicon && (
                <img
                  src={previewData.favicon}
                  alt=""
                  style={{
                    width: '16px',
                    height: '16px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    // Hide favicon if it fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              )}
              <span>{previewData.domain}</span>
            </div>
          )}
        </div>
      </a>
    </div>
  )
}