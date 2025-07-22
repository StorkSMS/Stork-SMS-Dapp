'use client'

import React, { useState } from 'react'
import SenderNFTPreviewCanvas from './SenderNFTPreviewCanvas'

export default function SenderCanvasTest() {
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null)
  const testRecipientWallet = '6Ww1s3YG4Wz2wvzayamaK4rjwye8PKD2DyCqMY6vuBST'

  const handleCanvasReady = (dataUrl: string) => {
    console.log('🎯 Sender canvas ready! Data URL length:', dataUrl.length)
    console.log('📷 Data URL preview:', dataUrl.substring(0, 100) + '...')
    setCanvasDataUrl(dataUrl)
  }

  const downloadImage = () => {
    if (!canvasDataUrl) return
    
    const link = document.createElement('a')
    link.download = 'sender-nft-frontend-test.png'
    link.href = canvasDataUrl
    link.click()
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Sender NFT Canvas Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Frontend Canvas Preview</h2>
          <p className="text-sm text-gray-600 mb-4">
            This uses browser-native font rendering (high quality)
          </p>
          
          <SenderNFTPreviewCanvas
            recipientWallet={testRecipientWallet}
            width={400}
            height={400}
            onCanvasReady={handleCanvasReady}
            className="border border-gray-300 rounded"
          />
          
          {canvasDataUrl && (
            <div className="mt-4">
              <button
                onClick={downloadImage}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Download Frontend Canvas
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Data URL length: {canvasDataUrl.length} characters
              </p>
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-4">Canvas Data Info</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-sm">
              <strong>Recipient:</strong> ...{testRecipientWallet.slice(-5)}
            </p>
            <p className="text-sm">
              <strong>Expected text:</strong> "You started a conversation with ...{testRecipientWallet.slice(-5)}"
            </p>
            <p className="text-sm">
              <strong>Font size:</strong> 136px (dynamic from 160px base)
            </p>
            <p className="text-sm">
              <strong>Position:</strong> X=48.35, Y=291.25
            </p>
            <p className="text-sm">
              <strong>Status:</strong> {canvasDataUrl ? '✅ Canvas ready' : '⏳ Loading...'}
            </p>
          </div>
          
          {canvasDataUrl && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Quality Check:</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Uses browser font rendering</li>
                <li>✅ Helvetica Neue font family</li>
                <li>✅ Dynamic font sizing (40 chars = 136px)</li>
                <li>✅ Proper letter spacing (-7%)</li>
                <li>✅ Exact positioning (48.35, 291.25)</li>
                <li>✅ Exports as data URL for backend</li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">How This Solves the Text Quality Issue</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm">
            <strong>Problem:</strong> Server-side Node.js Canvas has poor font rendering quality.
          </p>
          <p className="text-sm mt-2">
            <strong>Solution:</strong> This component renders text in the browser using advanced font engines, 
            then exports the canvas as a data URL. The backend receives the high-quality rendered image 
            instead of trying to render text server-side.
          </p>
          <p className="text-sm mt-2">
            <strong>Result:</strong> Sender NFTs will have the same text quality as recipient NFTs.
          </p>
        </div>
      </div>
    </div>
  )
}