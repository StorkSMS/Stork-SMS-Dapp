import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  getBestSupportedConfig, 
  isVoiceRecordingSupported, 
  getVoiceStream, 
  getAudioDuration,
  validateVoiceBlob,
  validateVoiceBlobWithDuration,
  createExpiryTimestamp,
  generateVoiceFilename,
  VoiceRecordingResult 
} from '@/lib/voice-codec'

export type RecordingState = 'idle' | 'requesting_permission' | 'recording' | 'paused' | 'processing' | 'uploading' | 'completed' | 'error'

export interface VoiceRecordingHookState {
  state: RecordingState
  isRecording: boolean
  isPaused: boolean
  duration: number
  error: string | null
  audioBlob: Blob | null
  audioUrl: string | null
  permission: 'granted' | 'denied' | 'prompt'
}

export interface VoiceRecordingHook {
  state: VoiceRecordingHookState
  startRecording: () => Promise<void>
  stopRecording: () => Promise<VoiceRecordingResult | null>
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
  requestPermission: () => Promise<boolean>
  isSupported: boolean
  maxDuration: number
}

const MAX_RECORDING_DURATION = 60 // 1 minute in seconds

export function useVoiceRecording(): VoiceRecordingHook {
  const [state, setState] = useState<VoiceRecordingHookState>({
    state: 'idle',
    isRecording: false,
    isPaused: false,
    duration: 0,
    error: null,
    audioBlob: null,
    audioUrl: null,
    permission: 'prompt'
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const shouldAutoStopRef = useRef<boolean>(false)
  const stopPromiseResolveRef = useRef<((result: VoiceRecordingResult | null) => void) | null>(null)
  const isRecordingRef = useRef<boolean>(false)
  const isPausedRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)
  const currentConfigRef = useRef<any>(null)
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const configIndexRef = useRef<number>(0)

  const isSupported = isVoiceRecordingSupported()
  
  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Update duration timer - using refs to avoid dependencies on state
  const updateDuration = useCallback(() => {
    // Use refs to check recording state instead of state object
    if (isRecordingRef.current && !isPausedRef.current) {
      const elapsed = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
      setState(prev => ({ ...prev, duration: elapsed }))

      // Set flag to auto-stop at max duration
      if (elapsed >= MAX_RECORDING_DURATION) {
        shouldAutoStopRef.current = true
        return
      }
    }
  }, []) // No dependencies on state

  // Start duration timer
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(updateDuration, 100)
  }, [updateDuration])

  // Stop duration timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup resources
  const cleanup = useCallback(() => {
    stopTimer()
    
    // Clean up media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    // Clean up MediaRecorder
    if (mediaRecorderRef.current) {
      // Remove event listeners to prevent memory leaks
      const recorder = mediaRecorderRef.current
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop()
        }
      } catch (error) {
        // Ignore errors when stopping already stopped recorder
      }
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.onerror = null
      mediaRecorderRef.current = null
    }
    
    // Reset all refs
    chunksRef.current = []
    startTimeRef.current = 0
    pausedTimeRef.current = 0
    shouldAutoStopRef.current = false
    isRecordingRef.current = false
    isPausedRef.current = false
    currentConfigRef.current = null
    configIndexRef.current = 0
    
    // Clear any pending promise
    if (stopPromiseResolveRef.current) {
      stopPromiseResolveRef.current(null)
      stopPromiseResolveRef.current = null
    }
    
    // Clear start timeout
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current)
      startTimeoutRef.current = null
    }
  }, [stopTimer])

  // Handle auto-stop when duration limit is reached - check in timer instead of useEffect
  useEffect(() => {
    const checkAutoStop = () => {
      if (shouldAutoStopRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        shouldAutoStopRef.current = false
        mediaRecorderRef.current.stop()
      }
    }
    
    // Check every 100ms if we need to auto-stop
    const interval = setInterval(checkAutoStop, 100)
    
    return () => clearInterval(interval)
  }, []) // No state dependencies

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setState(prev => ({ 
        ...prev, 
        error: 'Voice recording is not supported in this browser',
        permission: 'denied'
      }))
      return false
    }

    setState(prev => ({ ...prev, state: 'requesting_permission', error: null }))

    try {
      const stream = await getVoiceStream()
      stream.getTracks().forEach(track => track.stop()) // Stop immediately after permission check
      
      setState(prev => ({ 
        ...prev, 
        state: 'idle',
        permission: 'granted'
      }))
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone'
      setState(prev => ({ 
        ...prev, 
        state: 'error',
        error: errorMessage,
        permission: 'denied'
      }))
      return false
    }
  }, [isSupported])

  // Create MediaRecorder with fallback configurations
  const createMediaRecorderWithFallback = useCallback(async (stream: MediaStream): Promise<MediaRecorder> => {
    // Import the VOICE_CONFIGS array
    const { VOICE_CONFIGS } = await import('@/lib/voice-codec')
    
    // Start from the current config index (for retries)
    for (let i = configIndexRef.current; i < VOICE_CONFIGS.length; i++) {
      const config = VOICE_CONFIGS[i]
      
      try {
        const recorderOptions: MediaRecorderOptions = {
          mimeType: config.mimeType || undefined
        }
        
        if (config.audioBitsPerSecond > 0) {
          recorderOptions.audioBitsPerSecond = config.audioBitsPerSecond
        }
        
        console.log('🎤 Trying config', i + 1, '/', VOICE_CONFIGS.length, ':', config.mimeType)
        const mediaRecorder = new MediaRecorder(stream, recorderOptions)
        
        // Store successful config
        currentConfigRef.current = config
        configIndexRef.current = i
        
        console.log('🎤 Successfully created MediaRecorder with:', config.mimeType)
        return mediaRecorder
        
      } catch (error) {
        console.warn('🎤 Config', i + 1, 'failed:', config.mimeType, error)
        continue
      }
    }
    
    // Last resort - browser default
    console.log('🎤 Using browser default configuration')
    const mediaRecorder = new MediaRecorder(stream)
    currentConfigRef.current = { mimeType: '', audioBitsPerSecond: 0 }
    return mediaRecorder
  }, [])

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    console.log('🎤 Starting voice recording...')
    
    // Guard checks
    if (!isMountedRef.current) {
      console.warn('🎤 Cannot start - component unmounted')
      return
    }
    if (!isSupported) {
      console.error('🎤 Voice recording not supported')
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, error: 'Voice recording is not supported' }))
      }
      return
    }
    
    // Prevent starting if already recording
    if (isRecordingRef.current) {
      console.warn('🎤 Recording already in progress')
      return
    }

    try {
      cleanup()
      
      // Only update state if component is mounted
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          state: 'requesting_permission', 
          error: null,
          duration: 0,
          audioBlob: null,
          audioUrl: null
        }))
      }

      // Get audio stream
      const stream = await getVoiceStream()
      
      // Check if component is still mounted after async operation
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      
      streamRef.current = stream

      // Create MediaRecorder with automatic fallback
      const mediaRecorder = await createMediaRecorderWithFallback(stream)

      // Check again if still mounted before proceeding
      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Config is already stored by createMediaRecorderWithFallback

      // Set up event handlers with mount guards
      mediaRecorder.ondataavailable = (event) => {
        // Only process if component is still mounted and we're recording
        if (!isMountedRef.current || !isRecordingRef.current) {
          console.warn('🎤 Data available but component unmounted or not recording')
          return
        }
        
        if (event.data.size > 0) {
          console.log('🎤 Audio data chunk:', event.data.size, 'bytes')
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('🎤 MediaRecorder stopped, processing recording...')
        
        // Guard against calling after unmount
        if (!isMountedRef.current) {
          console.warn('🎤 Stop event fired after component unmount')
          cleanup()
          return
        }

        stopTimer()
        
        // Safely update state only if mounted
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, state: 'processing' }))
        }

        try {
          const blob = new Blob(chunksRef.current, { 
            type: currentConfigRef.current?.mimeType || 'audio/mp4' 
          })
          
          console.log('🎤 Created blob:', blob.size, 'bytes, chunks:', chunksRef.current.length)
          
          // Use the duration we tracked during recording instead of trying to detect it from the blob
          const recordedDuration = (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
          
          console.log('🎤 Recorded duration:', recordedDuration, 'seconds')
          
          // Validate the recording using the tracked duration
          const validation = await validateVoiceBlobWithDuration(blob, recordedDuration, MAX_RECORDING_DURATION)
          if (!validation.valid) {
            console.error('🎤 Validation failed:', validation.error)
            if (isMountedRef.current) {
              setState(prev => ({ 
                ...prev, 
                state: 'error', 
                error: validation.error || 'Invalid recording'
              }))
            }
            return
          }
          
          console.log('🎤 Recording validation passed')

          const url = URL.createObjectURL(blob)
          const duration = recordedDuration

          // Update refs first
          isRecordingRef.current = false
          isPausedRef.current = false
          
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            console.log('🎤 Recording completed successfully!')
            setState(prev => ({ 
              ...prev, 
              state: 'completed',
              isRecording: false,
              isPaused: false,
              audioBlob: blob,
              audioUrl: url,
              duration
            }))
          }

          // Resolve the stopRecording promise
          if (stopPromiseResolveRef.current) {
            const result: VoiceRecordingResult = {
              blob,
              duration,
              size: blob.size,
              url
            }
            stopPromiseResolveRef.current(result)
            stopPromiseResolveRef.current = null
          }

        } catch (error) {
          if (isMountedRef.current) {
            setState(prev => ({ 
              ...prev, 
              state: 'error', 
              error: 'Failed to process recording: ' + (error instanceof Error ? error.message : 'Unknown error')
            }))
          }

          // Resolve the stopRecording promise with null on error
          if (stopPromiseResolveRef.current) {
            stopPromiseResolveRef.current(null)
            stopPromiseResolveRef.current = null
          }
        }
      }

      mediaRecorder.onerror = async (event) => {
        // Guard against calling after unmount
        if (!isMountedRef.current) {
          cleanup()
          return
        }

        const errorMessage = event.error?.message || 'Unknown error'
        console.error('🎤 MediaRecorder error:', errorMessage)

        // Try next configuration if this was an "Internal Error" and we have fallbacks
        const { VOICE_CONFIGS } = await import('@/lib/voice-codec')
        if (errorMessage.includes('Internal') && configIndexRef.current < VOICE_CONFIGS.length - 1) {
          console.log('🎤 Retrying with next configuration...')
          
          // Move to next config and retry
          configIndexRef.current += 1
          
          // Restart recording with new configuration
          setTimeout(() => {
            if (isMountedRef.current) {
              startRecording()
            }
          }, 100)
          return
        }

        // No more fallbacks or different error type
        if (isMountedRef.current) {
          setState(prev => ({ 
            ...prev, 
            state: 'error', 
            error: 'Recording failed: ' + errorMessage
          }))
        }
        
        // Resolve the stopRecording promise with null on error
        if (stopPromiseResolveRef.current) {
          stopPromiseResolveRef.current(null)
          stopPromiseResolveRef.current = null
        }
        
        cleanup()
      }

      // Final mount check before starting
      if (!isMountedRef.current) {
        cleanup()
        return
      }

      // Start recording with timeout protection
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0
      
      // Set up timeout to detect if MediaRecorder fails to start
      startTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && isRecordingRef.current) {
          console.error('MediaRecorder start timeout - forcing cleanup')
          setState(prev => ({
            ...prev,
            state: 'error',
            error: 'Recording failed to start properly'
          }))
          cleanup()
        }
      }, 5000) // 5 second timeout
      
      try {
        mediaRecorder.start(1000) // Collect data every second
        console.log('🎤 MediaRecorder.start() called successfully')
        
        // Clear timeout on successful start
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }
      } catch (startError) {
        console.error('🎤 MediaRecorder.start() failed:', startError)
        if (startTimeoutRef.current) {
          clearTimeout(startTimeoutRef.current)
          startTimeoutRef.current = null
        }
        throw startError
      }

      // Update refs first
      isRecordingRef.current = true
      isPausedRef.current = false
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        console.log('🎤 Recording state updated, starting timer')
        setState(prev => ({ 
          ...prev, 
          state: 'recording',
          isRecording: true,
          isPaused: false,
          permission: 'granted'
        }))
      }

      startTimer()

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording'
      
      // Clear timeout on error
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current)
        startTimeoutRef.current = null
      }
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          state: 'error', 
          error: errorMessage
        }))
      }
      
      // Reset recording refs on error
      isRecordingRef.current = false
      isPausedRef.current = false
      cleanup()
    }
  }, [isSupported, cleanup, stopTimer, startTimer, createMediaRecorderWithFallback])

  // Stop recording
  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (!isMountedRef.current || !mediaRecorderRef.current || !isRecordingRef.current) {
      return null
    }

    // Return a promise that resolves when the onstop event completes processing
    return new Promise((resolve) => {
      stopPromiseResolveRef.current = resolve
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      } else {
        resolve(null)
      }
    })
  }, []) // No state dependencies

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!isMountedRef.current || !mediaRecorderRef.current || !isRecordingRef.current || isPausedRef.current) {
      return
    }
    
    try {
      mediaRecorderRef.current.pause()
      pausedTimeRef.current += Date.now() - startTimeRef.current
      stopTimer()
      
      // Update refs first
      isPausedRef.current = true
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isPaused: true
        }))
      }
    } catch (error) {
      console.error('Error pausing recording:', error)
    }
  }, [stopTimer])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!isMountedRef.current || !mediaRecorderRef.current || !isRecordingRef.current || !isPausedRef.current) {
      return
    }
    
    try {
      mediaRecorderRef.current.resume()
      startTimeRef.current = Date.now()
      startTimer()
      
      // Update refs first
      isPausedRef.current = false
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        setState(prev => ({ 
          ...prev, 
          isPaused: false
        }))
      }
    } catch (error) {
      console.error('Error resuming recording:', error)
    }
  }, [startTimer])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    // Clean up MediaRecorder if it exists and is recording
    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (error) {
        // Ignore errors from stopping already stopped recorder
      }
    }
    
    cleanup()
    
    // Update refs first
    isRecordingRef.current = false
    isPausedRef.current = false
    
    // Revoke any existing URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }
    
    // Only update state if still mounted
    if (isMountedRef.current) {
      setState(prev => ({
        state: 'idle',
        isRecording: false,
        isPaused: false,
        duration: 0,
        error: null,
        audioBlob: null,
        audioUrl: null,
        permission: prev.permission
      }))
    }
  }, [state.audioUrl, cleanup])

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    requestPermission,
    isSupported,
    maxDuration: MAX_RECORDING_DURATION
  }
}