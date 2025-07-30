'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LinkPreviewData, preloadImage, SkeletonDimensions } from '@/lib/url-utils'
import { linkLoadingQueue, PRIORITY_LEVELS } from '@/lib/link-loading-queue'

// Animation state machine for guaranteed smooth transitions
enum AnimationPhase {
  FIXED_SKELETON = 'FIXED_SKELETON',      // 0-200ms: Always show initial skeleton
  SMART_DIMENSIONS = 'SMART_DIMENSIONS',  // 200-400ms: Morph to estimated size
  DATA_PREPARATION = 'DATA_PREPARATION',  // 400ms+: Load data, keep skeleton
  FINAL_MORPHING = 'FINAL_MORPHING',      // 100ms: Morph to final content size
  CONTENT_REVEAL = 'CONTENT_REVEAL'       // Show actual content
}

const PHASE_DURATIONS = {
  FIXED_SKELETON: 200,
  SMART_DIMENSIONS: 200, 
  FINAL_MORPHING: 100
}

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
  // Animation state machine
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>(AnimationPhase.FIXED_SKELETON)
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null)
  const [preparedData, setPreparedData] = useState<LinkPreviewData | null>(null) // Data prepared during skeleton phases
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const phaseStartTime = useRef<number>(Date.now())
  
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

  // Animation timeline orchestration - guarantees smooth transitions regardless of data loading speed
  useEffect(() => {
    if (isOptimistic) {
      // For optimistic messages, stay in FIXED_SKELETON state until message becomes real
      setAnimationPhase(AnimationPhase.FIXED_SKELETON)
      return
    }

    let timeoutId: NodeJS.Timeout

    const advanceToNextPhase = () => {
      setAnimationPhase(currentPhase => {
        const now = Date.now()
        const elapsed = now - phaseStartTime.current
        

        switch (currentPhase) {
          case AnimationPhase.FIXED_SKELETON:
            // Ensure minimum duration before advancing
            if (elapsed >= PHASE_DURATIONS.FIXED_SKELETON) {
              phaseStartTime.current = now
              return AnimationPhase.SMART_DIMENSIONS
            }
            // Wait for remaining time
            timeoutId = setTimeout(advanceToNextPhase, PHASE_DURATIONS.FIXED_SKELETON - elapsed)
            return currentPhase

          case AnimationPhase.SMART_DIMENSIONS:
            if (elapsed >= PHASE_DURATIONS.SMART_DIMENSIONS) {
              phaseStartTime.current = now
              return AnimationPhase.DATA_PREPARATION
            }
            timeoutId = setTimeout(advanceToNextPhase, PHASE_DURATIONS.SMART_DIMENSIONS - elapsed)
            return currentPhase

          case AnimationPhase.DATA_PREPARATION:
            // This phase waits for data and is handled by separate useEffect
            return currentPhase

          case AnimationPhase.FINAL_MORPHING:
            // This phase is handled by separate useEffect
            return currentPhase

          default:
            return currentPhase
        }
      })
    }

    // Start the animation timeline
    timeoutId = setTimeout(advanceToNextPhase, PHASE_DURATIONS.FIXED_SKELETON)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [isOptimistic])

  // Trigger advancement when data becomes available during DATA_PREPARATION phase
  useEffect(() => {
    if (preparedData && animationPhase === AnimationPhase.DATA_PREPARATION) {
      // Data is ready, trigger phase advancement
      const timeoutId = setTimeout(() => {
        setAnimationPhase(currentPhase => {
          if (currentPhase === AnimationPhase.DATA_PREPARATION) {
            phaseStartTime.current = Date.now()
            return AnimationPhase.FINAL_MORPHING
          }
          return currentPhase
        })
      }, 0) // Advance immediately when data is ready

      return () => clearTimeout(timeoutId)
    }
  }, [preparedData, animationPhase])

  // Handle FINAL_MORPHING to CONTENT_REVEAL transition
  useEffect(() => {
    if (animationPhase === AnimationPhase.FINAL_MORPHING) {
      const timeoutId = setTimeout(() => {
        // Move prepared data to active data and reveal content
        setPreviewData(preparedData)
        setAnimationPhase(AnimationPhase.CONTENT_REVEAL)
      }, PHASE_DURATIONS.FINAL_MORPHING)

      return () => clearTimeout(timeoutId)
    }
  }, [animationPhase, preparedData])

  // IntersectionObserver to track visibility and boost priority
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const wasVisible = isVisible;
          const nowVisible = entry.isIntersecting;
          
          setIsVisible(nowVisible);
          
          // If component just became visible and we don't have data yet, boost priority
          if (nowVisible && !wasVisible && !preparedData && !previewData) {
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
  }, [url, priority, previewData, preparedData, isVisible, isOptimistic]);

  // Background data preparation - loads data in parallel with animations
  useEffect(() => {
    let isMounted = true

    // Don't fetch data for optimistic messages
    if (isOptimistic) {
      return
    }

    const prepareData = async () => {
      try {
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

        if (!data || !isMounted) return

        // Preload image if exists
        if (data.image) {
          try {
            await preloadImage(data.image)
          } catch {
            // If image fails to load, still show the preview without image
            data.image = undefined
          }
        }

        if (isMounted) {
          // Set prepared data - animation timeline will use this when ready
          setPreparedData(data)
        }

      } catch (error) {
        console.debug('Error loading link preview:', error)
        ongoingFetches.delete(url)
        if (isMounted) {
          setHasError(true)
        }
      }
    }

    prepareData()

    return () => {
      isMounted = false
    }
  }, [url, priority, isOptimistic])

  // Don't render anything if there's an error
  if (hasError) {
    return null
  }

  // Show skeleton during animation phases, content only at final phase
  if (animationPhase !== AnimationPhase.CONTENT_REVEAL) {
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
    
    // Animation phase-based skeleton morphing
    switch (animationPhase) {
      case AnimationPhase.FIXED_SKELETON:
        // Phase 1: Fixed initial dimensions (200ms)
        break // Use default dimensions set above

      case AnimationPhase.SMART_DIMENSIONS:
      case AnimationPhase.DATA_PREPARATION:
        // Phase 2 & 3: Smart estimated dimensions (200ms + waiting for data)
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
        break

      case AnimationPhase.FINAL_MORPHING:
        // Phase 4: Morph to match actual content dimensions (100ms)
        if (preparedData) {
          const hasImage = preparedData.image
          const hasTitle = preparedData.title || preparedData.domain
          const hasDescription = preparedData.description
          const isMinimal = !preparedData.title && !preparedData.description && !preparedData.image
          
          // Final dimensions - hide elements that don't exist
          imageHeight = hasImage ? '180px' : '0px'
          showImage = !!hasImage
          
          if (hasTitle) {
            titleWidth = initialDimensions?.titleWidth || '240px'
            titleWidth2 = (preparedData.title && preparedData.title.length > 40) ? 
              (initialDimensions?.titleWidth2 || '180px') : '0px'
            showTitle2 = !!(preparedData.title && preparedData.title.length > 40)
          } else {
            titleWidth = '0px'
            titleWidth2 = '0px'
            showTitle2 = false
          }
          
          if (hasDescription) {
            descWidth = initialDimensions?.descWidth || '300px'
            descWidth2 = initialDimensions?.descWidth2 || '220px'
          } else {
            descWidth = '0px'
            descWidth2 = '0px' 
            showDesc = false
            showDesc2 = false
          }
          
          if (!isMinimal && preparedData.domain) {
            domainWidth = initialDimensions?.domainWidth || '120px'
          } else {
            domainWidth = '0px'
            showDomain = false
          }
        }
        break
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

  // Use the appropriate data based on animation phase
  const activeData = animationPhase === AnimationPhase.CONTENT_REVEAL ? (previewData || preparedData) : previewData
  
  // Don't render content if we don't have data yet
  if (!activeData) return null
  
  // Always show preview if we have at least a domain
  const hasFullPreview = !!(activeData.title || activeData.description || activeData.image)
  const isMinimalPreview = !hasFullPreview && !!activeData.domain

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
        {activeData.image && (
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
              src={activeData.image}
              alt={activeData.title || 'Link preview'}
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
          {(activeData.title || isMinimalPreview) && (
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
              {activeData.title || activeData.domain}
            </h3>
          )}
          
          {activeData.description && (
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
              {activeData.description}
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
              {activeData.favicon && (
                <img
                  src={activeData.favicon}
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
              <span>{activeData.domain}</span>
            </div>
          )}
        </div>
      </a>
    </div>
  )
}