"use client"

import type React from "react"
import { useMemo } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import {
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
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

  // Only include adapters that are definitely available in @solana/wallet-adapter-wallets
  const wallets = useMemo(
    () => [
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [],
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <MWARegistration />
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}
