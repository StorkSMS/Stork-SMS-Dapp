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
    }
  }, [])

  return null
}