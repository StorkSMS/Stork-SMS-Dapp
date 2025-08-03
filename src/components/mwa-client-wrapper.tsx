'use client'

import { useEffect } from 'react'
import { 
  createDefaultAuthorizationCache, 
  createDefaultChainSelector, 
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
      // Custom wallet not found handler
      const customWalletNotFoundHandler = async () => {
        console.log("🔍 No wallet found - handling gracefully")
        
        // Show a subtle notification instead of the big modal
        const notification = document.createElement('div')
        notification.innerHTML = `
          <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-family: 'Helvetica Neue', sans-serif;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
          ">
            <div style="font-weight: 600; margin-bottom: 4px;">No wallet detected</div>
            <div style="opacity: 0.9;">Please install Solflare or Phantom wallet</div>
          </div>
          <style>
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          </style>
        `
        document.body.appendChild(notification)
        
        // Remove notification after 4 seconds
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease-out forwards'
          setTimeout(() => notification.remove(), 300)
        }, 4000)
        
        // Add slide out animation
        const style = document.createElement('style')
        style.textContent = `
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `
        document.head.appendChild(style)
      }
      
      registerMwa({
        appIdentity: {
          uri: getUriForAppIdentity(),
          name: 'Stork SMS',
          icon: 'stork-app-icon.png',
        },
        authorizationCache: createDefaultAuthorizationCache(),
        chains: ["solana:devnet", "solana:mainnet"] as const,
        chainSelector: createDefaultChainSelector(),
        onWalletNotFound: customWalletNotFoundHandler,
      })
      
      console.log("🚀 MWA registered successfully with custom wallet handler")
    } catch (error) {
      console.error("❌ Failed to register MWA:", error)
    }
  }, [])

  return <>{children}</>
}