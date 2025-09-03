import { useState, useCallback, useEffect } from 'react'
import { resolveInput as resolveDomainInput, isDomainFormat, type DomainResolutionResult } from '@/lib/domain-resolver'

interface UseDomainResolutionState {
  isResolving: boolean
  result: DomainResolutionResult | null
  error: string | null
}

export const useDomainResolution = () => {
  const [state, setState] = useState<UseDomainResolutionState>({
    isResolving: false,
    result: null,
    error: null
  })

  const [debouncedValue, setDebouncedValue] = useState<string>('')
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const resolveInput = useCallback(async (input: string, immediate = false): Promise<DomainResolutionResult | null> => {
    if (!input || input.trim().length === 0) {
      setState({
        isResolving: false,
        result: null,
        error: null
      })
      return null
    }

    const trimmed = input.trim()

    // If it's not a domain format and it looks like a valid wallet address, 
    // resolve immediately without showing loading state
    if (!isDomainFormat(trimmed) && trimmed.length >= 32) {
      try {
        const result = await resolveDomainInput(trimmed)
        setState({
          isResolving: false,
          result,
          error: result?.error || null
        })
        return result
      } catch (error) {
        setState({
          isResolving: false,
          result: null,
          error: error instanceof Error ? error.message : 'Resolution failed'
        })
        return null
      }
    }

    // For domains or immediate resolution, show loading state
    if (immediate || isDomainFormat(trimmed)) {
      setState(prev => ({
        ...prev,
        isResolving: true,
        error: null
      }))

      try {
        const result = await resolveDomainInput(trimmed)
        setState({
          isResolving: false,
          result,
          error: result?.error || null
        })
        return result
      } catch (error) {
        setState({
          isResolving: false,
          result: null,
          error: error instanceof Error ? error.message : 'Resolution failed'
        })
        return null
      }
    }

    return null
  }, [])

  const debouncedResolveInput = useCallback((input: string, delay = 500): (() => void) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      setDebouncedValue(input)
    }, delay)
    
    setDebounceTimer(timer)

    // Cleanup timer on component unmount
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [debounceTimer])

  // Auto-resolve when debounced value changes
  useEffect(() => {
    if (debouncedValue) {
      resolveInput(debouncedValue)
    }
  }, [debouncedValue, resolveInput])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  const clearResult = useCallback(() => {
    setState({
      isResolving: false,
      result: null,
      error: null
    })
    setDebouncedValue('')
  }, [])

  const getDisplayAddress = useCallback((): string | null => {
    if (state.result && state.result.isValid) {
      return state.result.address
    }
    return null
  }, [state.result])

  const getValidationMessage = useCallback((): string | null => {
    if (state.isResolving) {
      return 'Resolving...'
    }
    if (state.error) {
      return state.error
    }
    if (state.result && state.result.isValid && state.result.type === 'domain') {
      return `Resolved to ${state.result.address.slice(0, 6)}...${state.result.address.slice(-4)}`
    }
    return null
  }, [state])

  return {
    isResolving: state.isResolving,
    result: state.result,
    error: state.error,
    resolveInput,
    debouncedResolveInput,
    clearResult,
    getDisplayAddress,
    getValidationMessage,
    isDomainFormat
  }
}