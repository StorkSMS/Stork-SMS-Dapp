'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Play, Pause, Square, X, Send } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { formatDuration } from '@/lib/voice-codec'

interface VoiceRecorderProps {
  isOpen: boolean
  onClose: () => void
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
  const [bars, setBars] = useState<number[]>(Array(20).fill(0))

  useEffect(() => {
    if (!isRecording || isPaused) {
      setBars(Array(20).fill(0))
      return
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100))
    }, 150)

    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  return (
    <div className="flex items-end justify-center gap-1 h-16 px-4">
      {bars.map((height, index) => (
        <div
          key={index}
          className="w-2 bg-current transition-all duration-150"
          style={{
            height: `${Math.max(4, height * 0.6)}px`,
            backgroundColor: isRecording && !isPaused ? colors.border : '#ccc'
          }}
        />
      ))}
    </div>
  )
}

export default function VoiceRecorder({ isOpen, onClose, onSend, colors, isDarkMode }: VoiceRecorderProps) {
  const voiceRecording = useVoiceRecording()
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [isSending, setIsSending] = useState(false)

  const { state, startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording, requestPermission, isSupported, maxDuration } = voiceRecording

  // Handle modal close
  const handleClose = () => {
    if (state.isRecording) {
      cancelRecording()
    }
    if (audioElement) {
      audioElement.pause()
      setIsPlaying(false)
    }
    onClose()
  }

  // Handle recording start
  const handleStartRecording = async () => {
    if (state.permission !== 'granted') {
      const granted = await requestPermission()
      if (!granted) return
    }
    
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

  // Handle audio playback
  const handlePlayPause = () => {
    if (!state.audioUrl) return

    if (!audioElement) {
      const audio = new Audio(state.audioUrl)
      audio.onended = () => setIsPlaying(false)
      setAudioElement(audio)
      audio.play()
      setIsPlaying(true)
    } else {
      if (isPlaying) {
        audioElement.pause()
        setIsPlaying(false)
      } else {
        audioElement.play()
        setIsPlaying(true)
      }
    }
  }

  // Handle send
  const handleSend = async () => {
    if (!state.audioBlob) return

    setIsSending(true)
    try {
      await onSend(state.audioBlob, state.duration)
      handleClose()
    } catch (error) {
      console.error('Failed to send voice message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle retry after error
  const handleRetry = () => {
    cancelRecording()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Paper Texture Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'url(/Paper-Texture-7.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply'
        }}
      />
      
      <div 
        className="relative bg-white border-4 rounded-none w-full max-w-md"
        style={{ 
          borderColor: colors.border, 
          fontFamily: "Helvetica Neue, sans-serif",
          backgroundColor: colors.bg
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper Texture Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/Paper-Texture-7.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            mixBlendMode: 'multiply',
            opacity: isDarkMode ? 0.3 : 0.1
          }}
        />

        {/* Header */}
        <div className="relative z-10 p-4 border-b-2" style={{ borderColor: colors.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium" style={{ color: colors.text }}>
              Voice Message
            </h3>
            <Button
              onClick={handleClose}
              className="rounded-none h-8 w-8 p-0 hover:opacity-80"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `2px solid ${colors.border}`
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 space-y-4">
          {/* Error State */}
          {state.state === 'error' && (
            <div className="text-center space-y-4">
              <p className="text-red-600 text-sm">{state.error}</p>
              <Button
                onClick={handleRetry}
                className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500 rounded-none h-10 px-4"
                style={{ fontFamily: "Helvetica Neue, sans-serif" }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Permission Request */}
          {state.state === 'requesting_permission' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: colors.border }} />
              <p style={{ color: colors.textSecondary }}>Requesting microphone access...</p>
            </div>
          )}

          {/* Not Supported */}
          {!isSupported && (
            <div className="text-center space-y-4">
              <p className="text-red-600 text-sm">
                Voice recording is not supported in this browser.
              </p>
            </div>
          )}

          {/* Idle State */}
          {isSupported && state.state === 'idle' && (
            <div className="text-center space-y-4">
              <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
                Press the record button to start recording your voice message.
                Maximum duration: {Math.floor(maxDuration / 60)} minutes.
              </p>
              <Button
                onClick={handleStartRecording}
                className="bg-red-500 hover:bg-red-600 text-white border-2 border-red-500 rounded-none h-12 w-12 p-0"
                disabled={state.permission === 'denied'}
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Recording State */}
          {(state.state === 'recording' || state.isPaused) && (
            <div className="space-y-4">
              {/* Timer */}
              <div className="text-center">
                <div 
                  className="text-2xl font-mono"
                  style={{ color: colors.text }}
                >
                  {formatDuration(state.duration)} / {formatDuration(maxDuration)}
                </div>
                <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  {state.isPaused ? 'Paused' : 'Recording...'}
                </div>
              </div>

              {/* Waveform */}
              <Waveform 
                isRecording={state.isRecording} 
                isPaused={state.isPaused} 
                colors={colors} 
              />

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <Button
                  onClick={handlePauseResume}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-10 w-10 p-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {state.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={handleStopRecording}
                  className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500 rounded-none h-10 w-10 p-0"
                >
                  <Square className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={cancelRecording}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-10 w-10 p-0"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {state.state === 'processing' && (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: colors.border }} />
              <p style={{ color: colors.textSecondary }}>Processing recording...</p>
            </div>
          )}

          {/* Completed State */}
          {state.state === 'completed' && state.audioBlob && (
            <div className="space-y-4">
              {/* Duration */}
              <div className="text-center">
                <div 
                  className="text-lg font-mono"
                  style={{ color: colors.text }}
                >
                  Duration: {formatDuration(state.duration)}
                </div>
                <div className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  Size: {Math.round(state.audioBlob.size / 1024)}KB
                </div>
              </div>

              {/* Preview Controls */}
              <div className="flex justify-center">
                <Button
                  onClick={handlePlayPause}
                  className="border-2 border-gray-300 hover:border-gray-400 rounded-none h-10 px-4 flex items-center gap-2"
                  style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Pause' : 'Preview'}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleRetry}
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 rounded-none h-12"
                  style={{ backgroundColor: colors.bg, color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  Record Again
                </Button>
                
                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500 rounded-none h-12 flex items-center justify-center gap-2"
                  style={{ fontFamily: "Helvetica Neue, sans-serif" }}
                >
                  {isSending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}