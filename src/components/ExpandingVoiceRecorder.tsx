'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Play, Pause, Square, X, Send } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { formatDuration } from '@/lib/voice-codec'

interface ExpandingVoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>
  colors: {
    bg: string
    text: string
    border: string
    textSecondary: string
  }
  isDarkMode: boolean
}

interface WaveformProps {
  isRecording: boolean
  isPaused: boolean
  colors: { border: string }
}

// Simple rectangular waveform visualization
function Waveform({ isRecording, isPaused, colors }: WaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(12).fill(0))

  useEffect(() => {
    if (!isRecording || isPaused) {
      setBars(Array(12).fill(0))
      return
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100))
    }, 150)

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  return (
    <div className="flex items-end justify-center gap-1 h-8 px-2">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-1 bg-current transition-all duration-150"
          style={{
            height: `${Math.max(3, height * 0.3)}px`,
            backgroundColor: isRecording && !isPaused ? colors.border : '#ccc'
          }}
        />
      ))}
    </div>
  )
}

export default function ExpandingVoiceRecorder({ onSend, colors, isDarkMode }: ExpandingVoiceRecorderProps) {
  const voiceRecording = useVoiceRecording()
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording, requestPermission, isSupported, maxDuration } = voiceRecording

  // Auto-expand when recording starts
  useEffect(() => {
    if (state.isRecording) {
      setIsExpanded(true)
    }
  }, [state.isRecording])

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
    }
  }, [audioElement])

  // Cleanup blob URLs when they change or component unmounts
  useEffect(() => {
    const currentBlobUrl = state.audioUrl
    return () => {
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrl)
      }
    }
  }, [state.audioUrl])

  // Handle recording start
  const handleStartRecording = async () => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }
    
    setIsExpanded(true)
    await startRecording()
  }

  // Handle recording stop
  const handleStopRecording = async () => {
    await stopRecording()
  }

  // Handle pause/resume
  const handlePauseResume = () => {
    if (state.isPaused) {
      resumeRecording()
    } else {
      pauseRecording()
    }
  }

  // Handle audio playback with proper blob URL handling
  const handlePlayPause = () => {
    if (!state.audioUrl || !state.audioBlob) return

    if (!audioElement) {
      // Create audio element from blob directly instead of blob URL
      const audio = new Audio()
      
      // Set preload to auto for blob URLs
      audio.preload = 'auto'
      
      // Set up proper error handling
      audio.onerror = (e) => {
        console.error('Audio playback error:', e)
        setIsPlaying(false)
        // Don't try alternative methods for playback - just fail gracefully
        console.warn('Voice preview unavailable due to audio playback limitations')
      }
      
      audio.onended = () => {
        setIsPlaying(false)
        audio.currentTime = 0
      }
      
      // Set source to blob URL
      audio.src = state.audioUrl
      
      setAudioElement(audio)
      
      // Attempt to play
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch(error => {
        console.error('Failed to play audio:', error)
        setIsPlaying(false)
      })
    } else {
      if (isPlaying) {
        audioElement.pause()
        setIsPlaying(false)
      } else {
        audioElement.currentTime = 0
        audioElement.play().then(() => {
          setIsPlaying(true)
        }).catch(error => {
          console.error('Failed to play audio:', error)
          setIsPlaying(false)
        })
      }
    }
  }

  // Handle send
  const handleSend = async () => {
    if (!state.audioBlob) return

    setIsSending(true)
    try {
      await onSend(state.audioBlob, state.duration)
      handleCancel()
    } catch (error) {
      console.error('Failed to send voice message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle cancel/close
  const handleCancel = () => {
    if (state.isRecording) {
      cancelRecording()
    }
    if (audioElement) {
      audioElement.pause()
      audioElement.src = ''
      setAudioElement(null)
      setIsPlaying(false)
    }
    setIsExpanded(false)
  }

  // Handle retry after error
  const handleRetry = () => {
    cancelRecording()
    setIsExpanded(false)
  }

  return (
    <div className="flex items-center">
      {/* Main Mic Button */}
      {!isExpanded && (
        <Button
          type="button"
          onClick={handleStartRecording}
          className="rounded-none p-0 hover:opacity-80 transition-all duration-200"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            fontSize: "16px",
            width: "52px",
            height: "52px"
          }}
          disabled={!isSupported || state.permission === 'denied'}
        >
          <Mic className="w-5 h-5" />
        </Button>
      )}

      {/* Expanded Recording Interface */}
      {isExpanded && (
        <div 
          className="flex items-center gap-2 px-3 border-2 transition-all duration-200 ease-out"
          style={{ 
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderRadius: '4px',
            height: '52px'
          }}
        >
          {/* Error State */}
          {state.state === 'error' && (
            <>
              <span className="text-red-600 text-xs mr-2">{state.error}</span>
              <Button
                type="button"
                onClick={handleRetry}
                className="bg-blue-500 hover:bg-blue-600 text-white border-none rounded-none h-6 px-2 text-xs"
              >
                Retry
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                className="border-none rounded-none h-6 w-6 p-0 hover:opacity-80"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Permission Request */}
          {state.state === 'requesting_permission' && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.border }} />
              <span className="text-xs" style={{ color: colors.textSecondary }}>Requesting mic...</span>
              <Button
                type="button"
                onClick={handleCancel}
                className="border-none rounded-none h-6 w-6 p-0 hover:opacity-80"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Idle State (should not show when expanded, but safety) */}
          {state.state === 'idle' && (
            <>
              <span className="text-xs" style={{ color: colors.textSecondary }}>Press record to start</span>
              <Button
                type="button"
                onClick={handleStartRecording}
                className="bg-red-500 hover:bg-red-600 text-white border-none rounded-none h-6 w-6 p-0"
              >
                <Mic className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                onClick={handleCancel}
                className="border-none rounded-none h-6 w-6 p-0 hover:opacity-80"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Recording State */}
          {(state.state === 'recording' || state.isPaused) && (
            <>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono" style={{ color: colors.text }}>
                  {formatDuration(state.duration)}
                </div>
                <Waveform 
                  isRecording={state.isRecording} 
                  isPaused={state.isPaused} 
                  colors={colors} 
                />
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  {state.isPaused ? 'Paused' : 'Recording'}
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  type="button"
                  onClick={handlePauseResume}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-6 w-6 p-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {state.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </Button>
                
                <Button
                  type="button"
                  onClick={handleStopRecording}
                  className="bg-blue-500 hover:bg-blue-600 text-white border-none rounded-none h-6 w-6 p-0"
                >
                  <Square className="w-3 h-3" />
                </Button>
                
                <Button
                  type="button"
                  onClick={handleCancel}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-6 w-6 p-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}

          {/* Processing State */}
          {state.state === 'processing' && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: colors.border }} />
              <span className="text-xs" style={{ color: colors.textSecondary }}>Processing...</span>
              <Button
                type="button"
                onClick={handleCancel}
                className="border-none rounded-none h-6 w-6 p-0 hover:opacity-80"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}

          {/* Completed State */}
          {state.state === 'completed' && state.audioBlob && (
            <>
              <div className="flex items-center gap-2">
                <div className="text-xs font-mono" style={{ color: colors.text }}>
                  {formatDuration(state.duration)}
                </div>
                <div className="text-xs" style={{ color: colors.textSecondary }}>
                  {Math.round(state.audioBlob.size / 1024)}KB
                </div>
                
                <Button
                  type="button"
                  onClick={handlePlayPause}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-6 px-2 flex items-center gap-1"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span className="text-xs">{isPlaying ? 'Pause' : 'Play'}</span>
                </Button>
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  onClick={handleRetry}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-6 px-2 text-xs"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  Again
                </Button>
                
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-blue-500 hover:bg-blue-600 text-white border-none rounded-none h-6 px-2 flex items-center gap-1"
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span className="text-xs">Send</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}