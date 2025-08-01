'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Download } from 'lucide-react'
import { formatDuration, formatTimeRemaining, convertToMp3Download, getTimeRemaining } from '@/lib/voice-codec'
import { MessageStatus, type MessageStatusType } from '@/components/MessageStatus'
import type { VoiceMessage } from '@/types/messaging'

interface VoiceMessageBubbleProps {
  message: VoiceMessage
  isOwnMessage: boolean
  colors: {
    bg: string
    text: string
    border: string
    textSecondary: string
  }
  isDarkMode: boolean
  isMobile?: boolean
  status?: MessageStatusType
  isReadByRecipient?: boolean
}

interface WaveformDisplayProps {
  isPlaying: boolean
  progress: number
  colors: { border: string }
}

// Static waveform visualization for playback
function WaveformDisplay({ isPlaying, progress, colors }: WaveformDisplayProps) {
  // Generate consistent waveform bars based on message content (pseudo-random but consistent)
  const bars = Array(16).fill(0).map((_, i) => {
    // Use index to create consistent but varied heights
    const seed = (i + 1) * 7
    return 20 + ((seed * 17) % 60) // Heights between 20-80
  })

  return (
    <div className="flex items-end justify-center gap-1 h-8 px-2">
      {bars.map((height, index) => {
        const barProgress = index / bars.length
        const isActive = progress > barProgress
        
        return (
          <div
            key={index}
            className="w-1 bg-current transition-all duration-150"
            style={{
              height: `${height * 0.4}px`,
              backgroundColor: isActive && isPlaying ? colors.border : '#ccc',
              opacity: isActive ? 1 : 0.6
            }}
          />
        )
      })}
    </div>
  )
}

export default function VoiceMessageBubble({ message, isOwnMessage, colors, isDarkMode, isMobile = false, status, isReadByRecipient }: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Update time remaining every minute
  useEffect(() => {
    const updateTimeRemaining = () => {
      if (message.expires_at) {
        setTimeRemaining(formatTimeRemaining(message.expires_at))
      }
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [message.expires_at])

  // Check if voice message is expired
  const isExpired = message.expires_at ? getTimeRemaining(message.expires_at).expired : false

  // Handle play/pause
  const handlePlayPause = async () => {
    if (isExpired) {
      setError('This voice message has expired and is no longer available.')
      return
    }

    try {
      setError(null)
      
      if (!audioRef.current) {
        setIsLoading(true)
        // Use file_url if available, otherwise use base64 audio data from metadata
        const audioSource = message.file_url || (message.metadata as any)?.audio_data
        if (!audioSource) {
          setError('Voice message not available')
          setIsLoading(false)
          return
        }
        const audio = new Audio(audioSource)
        
        audio.onloadeddata = () => {
          setIsLoading(false)
          audioRef.current = audio
          audio.play()
          setIsPlaying(true)
        }
        
        audio.ontimeupdate = () => {
          if (audio.duration) {
            setProgress(audio.currentTime / audio.duration)
            setCurrentTime(audio.currentTime)
          }
        }
        
        audio.onended = () => {
          setIsPlaying(false)
          setProgress(0)
          setCurrentTime(0)
        }
        
        audio.onerror = () => {
          setIsLoading(false)
          setError('Failed to load voice message. It may have expired.')
          audioRef.current = null
        }
      } else {
        if (isPlaying) {
          audioRef.current.pause()
          setIsPlaying(false)
        } else {
          audioRef.current.play()
          setIsPlaying(true)
        }
      }
    } catch (error) {
      setIsLoading(false)
      setError('Failed to play voice message.')
      console.error('Voice playback error:', error)
    }
  }

  // Handle download as MP3
  const handleDownload = async () => {
    if (isExpired) {
      setError('This voice message has expired and is no longer available for download.')
      return
    }

    if (isDownloading) {
      return // Prevent multiple download attempts
    }

    try {
      setError(null)
      setIsDownloading(true)
      
      let blob: Blob
      let filename: string
      
      if (message.file_url) {
        // Fetch from URL
        const response = await fetch(message.file_url)
        if (!response.ok) {
          throw new Error('Voice message not found. It may have expired.')
        }
        blob = await response.blob()
        filename = message.file_name || 'voice_message.mp4'
      } else if ((message.metadata as any)?.audio_data) {
        // Convert base64 to blob
        const base64Data = (message.metadata as any).audio_data
        const response = await fetch(base64Data)
        blob = await response.blob()
        filename = `voice_message_${Date.now()}.webm`
      } else {
        throw new Error('No audio data available')
      }
      
      // Convert and download as MP3 with progress callback
      await convertToMp3Download(blob, filename, (progress) => {
        // Progress is handled internally, we just show spinner
        console.log(`Conversion progress: ${progress}%`)
      })
      
    } catch (error) {
      setError('Failed to download voice message. It may have expired.')
      console.error('Download error:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className={`flex items-start gap-2 ${isMobile ? 'max-w-[90%]' : 'max-w-[60%]'}`}>
      {/* Download Button - positioned outside on LEFT for SENDER (own messages) */}
      {!isExpired && isOwnMessage && !isMobile && (
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-none h-8 px-2 hover:opacity-80 mt-1 disabled:opacity-50"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            fontSize: '12px'
          }}
          title={isDownloading ? 'Converting to MP3...' : 'Download as MP3'}
        >
          {isDownloading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
          ) : (
            <Download className="w-3 h-3" />
          )}
        </Button>
      )}
      
      <div 
        className="flex-1 p-3 border-2"
        style={{
          borderColor: colors.border,
          backgroundColor: isOwnMessage ? (isDarkMode ? '#1E3A8A20' : '#EFF6FF') : colors.bg,
          fontFamily: "Helvetica Neue, sans-serif"
        }}
      >
        {/* Voice Message Content */}
        <div className="space-y-3">
          {/* Voice Controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <Button
              onClick={handlePlayPause}
              disabled={isLoading || isExpired}
              className="rounded-none h-10 w-10 p-0 hover:opacity-80 disabled:opacity-50"
              style={{
                backgroundColor: isExpired ? '#ccc' : '#3B82F6',
                color: 'white',
                border: `2px solid ${isExpired ? '#ccc' : '#3B82F6'}`
              }}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            {/* Waveform and Duration */}
            <div className="flex-1">
              {isExpired ? (
                <div className="text-center py-2">
                  <span style={{ color: colors.textSecondary, fontSize: '12px' }}>
                    Voice message expired
                  </span>
                </div>
              ) : (
                <>
                  <WaveformDisplay 
                    isPlaying={isPlaying} 
                    progress={progress} 
                    colors={colors} 
                  />
                </>
              )}
            </div>
          </div>

        {/* Error Message */}
        {error && (
          <div 
            className="text-xs p-2 border rounded-none"
            style={{ 
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              borderColor: '#fecaca'
            }}
          >
            {error}
          </div>
        )}

        {/* Message Status and Timestamp */}
        <div className={`flex items-center mt-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <MessageStatus
            status={status || (isOwnMessage ? 'sent' : 'received')}
            encrypted={message.encrypted || false}
            timestamp={message.created_at}
            size="sm"
            isDarkMode={isDarkMode}
            showStatusIcon={isOwnMessage}
            isReadByRecipient={isReadByRecipient}
            timeRemaining={!isExpired ? timeRemaining : undefined}
            isOwnMessage={isOwnMessage}
          />
        </div>

        {/* Original message content if any */}
        {message.message_content && message.message_content.trim() && (
          <div 
            className="text-sm mt-2 pt-2 border-t"
            style={{ 
              color: colors.text,
              borderColor: colors.border + '40' // Semi-transparent border
            }}
          >
            {message.message_content}
          </div>
        )}
        </div>
      </div>
      
      {/* Download Button - positioned outside on RIGHT for RECEIVER (not own messages) */}
      {!isExpired && !isOwnMessage && !isMobile && (
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="rounded-none h-8 px-2 hover:opacity-80 mt-1 disabled:opacity-50"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            fontSize: '12px'
          }}
          title={isDownloading ? 'Converting to MP3...' : 'Download as MP3'}
        >
          {isDownloading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
          ) : (
            <Download className="w-3 h-3" />
          )}
        </Button>
      )}
    </div>
  )
}