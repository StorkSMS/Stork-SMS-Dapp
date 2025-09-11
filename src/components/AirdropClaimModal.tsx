"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Transaction } from "@solana/web3.js"

interface AirdropClaimModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
}

interface EligibilityStatus {
  isEligible: boolean
  alreadyClaimed: boolean
  eligibilitySource: string | null
  domain: string | null
  claimedAt: string | null
  claimAmount: number | null
}

const AirdropClaimModal: React.FC<AirdropClaimModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false
}) => {
  const { publicKey, connected, signTransaction } = useWallet()
  const [eligibilityStatus, setEligibilityStatus] = useState<EligibilityStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionSignature, setTransactionSignature] = useState<string | null>(null)
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null)
  const [isSigningTransaction, setIsSigningTransaction] = useState(false)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    textSecondary: isDarkMode ? '#CCC' : '#666',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    success: '#10B981',
    error: '#EF4444',
    blue: '#3B82F6' // Blue color for claim button
  }

  // Check eligibility when modal opens and wallet is connected
  useEffect(() => {
    if (isOpen && connected && publicKey) {
      checkEligibility()
    }
  }, [isOpen, connected, publicKey])

  const checkEligibility = async () => {
    if (!publicKey) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/check-airdrop-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check eligibility')
      }

      setEligibilityStatus(data)
    } catch (err) {
      console.error('Error checking eligibility:', err)
      setError(err instanceof Error ? err.message : 'Failed to check eligibility')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!publicKey || !eligibilityStatus?.isEligible || eligibilityStatus.alreadyClaimed || !connected || !signTransaction) {
      return
    }

    setIsClaiming(true)
    setError(null)

    try {
      // Step 1: Build unsigned transaction
      const buildResponse = await fetch('/api/claim-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: publicKey.toString(),
          action: 'build'
        })
      })

      const buildData = await buildResponse.json()

      if (!buildResponse.ok) {
        throw new Error(buildData.error || 'Failed to prepare transaction')
      }

      // Step 2: Sign the transaction (user signature only)
      setIsSigningTransaction(true)
      
      const transaction = Transaction.from(
        Buffer.from(buildData.unsignedTransaction, 'base64')
      )
      
      // User only needs to sign their part (partial sign)
      const signedTransaction = await signTransaction(transaction)
      setIsSigningTransaction(false)
      
      // Step 3: Submit signed transaction
      const submitResponse = await fetch('/api/claim-airdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: publicKey.toString(),
          action: 'submit',
          signedTransaction: signedTransaction.serialize().toString('base64')
        })
      })

      const submitData = await submitResponse.json()

      if (!submitResponse.ok) {
        throw new Error(submitData.error || 'Failed to submit transaction')
      }

      setTransactionSignature(submitData.transactionSignature)
      setExplorerUrl(submitData.explorerUrl)
      setClaimSuccess(true)
      
      // Refresh eligibility status to show claimed state
      await checkEligibility()
      
    } catch (err) {
      console.error('Error claiming airdrop:', err)
      setError(err instanceof Error ? err.message : 'Failed to claim airdrop')
      setIsSigningTransaction(false)
    } finally {
      setIsClaiming(false)
    }
  }

  const formatClaimAmount = (amount: number | null) => {
    if (!amount) return 'TBD'
    return (amount / 1000000).toLocaleString() // Convert from smallest unit assuming 6 decimals
  }

  const getEligibilityReason = (source: string | null, domain: string | null) => {
    if (source?.includes('promotional')) return 'Qualified during 7-day developer updates period'
    if (source?.includes('.skr') || source?.includes('Seeker device')) {
      return domain ? `Seeker device owner (${domain})` : 'Seeker device owner (.skr domain holder)'
    }
    if (source?.includes('manual') || source?.includes('bug') || source?.includes('feature')) {
      return 'Manually added (bug report or feature request)'
    }
    return 'Qualified for airdrop'
  }

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[10001] p-4"
      style={{ backgroundColor: colors.backdrop }}
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-lg border-4 rounded-sm relative"
        style={{ 
          backgroundColor: colors.bg, 
          borderColor: colors.border,
          backgroundImage: 'url(/Nft-Build-Images/Recipient\ NFT/Paper-Texture\ \(position\ bottom\ right\).png)',
          backgroundSize: 'cover',
          backgroundPosition: 'bottom right',
          backgroundRepeat: 'no-repeat',
          backgroundBlendMode: isDarkMode ? 'multiply' : 'overlay'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="relative">
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-none hover:opacity-80 z-10"
            style={{ 
              backgroundColor: "transparent",
              color: colors.text,
              border: "none",
              boxShadow: "none"
            }}
          >
            <X className="w-6 h-6" />
          </Button>
          
          <div 
            className="p-6 border-b-2"
            style={{ borderBottomColor: colors.border }}
          >
            <h1 
              className="text-2xl font-bold pr-12"
              style={{ 
                color: colors.text,
                fontFamily: "Helvetica Neue, sans-serif" 
              }}
            >
              🎯 Airdrop Claim
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!connected || !publicKey ? (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.error }} />
              <p style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}>
                Please connect your wallet to check airdrop eligibility.
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: colors.blue }} />
              <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>
                Checking eligibility...
              </p>
            </div>
          ) : error ? (
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.error }} />
              <p style={{ color: colors.error, fontFamily: "Helvetica Neue, sans-serif" }}>
                {error}
              </p>
              <Button
                onClick={checkEligibility}
                className="mt-4 bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] hover:bg-[#2277EE] rounded-none h-12 px-8 relative"
                style={{
                  fontFamily: "Helvetica Neue, sans-serif",
                  fontWeight: 500,
                  boxShadow: "inset 0 0 0 1px #FFF",
                }}
              >
                Retry
              </Button>
            </div>
          ) : eligibilityStatus ? (
            <>
              {eligibilityStatus.isEligible ? (
                <>
                  {eligibilityStatus.alreadyClaimed ? (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.success }} />
                      <h3 
                        className="text-xl font-semibold mb-2"
                        style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                      >
                        Already Claimed!
                      </h3>
                      <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>
                        You claimed your airdrop on {new Date(eligibilityStatus.claimedAt!).toLocaleDateString()}
                      </p>
                      <div 
                        className="mt-4 p-3 border rounded-sm"
                        style={{ borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9' }}
                      >
                        <p className="text-sm" style={{ color: colors.textSecondary }}>
                          <strong>Amount:</strong> {formatClaimAmount(eligibilityStatus.claimAmount)} STORK
                        </p>
                        <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                          <strong>Reason:</strong> {getEligibilityReason(eligibilityStatus.eligibilitySource, eligibilityStatus.domain)}
                        </p>
                      </div>
                    </div>
                  ) : claimSuccess ? (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.success }} />
                      <h3 
                        className="text-xl font-semibold mb-2"
                        style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                      >
                        Claim Successful!
                      </h3>
                      <p className="mb-4" style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>
                        Your airdrop has been successfully submitted to the network.
                      </p>
                      
                      {transactionSignature && (
                        <div 
                          className="p-4 border rounded-sm mb-4"
                          style={{ borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9' }}
                        >
                          <p className="text-sm mb-2" style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}>
                            <strong>Transaction Signature:</strong>
                          </p>
                          <p className="text-xs mb-3 break-all" style={{ color: colors.textSecondary, fontFamily: "monospace" }}>
                            {transactionSignature}
                          </p>
                          
                          {explorerUrl && (
                            <Button
                              onClick={() => window.open(explorerUrl, '_blank')}
                              className="w-full bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] hover:bg-[#2277EE] rounded-none h-10 px-4 relative flex items-center justify-center gap-2"
                              style={{
                                fontFamily: "Helvetica Neue, sans-serif",
                                fontWeight: 500,
                                boxShadow: "inset 0 0 0 1px #FFF",
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                              View on Solana Explorer
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🎁</span>
                      </div>
                      <h3 
                        className="text-xl font-semibold mb-2"
                        style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                      >
                        You're Eligible!
                      </h3>
                      <p className="mb-4" style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>
                        {getEligibilityReason(eligibilityStatus.eligibilitySource, eligibilityStatus.domain)}
                      </p>
                      
                      <div 
                        className="mb-6 p-3 border rounded-sm"
                        style={{ borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1A1A' : '#F9F9F9' }}
                      >
                        <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                          <strong>Claim Amount:</strong> {formatClaimAmount(1000000000)} STORK tokens
                        </p>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          <strong>Note:</strong> You will pay a small network fee (~0.000005 SOL) to claim your tokens.
                        </p>
                      </div>

                      <Button
                        onClick={handleClaim}
                        disabled={isClaiming || isSigningTransaction || !signTransaction}
                        className="w-full bg-[#3388FF] text-[#FFF] border-2 border-[#3388FF] hover:bg-[#2277EE] rounded-none h-12 px-8 relative disabled:opacity-50"
                        style={{
                          fontFamily: "Helvetica Neue, sans-serif",
                          fontWeight: 500,
                          boxShadow: "inset 0 0 0 1px #FFF",
                        }}
                      >
                        {isSigningTransaction ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sign Transaction...
                          </>
                        ) : isClaiming ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Claim Airdrop'
                        )}
                      </Button>
                      
                      {!signTransaction && (
                        <p className="mt-2 text-xs" style={{ color: colors.error, fontFamily: "Helvetica Neue, sans-serif" }}>
                          Wallet does not support transaction signing
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.error }} />
                  <h3 
                    className="text-xl font-semibold mb-2"
                    style={{ color: colors.text, fontFamily: "Helvetica Neue, sans-serif" }}
                  >
                    Not Eligible
                  </h3>
                  <p style={{ color: colors.textSecondary, fontFamily: "Helvetica Neue, sans-serif" }}>
                    Your wallet is not eligible for the airdrop. Eligibility was based on:
                  </p>
                  <ul 
                    className="mt-3 text-sm text-left list-disc list-inside"
                    style={{ color: colors.textSecondary }}
                  >
                    <li>Participation in the 7-day developer updates period (Sept 8-10, 2025)</li>
                    <li>Owning a Seeker device (.skr domain)</li>
                    <li>Being manually added for bug reports or feature requests</li>
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AirdropClaimModal