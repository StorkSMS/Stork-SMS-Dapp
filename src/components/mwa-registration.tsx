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
      console.log("🚀 Registering MWA for Solflare detection...")
      
      // Check if already registered
      if ((window as any).__mwaRegistered) {
        console.log("⚠️ MWA already registered, skipping")
        return
      }
      
      try {
        const config = {
          appIdentity: {
            name: "Stork SMS",
            uri: "https://dapp.stork-sms.net",
            icon: "stork-app-icon.png",
          },
          authorizationCache: createDefaultAuthorizationCache(),
          chains: ["solana:devnet", "solana:mainnet"] as const,
          chainSelector: createDefaultChainSelector(),
          onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }
        
        console.log("📋 MWA Config:", config)
        registerMwa(config)
        ;(window as any).__mwaRegistered = true
        
        // Set up wallet registration listener immediately
        if (window.navigator && 'wallets' in window.navigator) {
          const wallets = (window.navigator as any).wallets
          if (wallets && wallets.on) {
            console.log("🔄 Setting up immediate wallet registration listener...")
            wallets.on('register', (wallet: any) => {
              console.log("🆕 SOLFLARE DETECTED! New wallet registered:", wallet.name, wallet)
            })
            wallets.on('unregister', (wallet: any) => {
              console.log("❌ Wallet unregistered:", wallet.name)
            })
          }
        }

        // Enhanced MWA debugging with multiple checks
        const checkWallets = (attempt: number) => {
          console.log(`🔍 WALLET CHECK ATTEMPT ${attempt}:`)
          
          if (attempt === 1) {
            // Check browser environment on first attempt
            console.log("📱 Device Info:")
            console.log("  User Agent:", navigator.userAgent)
            console.log("  Is Android Chrome:", /Android.*Chrome/i.test(navigator.userAgent))
            console.log("  Is Mobile:", /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
          }
          
          // Check wallet standard API
          console.log("🔌 Wallet Standard API:")
          if (window.navigator && 'wallets' in window.navigator) {
            console.log("  ✅ navigator.wallets exists")
            const wallets = window.navigator.wallets as any
            if (wallets && wallets.get) {
              const availableWallets = wallets.get()
              console.log("  📊 Available wallets count:", availableWallets?.length || 0)
              
              if (availableWallets?.length > 0) {
                console.log("  🎉 WALLETS FOUND!")
                availableWallets.forEach((wallet: any, index: number) => {
                  console.log(`    Wallet ${index}:`, {
                    name: wallet.name,
                    icon: wallet.icon,
                    accounts: wallet.accounts?.length || 0,
                    features: Object.keys(wallet.features || {}),
                    chains: wallet.chains
                  })
                  
                  if (wallet.name?.toLowerCase().includes('solflare')) {
                    console.log("    🚀 SOLFLARE FOUND!")
                  }
                })
              } else {
                console.log("  ❌ No wallets detected yet")
              }
            }
          } else {
            console.log("  ❌ navigator.wallets not available")
          }
          
          // Check legacy wallet detection
          console.log("🔌 Legacy Wallet Detection:")
          console.log("  window.solana:", typeof window.solana !== 'undefined')
          console.log("  window.phantom:", typeof (window as any).phantom !== 'undefined')
          console.log("  window.solflare:", typeof (window as any).solflare !== 'undefined')
          
          if (typeof (window as any).solflare !== 'undefined') {
            console.log("  🚀 SOLFLARE LEGACY API DETECTED!")
          }
        }

        // Check immediately, then at intervals
        setTimeout(() => checkWallets(1), 1000)
        setTimeout(() => checkWallets(2), 3000)
        setTimeout(() => checkWallets(3), 5000)
        
        // Expose enhanced debugging function
        setTimeout(() => {
          const isAndroidChrome = /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent) && !/Edge|OPR/i.test(navigator.userAgent);
          
          (window as any).debugMWA = () => {
            console.log("🔧 MANUAL MWA DEBUG (SOLFLARE SEARCH):")
            const wallets = (window.navigator as any).wallets?.get?.() || []
            console.log("  Current wallets:", wallets)
            
            const solflareWallet = wallets.find((w: any) => 
              w.name?.toLowerCase().includes('solflare') || 
              w.name?.toLowerCase().includes('mobile wallet adapter')
            )
            
            if (solflareWallet) {
              console.log("  🚀 SOLFLARE WALLET FOUND:", solflareWallet)
            } else {
              console.log("  ❌ Solflare not found in wallet list")
              console.log("")
              console.log("  🔧 TROUBLESHOOTING STEPS:")
              console.log("  1. 🔋 Disable Android Battery Saver Mode (known to break MWA)")
              console.log("  2. 📱 Open Solflare app and ensure it's unlocked")
              console.log("  3. 🌐 Check if Solflare and dApp are on same network (devnet/mainnet)")
              console.log("  4. 🔄 Refresh this page after opening Solflare")
              console.log("  5. 🏠 Try accessing dApp from Solflare's in-app browser")
              console.log("")
            }
            
            // Check current dApp network
            const currentNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet' : 'devnet'
            console.log(`  🌐 dApp Network: ${currentNetwork}`)
            console.log("  💡 Ensure Solflare is also on", currentNetwork)

            return {
              environment: isAndroidChrome ? "✅ Compatible" : "❌ Incompatible",
              wallets: wallets,
              solflareFound: !!solflareWallet,
              hasWalletStandard: !!(window.navigator as any).wallets,
              legacySolflare: typeof (window as any).solflare !== 'undefined',
              dappNetwork: currentNetwork,
              troubleshooting: [
                "Disable Android Battery Saver Mode",
                "Open and unlock Solflare app", 
                `Set Solflare to ${currentNetwork} network`,
                "Refresh page after opening Solflare",
                "Try dApp from Solflare in-app browser"
              ]
            }
          };
          console.log("💡 Run window.debugMWA() for Solflare-specific debugging");
          
          // Add force wallet detection function
          (window as any).forceMWADetection = () => {
            console.log("🔄 FORCING MWA WALLET DETECTION...")
            
            // Try to manually trigger wallet registration events
            const wallets = (window.navigator as any).wallets
            if (wallets) {
              console.log("📡 Triggering wallet discovery...")
              
              // Force discovery
              if (wallets.get) {
                const result = wallets.get()
                console.log("🔍 Discovery result:", result)
              }
              
              // Check if there's a discovery method
              if (wallets.discover) {
                console.log("🔍 Calling wallets.discover()...")
                wallets.discover()
              }
              
              // Check for any hidden methods
              console.log("🔧 Available wallet methods:", Object.getOwnPropertyNames(wallets))
            }
            
            // Also check for direct MWA detection
            console.log("📱 Checking for MWA-specific signatures...")
            if ('solana' in window) {
              console.log("Found window.solana")
            }
            
            // Check Android intent handling
            if ('Android' in window || 'startActivity' in window) {
              console.log("Android-specific APIs available")
            }
            
            return "Check console for detection results"
          };
          console.log("💡 Run window.forceMWADetection() to force wallet discovery");
        }, 2000)
        
        console.log("MWA registered successfully")
        
        // Immediate function exposure for testing
        ;(window as any).testMWA = () => {
          console.log("🧪 TEST MWA FUNCTION WORKS!")
          return "Function is available"
        }
        console.log("🧪 TEST: window.testMWA() should work immediately")
      } catch (error) {
        console.error("Failed to register MWA:", error)
      }
    }
  }, [])

  return null
}