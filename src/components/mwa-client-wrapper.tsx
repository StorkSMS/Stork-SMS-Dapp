'use client'

import { useEffect } from 'react'
import { 
  createDefaultAuthorizationCache, 
  createDefaultChainSelector, 
  createDefaultWalletNotFoundHandler,
  registerMwa, 
} from "@solana-mobile/wallet-standard-mobile"

// Client-side MWA registration component
export function MWAClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure this only runs on client-side
    if (typeof window === 'undefined') return
    
    const getUriForAppIdentity = () => {
      return `${window.location.protocol}//${window.location.host}`
    }

    try {
      registerMwa({
        appIdentity: {
          uri: getUriForAppIdentity(),
          name: 'Stork SMS',
          icon: 'stork-app-icon.png',
        },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: ["solana:devnet", "solana:mainnet"] as const,
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      })
      
      console.log("🚀 MWA registered successfully in client component")
    } catch (error) {
      console.error("❌ Failed to register MWA:", error)
    }
  }, [])

  return <>{children}</>
}