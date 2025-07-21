import { useState, useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface ConnectionHealthState {
  isHealthy: boolean
  lastHeartbeat: Date | null
  heartbeatsMissed: number
  channels: {
    conversations: 'healthy' | 'unhealthy' | 'disconnected'
    messages: 'healthy' | 'unhealthy' | 'disconnected'
    readReceipts: 'healthy' | 'unhealthy' | 'disconnected'
  }
  lastError: string | null
}

interface UseConnectionHealthProps {
  conversationsChannel: RealtimeChannel | null
  messagesChannel: RealtimeChannel | null
  readReceiptsChannel: RealtimeChannel | null
  onUnhealthy?: (channel: keyof ConnectionHealthState['channels']) => void
  heartbeatInterval?: number // Default: 10000ms (10 seconds)
  unhealthyThreshold?: number // Number of missed heartbeats before marking unhealthy
}

export const useConnectionHealth = ({
  conversationsChannel,
  messagesChannel,
  readReceiptsChannel,
  onUnhealthy,
  heartbeatInterval = 10000,
  unhealthyThreshold = 3
}: UseConnectionHealthProps) => {
  const [state, setState] = useState<ConnectionHealthState>({
    isHealthy: true,
    lastHeartbeat: null,
    heartbeatsMissed: 0,
    channels: {
      conversations: 'disconnected',
      messages: 'disconnected',
      readReceipts: 'disconnected'
    },
    lastError: null
  })

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastHeartbeatRef = useRef<Date | null>(null)

  // Check channel health
  const checkChannelHealth = useCallback((channel: RealtimeChannel | null, name: keyof ConnectionHealthState['channels']) => {
    if (!channel) {
      return 'disconnected' as const
    }

    // Check if channel is subscribed
    const isSubscribed = channel.state === 'joined'
    
    if (!isSubscribed) {
      return 'disconnected' as const
    }

    // Check if we've missed too many heartbeats
    if (state.heartbeatsMissed >= unhealthyThreshold) {
      return 'unhealthy' as const
    }

    return 'healthy' as const
  }, [state.heartbeatsMissed, unhealthyThreshold])

  // Perform health check
  const performHealthCheck = useCallback(() => {
    const now = new Date()
    
    // Check if we've received a heartbeat recently
    if (lastHeartbeatRef.current) {
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeatRef.current.getTime()
      const expectedHeartbeatWindow = heartbeatInterval * 1.5 // Allow 50% tolerance
      
      if (timeSinceLastHeartbeat > expectedHeartbeatWindow) {
        setState(prev => ({
          ...prev,
          heartbeatsMissed: prev.heartbeatsMissed + 1,
          lastError: `No heartbeat for ${Math.round(timeSinceLastHeartbeat / 1000)}s`
        }))
      }
    }

    // Check each channel's health
    const channelHealths = {
      conversations: checkChannelHealth(conversationsChannel, 'conversations'),
      messages: checkChannelHealth(messagesChannel, 'messages'),
      readReceipts: checkChannelHealth(readReceiptsChannel, 'readReceipts')
    }

    // Determine overall health
    const overallHealthy = Object.values(channelHealths).some(h => h === 'healthy') &&
                          !Object.values(channelHealths).includes('unhealthy')

    setState(prev => ({
      ...prev,
      isHealthy: overallHealthy,
      channels: channelHealths
    }))

    // Notify about unhealthy channels
    if (onUnhealthy) {
      Object.entries(channelHealths).forEach(([channel, health]) => {
        if (health === 'unhealthy') {
          onUnhealthy(channel as keyof ConnectionHealthState['channels'])
        }
      })
    }

    console.log('🏥 Connection health check:', {
      isHealthy: overallHealthy,
      heartbeatsMissed: state.heartbeatsMissed,
      channels: channelHealths,
      lastHeartbeat: lastHeartbeatRef.current?.toISOString()
    })
  }, [conversationsChannel, messagesChannel, readReceiptsChannel, checkChannelHealth, heartbeatInterval, onUnhealthy, state.heartbeatsMissed])

  // Record heartbeat
  const recordHeartbeat = useCallback(() => {
    const now = new Date()
    lastHeartbeatRef.current = now
    
    setState(prev => ({
      ...prev,
      lastHeartbeat: now,
      heartbeatsMissed: 0,
      lastError: null
    }))
    
    console.log('💓 Heartbeat recorded at', now.toISOString())
  }, [])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    console.log('🏥 Starting connection health monitoring...')
    
    // Clear existing timer
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
    }

    // Record initial heartbeat
    recordHeartbeat()

    // Set up periodic health checks
    heartbeatTimerRef.current = setInterval(() => {
      performHealthCheck()
    }, heartbeatInterval)
  }, [heartbeatInterval, performHealthCheck, recordHeartbeat])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    console.log('🏥 Stopping connection health monitoring...')
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }, [])

  // Monitor channel changes
  useEffect(() => {
    // Only start monitoring if we have at least one channel
    if (conversationsChannel || messagesChannel || readReceiptsChannel) {
      startMonitoring()
    } else {
      stopMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [conversationsChannel, messagesChannel, readReceiptsChannel, startMonitoring, stopMonitoring])

  // Force health check
  const forceHealthCheck = useCallback(() => {
    console.log('🏥 Forcing health check...')
    performHealthCheck()
  }, [performHealthCheck])

  return {
    ...state,
    recordHeartbeat,
    forceHealthCheck,
    startMonitoring,
    stopMonitoring
  }
}