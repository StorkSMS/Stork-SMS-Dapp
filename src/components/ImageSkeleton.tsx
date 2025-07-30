import React from 'react'

interface ImageSkeletonProps {
  width: number
  height: number
  isDarkMode?: boolean
}

export default function ImageSkeleton({ 
  width, 
  height, 
  isDarkMode = false
}: ImageSkeletonProps) {
  // Create shimmer keyframes if they don't exist (same as LinkPreview)
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

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        border: '2px solid #000000',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '4px',
        backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5'
      }}
    >
      {/* Main shimmer background - matches LinkPreview exactly */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 0%, ${isDarkMode ? '#3a3a3a' : '#e0e0e0'} 50%, ${isDarkMode ? '#2a2a2a' : '#f0f0f0'} 100%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        }}
      />
    </div>
  )
}