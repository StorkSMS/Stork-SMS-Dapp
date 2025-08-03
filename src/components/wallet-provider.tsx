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
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react"
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

  // Add refresh trigger for wallet re-evaluation after MWA registration
  const [walletRefreshTrigger, setWalletRefreshTrigger] = useState(0)
  
  // Get standard wallet adapters (includes MWA) - remove empty array to allow auto-detection
  // Re-evaluate when trigger changes
  const standardAdapters = useStandardWalletAdapters()
  
  // Check for manually registered wallets and try to detect MWA
  const [manualMWA, setManualMWA] = useState<any>(null)
  
  // Force wallet re-evaluation after MWA registration
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("🔄 Triggering wallet adapter refresh after MWA registration")
      setWalletRefreshTrigger(prev => prev + 1)
    }, 3000) // Give MWA time to register
    
    return () => clearTimeout(timer)
  }, [])
  
  useEffect(() => {
    const checkForMWA = () => {
      if (typeof window !== 'undefined' && window.navigator && 'wallets' in window.navigator) {
        const wallets = window.navigator.wallets as any
        console.log("🔍 Checking navigator.wallets:", wallets)
        
        console.log("🔍 wallets object methods:", Object.getOwnPropertyNames(wallets))
        console.log("🔍 wallets.get exists:", typeof wallets.get)
        
        if (wallets && wallets.get) {
          try {
            const availableWallets = wallets.get()
            console.log("🔍 Available standard wallets:", availableWallets)
            
            // Look for MWA specifically
            const mwaWallet = availableWallets.find((w: any) => 
              w.name?.includes('Mobile Wallet Adapter') || 
              w.name?.includes('MWA') ||
              w.name?.toLowerCase().includes('mobile')
            )
            
            if (mwaWallet) {
              console.log("✅ Found MWA manually:", mwaWallet)
              setManualMWA(mwaWallet)
            }
          } catch (error) {
            console.error("❌ Error calling wallets.get():", error)
          }
        } else {
          console.log("❌ wallets.get() method not available")
          
          // Try the push method (maybe it's a different API)
          if (wallets.push) {
            console.log("🔍 navigator.wallets has push method, trying to inspect it...")
            console.log("🔍 wallets.push:", wallets.push)
            
            // See if it's actually an array-like object
            console.log("🔍 wallets.length:", wallets.length)
            console.log("🔍 wallets as array:", Array.from(wallets))
          }
          
          // Try alternative wallet standard APIs
          if ('getWallets' in window.navigator) {
            console.log("🔍 Trying navigator.getWallets...")
            try {
              const navWallets = (window.navigator as any).getWallets()
              console.log("🔍 navigator.getWallets():", navWallets)
            } catch (error) {
              console.error("❌ Error with getWallets:", error)
            }
          }
          
          // Check for Wallet Standard events
          if (window.addEventListener) {
            console.log("🔍 Setting up wallet standard event listeners...")
            window.addEventListener('wallet-standard:register', (event) => {
              console.log("🎉 Wallet registered event:", event)
            })
            
            window.addEventListener('wallet-standard:unregister', (event) => {
              console.log("👋 Wallet unregistered event:", event)
            })
          }
        }
      }
    }
    
    // Check immediately and then periodically
    checkForMWA()
    const intervals = [2000, 4000, 6000, 8000] // Multiple checks
    const timers = intervals.map(delay => 
      setTimeout(() => {
        console.log(`🔄 Checking for MWA after ${delay}ms`)
        checkForMWA()
      }, delay)
    )
    
    return () => timers.forEach(clearTimeout)
  }, [])

  // Debug logging - run after component mounts
  useEffect(() => {
    console.log("🔍 WALLET PROVIDER DEBUG:")
    console.log("Standard adapters found:", standardAdapters.length)
    standardAdapters.forEach((adapter, index) => {
      console.log(`Adapter ${index}:`, adapter.name, adapter)
    })
  }, [standardAdapters])

  // Combine standard adapters with legacy adapters
  const wallets = useMemo(
    () => {
      const allWallets = [
        ...standardAdapters,
        new TorusWalletAdapter(),
        new LedgerWalletAdapter(),
      ]
      console.log("Total wallets available:", allWallets.length)
      allWallets.forEach((wallet, index) => {
        console.log(`Wallet ${index}:`, wallet.name)
      })
      return allWallets
    },
    [standardAdapters],
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
