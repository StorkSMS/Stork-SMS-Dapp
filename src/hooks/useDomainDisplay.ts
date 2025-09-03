import { useState, useCallback, useEffect } from 'react'
import { reverseResolveAddress, batchReverseResolve, getDisplayName, type DomainInfo, type ReverseDomainResult } from '@/lib/domain-resolver'

interface UseDomainDisplayState {
  resolvedDomains: Map<string, DomainInfo>
  loadingAddresses: Set<string>
  errorAddresses: Set<string>
}

export const useDomainDisplay = () => {
  const [state, setState] = useState<UseDomainDisplayState>({
    resolvedDomains: new Map(),
    loadingAddresses: new Set(),
    errorAddresses: new Set()
  })

  const [debouncedAddresses, setDebouncedAddresses] = useState<string[]>([])
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  /**
   * Resolve a single address
   */
  const resolveSingleAddress = useCallback(async (address: string): Promise<ReverseDomainResult> => {
    if (!address || address.trim().length === 0) {
      return {
        displayName: '',
        actualAddress: address,
        isDomain: false,
        domainInfo: null,
        isLoading: false
      }
    }

    const trimmed = address.trim()

    // Check if we already have this address resolved
    const existingDomain = state.resolvedDomains.get(trimmed)
    if (existingDomain) {
      return {
        displayName: getDisplayName(trimmed, existingDomain),
        actualAddress: trimmed,
        isDomain: !!existingDomain.domain,
        domainInfo: existingDomain,
        isLoading: false
      }
    }

    // Check if we're currently loading this address
    const isLoading = state.loadingAddresses.has(trimmed)
    if (isLoading) {
      return {
        displayName: getDisplayName(trimmed, null), // Show truncated address while loading
        actualAddress: trimmed,
        isDomain: false,
        domainInfo: null,
        isLoading: true
      }
    }

    // Start resolution
    setState(prev => ({
      ...prev,
      loadingAddresses: new Set(prev.loadingAddresses).add(trimmed),
      errorAddresses: new Set([...prev.errorAddresses].filter(addr => addr !== trimmed))
    }))

    try {
      const domainInfo = await reverseResolveAddress(trimmed)
      
      setState(prev => {
        const newResolvedDomains = new Map(prev.resolvedDomains)
        newResolvedDomains.set(trimmed, domainInfo)
        
        const newLoadingAddresses = new Set(prev.loadingAddresses)
        newLoadingAddresses.delete(trimmed)

        return {
          ...prev,
          resolvedDomains: newResolvedDomains,
          loadingAddresses: newLoadingAddresses
        }
      })

      return {
        displayName: getDisplayName(trimmed, domainInfo),
        actualAddress: trimmed,
        isDomain: !!domainInfo.domain,
        domainInfo,
        isLoading: false
      }

    } catch (error) {
      console.error(`Error resolving address ${trimmed}:`, error)
      
      setState(prev => {
        const newLoadingAddresses = new Set(prev.loadingAddresses)
        newLoadingAddresses.delete(trimmed)
        
        const newErrorAddresses = new Set(prev.errorAddresses)
        newErrorAddresses.add(trimmed)

        return {
          ...prev,
          loadingAddresses: newLoadingAddresses,
          errorAddresses: newErrorAddresses
        }
      })

      return {
        displayName: getDisplayName(trimmed, null), // Fallback to truncated address
        actualAddress: trimmed,
        isDomain: false,
        domainInfo: null,
        isLoading: false
      }
    }
  }, [state.resolvedDomains, state.loadingAddresses])

  /**
   * Batch resolve multiple addresses with debouncing
   * Useful for sidebar that shows many addresses at once
   */
  const resolveBatchAddresses = useCallback((addresses: string[], delay = 500) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      setDebouncedAddresses(addresses.filter(addr => addr && addr.trim().length > 0))
    }, delay)
    
    setDebounceTimer(timer)

    // Cleanup timer on component unmount
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [debounceTimer])

  // Auto-resolve when debounced addresses change
  useEffect(() => {
    if (debouncedAddresses.length === 0) return

    const resolveAddresses = async () => {
      // Filter out addresses we already have or are currently loading
      const addressesToResolve = debouncedAddresses.filter(addr => 
        !state.resolvedDomains.has(addr) && !state.loadingAddresses.has(addr)
      )

      if (addressesToResolve.length === 0) return

      // Mark addresses as loading
      setState(prev => ({
        ...prev,
        loadingAddresses: new Set([...prev.loadingAddresses, ...addressesToResolve])
      }))

      try {
        // Batch resolve for efficiency
        const results = await batchReverseResolve(addressesToResolve)
        
        setState(prev => {
          const newResolvedDomains = new Map(prev.resolvedDomains)
          const newLoadingAddresses = new Set(prev.loadingAddresses)
          
          results.forEach((domainInfo, address) => {
            newResolvedDomains.set(address, domainInfo)
            newLoadingAddresses.delete(address)
          })

          return {
            ...prev,
            resolvedDomains: newResolvedDomains,
            loadingAddresses: newLoadingAddresses
          }
        })

      } catch (error) {
        console.error('Error batch resolving addresses:', error)
        
        setState(prev => {
          const newLoadingAddresses = new Set(prev.loadingAddresses)
          const newErrorAddresses = new Set(prev.errorAddresses)
          
          addressesToResolve.forEach(addr => {
            newLoadingAddresses.delete(addr)
            newErrorAddresses.add(addr)
          })

          return {
            ...prev,
            loadingAddresses: newLoadingAddresses,
            errorAddresses: newErrorAddresses
          }
        })
      }
    }

    resolveAddresses()
  }, [debouncedAddresses, state.resolvedDomains, state.loadingAddresses])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  /**
   * Get display info for a single address (sync)
   * Returns cached result or loading state
   */
  const getDisplayInfo = useCallback((address: string): ReverseDomainResult => {
    if (!address || address.trim().length === 0) {
      return {
        displayName: '',
        actualAddress: address,
        isDomain: false,
        domainInfo: null,
        isLoading: false
      }
    }

    const trimmed = address.trim()
    const domainInfo = state.resolvedDomains.get(trimmed)
    const isLoading = state.loadingAddresses.has(trimmed)
    const hasError = state.errorAddresses.has(trimmed)

    return {
      displayName: getDisplayName(trimmed, domainInfo || null),
      actualAddress: trimmed,
      isDomain: !!(domainInfo?.domain),
      domainInfo: domainInfo || null,
      isLoading: isLoading && !hasError
    }
  }, [state.resolvedDomains, state.loadingAddresses, state.errorAddresses])

  /**
   * Clear all cached domain resolutions
   */
  const clearCache = useCallback(() => {
    setState({
      resolvedDomains: new Map(),
      loadingAddresses: new Set(),
      errorAddresses: new Set()
    })
  }, [])

  return {
    resolveSingleAddress,
    resolveBatchAddresses,
    getDisplayInfo,
    clearCache,
    // State for debugging
    isLoading: state.loadingAddresses.size > 0,
    cacheSize: state.resolvedDomains.size,
    loadingCount: state.loadingAddresses.size,
    errorCount: state.errorAddresses.size
  }
}