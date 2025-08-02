import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { WalletContextProvider } from "@/components/wallet-provider"
import { AuthProvider } from "@/contexts/AuthContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stork SMS - Web3 Chat",
  description: "Decentralized messaging on Solana",
  manifest: "/manifest.json",
  metadataBase: new URL("https://dapp.stork-sms.net"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/New stork Site Favicon.png",
    apple: "/Stork Site Phone App icon.png", // Use the phone app icon for Apple home screen
  },
  openGraph: {
    title: "Stork SMS - Web3 Chat",
    description: "Decentralized messaging on Solana",
    url: "https://dapp.stork-sms.net",
    siteName: "Stork SMS",
    images: [
      {
        url: "https://dapp.stork-sms.net/stork-dapp-webpreview.png",
        width: 1200,
        height: 630,
        alt: "Stork SMS - Decentralized Web3 Chat",
        type: "image/png",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stork SMS - Web3 Chat",
    description: "Decentralized messaging on Solana",
    images: ["https://dapp.stork-sms.net/stork-dapp-webpreview.png"],
    creator: "@StorkSMS",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  )
}
