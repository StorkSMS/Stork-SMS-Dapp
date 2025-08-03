"use client"

import { useEffect } from "react"
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile"

export function MWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("Registering MWA...")
      try {
        registerMwa({
          appIdentity: {
            name: "Stork SMS",
            uri: "https://dapp.stork-sms.net",
            icon: "stork-app-icon.png",
          },
          authorizationCache: createDefaultAuthorizationCache(),
          chains: ["solana:devnet", "solana:mainnet"],
          chainSelector: createDefaultChainSelector(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        })
        
        // Debug: Check if MWA is registered
        setTimeout(() => {
          if (window.navigator && 'wallets' in window.navigator) {
            console.log("Available wallets:", window.navigator.wallets)
          }
        }, 1000)
        
        console.log("MWA registered successfully")
      } catch (error) {
        console.error("Failed to register MWA:", error)
      }
    }
  }, [])

  return null
}