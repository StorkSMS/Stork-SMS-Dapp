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
import { MWAClientWrapper } from "./mwa-client-wrapper"

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
    console.log("🎯 MWA will be registered in separate client wrapper")
    
    // Check if MWA registered properly
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.navigator && 'wallets' in window.navigator) {
        const wallets = (window.navigator as any).wallets
        console.log("📱 Navigator wallets API:", wallets)
        console.log("🔧 Available methods:", Object.getOwnPropertyNames(wallets))
        if (wallets.get) {
          console.log("📋 Detected wallets:", wallets.get())
        }
      }
    }, 2000)
  }, [adapters])

  return (
    <MWAClientWrapper>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={adapters} autoConnect={true}>
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </MWAClientWrapper>
  )
}
