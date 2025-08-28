"use client"

import React from "react"

export type PaymentMethod = 'SOL' | 'STORK'

interface PaymentToggleProps {
  selectedPaymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void
  isDarkMode: boolean
}

const PaymentToggle: React.FC<PaymentToggleProps> = ({
  selectedPaymentMethod,
  onPaymentMethodChange,
  isDarkMode
}) => {
  const colors = {
    text: isDarkMode ? '#FFF' : '#000',
    accent: '#3388FF'
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <span style={{ color: colors.text }} className="text-sm">
          Pay with Stork $SMS {selectedPaymentMethod === 'STORK' && '🔥'}
        </span>
        {selectedPaymentMethod === 'STORK' && (
          <span style={{ color: colors.accent }} className="text-xs">
            (20% off!)
          </span>
        )}
      </div>
      <div className="relative" style={{ width: '44px', height: '24px', overflow: 'visible' }}>
        <button
          type="button"
          onClick={() => onPaymentMethodChange(selectedPaymentMethod === 'STORK' ? 'SOL' : 'STORK')}
          className="absolute inset-0 rounded-full transition-all duration-300 ease-in-out"
          style={{ 
            backgroundColor: selectedPaymentMethod === 'STORK' ? colors.accent : '#ccc'
          }}
        >
          <span
            className="absolute h-4 w-4 bg-white transition-all duration-300 ease-in-out"
            style={{
              left: selectedPaymentMethod === 'STORK' ? '24px' : '2px',
              top: '4px',
              borderRadius: '0px'
            }}
          />
        </button>
      </div>
    </div>
  )
}

export default PaymentToggle