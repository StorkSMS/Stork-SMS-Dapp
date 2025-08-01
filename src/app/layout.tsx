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
  icons: {
    icon: "/New stork Site Favicon.png",
    shortcut: "/New stork Site Favicon.png",
    apple: "/New stork Site Favicon.png",
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
