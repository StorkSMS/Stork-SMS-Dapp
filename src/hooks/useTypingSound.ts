import { useCallback, useRef } from 'react'

interface TypingSoundOptions {
  volume?: number
  cooldownDuration?: number
}

export const useTypingSound = (options: TypingSoundOptions = {}) => {
  const { volume = 0.2, cooldownDuration = 20000 } = options
  const lastPlayTimeRef = useRef<number>(0)
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const playTypingSound = useCallback(() => {
    const now = Date.now()
    
    // Check if we're still in cooldown period
    if (now - lastPlayTimeRef.current < cooldownDuration) {
      console.log('🔇 Typing sound blocked - still in cooldown period')
      return
    }

    try {
      // Create audio element and play the sound
      const audio = new Audio('/noti/Typing-sound-effect.mp3')
      audio.volume = volume
      
      audio.play().then(() => {
        console.log('🔊 Typing sound played successfully')
        lastPlayTimeRef.current = now
        
        // Set up cooldown reset timeout
        if (cooldownTimeoutRef.current) {
          clearTimeout(cooldownTimeoutRef.current)
        }
        
        cooldownTimeoutRef.current = setTimeout(() => {
          console.log('⏰ Typing sound cooldown period ended')
        }, cooldownDuration)
        
      }).catch((error) => {
        console.error('🔇 Failed to play typing sound:', error)
      })
      
    } catch (error) {
      console.error('🔇 Error creating typing sound audio:', error)
    }
  }, [volume, cooldownDuration])

  const resetCooldown = useCallback(() => {
    console.log('🔄 Resetting typing sound cooldown')
    lastPlayTimeRef.current = 0
    
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current)
      cooldownTimeoutRef.current = null
    }
  }, [])

  return {
    playTypingSound,
    resetCooldown
  }
}