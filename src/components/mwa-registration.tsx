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
            const wallets = window.navigator.wallets as any
            if (wallets && wallets.get) {
              console.log("Wallets.get():", wallets.get())
            }
          }
          
          // Check window.solana and other wallet detection methods
          console.log("window.solana:", typeof window.solana !== 'undefined')
          
          // Check if wallet standard is working
          if ('getWallets' in window.navigator) {
            console.log("getWallets available")
          }
          
          // Check for specific mobile wallet signatures
          console.log("User Agent:", navigator.userAgent)
          console.log("Is Mobile:", /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
        }, 2000)
        
        console.log("MWA registered successfully")
      } catch (error) {
        console.error("Failed to register MWA:", error)
      }
    }
  }, [])

  return null
}