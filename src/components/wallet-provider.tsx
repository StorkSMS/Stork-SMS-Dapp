"use client"

import type React from "react"
import { useMemo, useEffect, useState } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { 
  createDefaultAuthorizationCache, 
  createDefaultChainSelector, 
  createDefaultWalletNotFoundHandler,
  registerMwa, 
} from "@solana-mobile/wallet-standard-mobile"

// Register MWA at module level (like official example)
function getUriForAppIdentity() {
  const location = globalThis.location;
  if (!location) return;
  return `${location.protocol}//${location.host}`;
}

if (typeof window !== 'undefined') {
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
}

interface WalletContextProviderProps {
  children: React.ReactNode
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  // Network selection: Use environment variable for testing, otherwise devnet
  const network = useMemo(() => {
    if (typeof window !== 'undefined') {
      // Client-side: check for testing override
      return process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' 
        ? WalletAdapterNetwork.Mainnet 
        : WalletAdapterNetwork.Devnet
    }
    return WalletAdapterNetwork.Devnet
  }, [])

  // Use public RPC endpoints for wallet adapter (only used for wallet connection, not sensitive operations)
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Use empty wallets array like official MWA example
  // MWA will be auto-detected when registered at module level
  const adapters = useMemo(() => 
    typeof window === 'undefined'
      ? [] // No wallet adapters when server-side rendering
      : [
          // Note: You don't have to include MWA adapters here;
          // They will be added automatically when MWA is registered.
          // Only include legacy adapters if specifically needed
        ]
  , [])

  // Debug logging - run after component mounts
  useEffect(() => {
    console.log("🔍 WALLET PROVIDER DEBUG (Official MWA Pattern):")
    console.log("Adapters provided:", adapters.length)
    console.log("🎯 MWA should auto-register via module-level registration")
    
    // Check if MWA registered properly
    setTimeout(() => {
      if (window.navigator && 'wallets' in window.navigator) {
        const wallets = (window.navigator as any).wallets
        console.log("📱 Navigator wallets API:", wallets)
        console.log("🔧 Available methods:", Object.getOwnPropertyNames(wallets))
        if (wallets.get) {
          console.log("📋 Detected wallets:", wallets.get())
        }
      }
    }, 1000)
  }, [adapters])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={adapters} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
