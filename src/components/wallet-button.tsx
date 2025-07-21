"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"

export function WalletButton() {
  const { wallets, wallet, publicKey, connect, disconnect, connecting, connected, select } = useWallet()
  const { isAuthenticated, isAuthenticating, requiresSignature, error, signOut, authenticateWithWallet } = useAuth()
  const [showWalletList, setShowWalletList] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [hasTriggeredAuth, setHasTriggeredAuth] = useState(false)
  const [userInitiatedConnection, setUserInitiatedConnection] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Trigger authentication after wallet connects (only for user-initiated connections and not already authenticated)
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating && !hasTriggeredAuth && userInitiatedConnection) {
      setHasTriggeredAuth(true)
      // Trigger authentication immediately - wallets are ready when connected
      authenticateWithWallet()
    }
  }, [connected, publicKey, isAuthenticated, isAuthenticating, hasTriggeredAuth, userInitiatedConnection, authenticateWithWallet])

  // Reset auth trigger and user-initiated flag when wallet disconnects
  useEffect(() => {
    if (!connected) {
      setHasTriggeredAuth(false)
      setUserInitiatedConnection(false)
    }
  }, [connected])

  // Reset hasTriggeredAuth when authentication completes to allow future authentication attempts
  useEffect(() => {
    if (isAuthenticated) {
      setHasTriggeredAuth(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowWalletList(false)
      }
    }

    if (showWalletList) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWalletList])

  const handleWalletSelect = async (walletName: string) => {
    const selectedWallet = wallets.find((w) => w.adapter.name === walletName)
    if (selectedWallet) {
      try {
        select(selectedWallet.adapter.name)
        setShowWalletList(false)
        setUserInitiatedConnection(true) // Mark this as a user-initiated connection
        // Connect immediately after wallet selection
        try {
          await connect()
        } catch (error) {
          console.error("Failed to connect wallet:", error)
        }
      } catch (error) {
        console.error("Failed to select wallet:", error)
      }
    }
  }

  const handleConnect = async () => {
    if (wallet) {
      try {
        await connect()
      } catch (error) {
        console.error("Failed to connect wallet:", error)
      }
    }
  }

  const handleDisconnect = async () => {
    try {
      await signOut()
      await disconnect()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    }
  }

  const availableWallets = wallets.filter((wallet) => wallet.readyState === "Installed")

  if (!mounted) {
    return (
      <Button
        disabled
        className="bg-[#3388FF] text-[#FFF] border-2 border-[#38F] rounded-none h-12 px-8 relative"
        style={{
          fontFamily: "Helvetica Neue, sans-serif",
          fontWeight: 500,
          boxShadow: "inset 0 0 0 1px #FFF",
        }}
      >
        Connect Wallet
      </Button>
    )
  }

  // Show authentication status
  if (connected && publicKey && isAuthenticating) {
    const statusText = requiresSignature ? 'Awaiting Signature' : 'Awaiting Signature'
    return (
      <Button
        disabled
        className="bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] rounded-none h-12 px-8 relative"
        style={{
          fontFamily: "Helvetica Neue, sans-serif",
          fontWeight: 500,
          boxShadow: "inset 0 0 0 1px #FFF",
        }}
      >
        {statusText}
      </Button>
    )
  }

  // Show error state
  if (connected && publicKey && error && !isAuthenticating) {
    return (
      <Button
        onClick={() => window.location.reload()}
        className="bg-[#FF4444] text-[#FFF] border-2 border-[#FF4444] hover:bg-[#FF3333] rounded-none h-12 px-8 relative"
        style={{
          fontFamily: "Helvetica Neue, sans-serif",
          fontWeight: 500,
          boxShadow: "inset 0 0 0 1px #FFF",
        }}
        title={error}
      >
        Auth Failed - Retry
      </Button>
    )
  }

  if (connected && publicKey && isAuthenticated) {
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          onClick={() => setShowWalletList(!showWalletList)}
          className="bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] hover:bg-[#2277EE] rounded-none h-12 px-8 relative"
          style={{
            fontFamily: "Helvetica Neue, sans-serif",
            fontWeight: 500,
            boxShadow: "inset 0 0 0 1px #FFF",
          }}
        >
          {`${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`}
        </Button>

        {showWalletList && (
          <div className="absolute top-full right-0 mt-2 bg-[#FFF] border-2 border-black min-w-[200px] z-50">
            <Button
              onClick={handleDisconnect}
              className="w-full bg-[#FFF] text-black border-none hover:bg-gray-50 rounded-none h-10 text-left justify-start"
              style={{ fontFamily: "Helvetica Neue, sans-serif" }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (connecting) {
    return (
      <Button
        disabled
        className="bg-[#3388FF] text-[#FFF] border-2 border-[#38F] rounded-none h-12 px-8 relative opacity-50"
        style={{
          fontFamily: "Helvetica Neue, sans-serif",
          fontWeight: 500,
          boxShadow: "inset 0 0 0 1px #FFF",
        }}
      >
        Connecting...
      </Button>
    )
  }

  // Remove the intermediate "Connect {wallet}" state - we go straight from selection to connection

  // Handle button click - if wallet is auto-connected but not authenticated, trigger authentication directly
  const handleConnectButtonClick = () => {
    if (connected && publicKey && !isAuthenticated && !isAuthenticating) {
      // Wallet is auto-connected but not authenticated, trigger authentication
      setUserInitiatedConnection(true)
      setHasTriggeredAuth(true)
      authenticateWithWallet()
    } else if (!connected) {
      // Show wallet selection dropdown only if not connected
      setShowWalletList(!showWalletList)
    }
    // If already authenticated, do nothing (button shouldn't show in this state anyway)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={handleConnectButtonClick}
        className="bg-[#3388FF] text-[#FFF] border-2 border-[#38F] hover:bg-[#2277EE] rounded-none h-12 px-8 relative"
        style={{
          fontFamily: "Helvetica Neue, sans-serif",
          fontWeight: 500,
          boxShadow: "inset 0 0 0 1px #FFF",
        }}
      >
        Connect Wallet
      </Button>

      {showWalletList && (
        <div className="absolute top-full right-0 mt-2 bg-[#FFF] border-2 border-black min-w-[200px] z-50">
          <div
            className="p-2 border-b-2 border-black text-sm font-medium"
            style={{ fontFamily: "Helvetica Neue, sans-serif" }}
          >
            Connect Wallet
          </div>
          {availableWallets.length > 0 ? (
            availableWallets.map((wallet) => (
              <Button
                key={wallet.adapter.name}
                onClick={() => handleWalletSelect(wallet.adapter.name)}
                className="w-full bg-[#FFF] text-black border-none hover:bg-gray-50 rounded-none h-10 text-left justify-start flex items-center gap-2"
                style={{ fontFamily: "Helvetica Neue, sans-serif" }}
              >
                {wallet.adapter.icon && (
                  <img src={wallet.adapter.icon || "/placeholder.svg"} alt={wallet.adapter.name} className="w-4 h-4" />
                )}
                {wallet.adapter.name}
              </Button>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500" style={{ fontFamily: "Helvetica Neue, sans-serif" }}>
              No wallets detected. Please install a Solana wallet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
