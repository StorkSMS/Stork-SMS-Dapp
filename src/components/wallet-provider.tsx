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
// Removed useStandardWalletAdapters import - using built-in WalletProvider detection
import { MWARegistration } from "./mwa-registration"

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

  // Use the standard approach - let WalletProvider handle standard wallets automatically
  // We just need to provide the legacy adapters, MWA will be detected automatically
  const legacyAdapters = useMemo(() => [
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
  ], [])

  // Debug logging - run after component mounts
  useEffect(() => {
    console.log("🔍 WALLET PROVIDER DEBUG:")
    console.log("Legacy adapters provided:", legacyAdapters.length)
    legacyAdapters.forEach((adapter, index) => {
      console.log(`Legacy Adapter ${index}:`, adapter.name, adapter)
    })
    console.log("🎯 WalletProvider will auto-detect standard wallets (including MWA)")
  }, [legacyAdapters])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={legacyAdapters} autoConnect={false}>
        <MWARegistration />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
