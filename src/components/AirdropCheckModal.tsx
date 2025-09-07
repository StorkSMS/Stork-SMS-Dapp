"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plane, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { checkAirdropEligibility, AirdropEligibilityResult } from "@/lib/airdrop-service"
import { validateDomainFormat } from "@/lib/domain-resolver"

interface AirdropCheckModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode?: boolean
}

const AirdropCheckModal: React.FC<AirdropCheckModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = false
}) => {
  const [input, setInput] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<AirdropEligibilityResult | null>(null)
  const [hasChecked, setHasChecked] = useState(false)

  const colors = {
    bg: isDarkMode ? '#0E0E0E' : '#FFF',
    text: isDarkMode ? '#FFF' : '#000',
    border: isDarkMode ? '#FFF' : '#000',
    bgSecondary: isDarkMode ? '#1A1A1A' : '#F9F9F9',
    textSecondary: isDarkMode ? '#CCC' : '#666',
    success: '#10B981',
    error: '#EF4444'
  }

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    // Clear previous results when input changes
    if (hasChecked) {
      setResult(null)
      setHasChecked(false)
    }
  }

  const handleCheck = async () => {
    if (!input.trim()) return

    setIsChecking(true)
    setResult(null)
    setHasChecked(false)

    try {
      const eligibilityResult = await checkAirdropEligibility(input.trim())
      setResult(eligibilityResult)
      setHasChecked(true)
    } catch (error) {
      console.error('Error checking airdrop eligibility:', error)
      setResult({
        isEligible: false,
        address: input.trim(),
        error: 'Failed to check eligibility. Please try again.'
      })
      setHasChecked(true)
    } finally {
      setIsChecking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isChecking && input.trim()) {
      handleCheck()
    }
  }

  const isDomainInput = validateDomainFormat(input).isDomain

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-[9999] p-4 pt-16 sm:pt-4 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div 
        className="w-full max-w-md border-4 rounded-sm relative max-h-[90vh] overflow-y-auto my-auto"
        style={{ 
          backgroundColor: colors.bg, 
          borderColor: colors.border 
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b-2"
          style={{ borderBottomColor: colors.border }}
        >
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5" style={{ color: colors.text }} />
            <h2 
              className="text-lg font-semibold"
              style={{ 
                color: colors.text,
                fontFamily: "Helvetica Neue, sans-serif" 
              }}
            >
              Airdrop Check
            </h2>
          </div>
          <Button
            onClick={onClose}
            className="p-1 rounded-none hover:opacity-80"
            style={{ 
              backgroundColor: "transparent",
              color: colors.text,
              border: "none",
              boxShadow: "none"
            }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="space-y-2">
            <p 
              className="text-sm"
              style={{ 
                color: colors.textSecondary,
                fontFamily: "Helvetica Neue, sans-serif" 
              }}
            >
              Enter a wallet address or .skr/.sol domain to check airdrop eligibility:
            </p>
          </div>

          {/* Input Field */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter wallet address or domain (e.g., example.sol, example.skr)"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isChecking}
              className="w-full rounded-none border-2 px-3 py-2"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                borderColor: colors.border,
                fontFamily: "Helvetica Neue, sans-serif"
              }}
            />
            
            {/* Input Type Indicator */}
            {input.trim() && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: isDomainInput ? '#3B82F6' : colors.textSecondary 
                  }}
                />
                <span 
                  className="text-xs"
                  style={{ 
                    color: colors.textSecondary,
                    fontFamily: "Helvetica Neue, sans-serif" 
                  }}
                >
                  {isDomainInput ? 'Domain format detected' : 'Wallet address format'}
                </span>
              </div>
            )}
          </div>

          {/* Check Button */}
          <Button
            onClick={handleCheck}
            disabled={!input.trim() || isChecking}
            className="w-full rounded-none hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ 
              fontFamily: "Helvetica Neue, sans-serif", 
              fontWeight: 500,
              backgroundColor: colors.bg,
              color: colors.text,
              border: `2px solid ${colors.border}`,
              height: '42px'
            }}
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Plane className="w-4 h-4" />
                Check Eligibility
              </>
            )}
          </Button>

          {/* Results */}
          {hasChecked && result && (
            <div 
              className="p-3 border-2 rounded-sm"
              style={{ 
                borderColor: result.isEligible ? colors.success : colors.error,
                backgroundColor: result.isEligible 
                  ? `${colors.success}15` 
                  : `${colors.error}15`
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {result.isEligible ? (
                    <CheckCircle 
                      className="w-5 h-5" 
                      style={{ color: colors.success }} 
                    />
                  ) : (
                    <XCircle 
                      className="w-5 h-5" 
                      style={{ color: colors.error }} 
                    />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p 
                    className="font-medium"
                    style={{ 
                      color: result.isEligible ? colors.success : colors.error,
                      fontFamily: "Helvetica Neue, sans-serif" 
                    }}
                  >
                    {result.isEligible ? 'Eligible for Airdrop!' : 'Not Eligible'}
                  </p>
                  
                  {/* Address/Domain Display */}
                  {result.domain ? (
                    <div className="space-y-1">
                      <p 
                        className="text-sm"
                        style={{ 
                          color: colors.text,
                          fontFamily: "Helvetica Neue, sans-serif" 
                        }}
                      >
                        Domain: <span className="font-medium">{result.domain}</span>
                      </p>
                      <p 
                        className="text-xs break-all"
                        style={{ 
                          color: colors.textSecondary,
                          fontFamily: "Helvetica Neue, sans-serif" 
                        }}
                      >
                        Resolves to: {result.address.length > 20 
                          ? `${result.address.slice(0, 8)}...${result.address.slice(-8)}`
                          : result.address
                        }
                      </p>
                    </div>
                  ) : (
                    <p 
                      className="text-xs break-all"
                      style={{ 
                        color: colors.textSecondary,
                        fontFamily: "Helvetica Neue, sans-serif" 
                      }}
                    >
                      Address: {result.address.length > 20 
                        ? `${result.address.slice(0, 8)}...${result.address.slice(-8)}`
                        : result.address
                      }
                    </p>
                  )}

                  {/* Reason */}
                  {result.reason && (
                    <p 
                      className="text-sm"
                      style={{ 
                        color: colors.textSecondary,
                        fontFamily: "Helvetica Neue, sans-serif" 
                      }}
                    >
                      {result.reason}
                    </p>
                  )}

                  {/* Error */}
                  {result.error && (
                    <p 
                      className="text-sm"
                      style={{ 
                        color: colors.error,
                        fontFamily: "Helvetica Neue, sans-serif" 
                      }}
                    >
                      {result.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-4 border-t-2"
          style={{ borderTopColor: colors.border }}
        >
          <p 
            className="text-xs text-center"
            style={{ 
              color: colors.textSecondary,
              fontFamily: "Helvetica Neue, sans-serif" 
            }}
          >
            Eligible wallets: Seeker device owners (.skr domains), successful report-a-bug and request-a-feature wallets, and 7-Day Developer Updates Campaign participants
          </p>
        </div>
      </div>
    </div>
  )
}

export default AirdropCheckModal