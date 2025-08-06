import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { DynamicClientWrapper } from "@/components/dynamic-client-wrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Stork SMS - Web3 Chat",
  description: "Decentralized messaging on Solana",
  manifest: "/manifest.json",
  metadataBase: new URL("https://dapp.stork-sms.net"),
  icons: {
    icon: "/favicon.ico", // Browser tab favicon
    shortcut: "/stork-app-icon.png", // App shortcut icon
    apple: "/stork-app-icon.png", // Apple home screen icon
  },
  openGraph: {
    title: "Stork SMS - Web3 Chat",
    description: "Decentralized messaging on Solana",
    url: "https://dapp.stork-sms.net",
    siteName: "Stork SMS",
    images: [
      {
        url: "https://dapp.stork-sms.net/stork-dapp-webpreview-twitter.jpg",
        width: 1200,
        height: 630,
        alt: "Stork SMS - Decentralized Web3 Chat",
        type: "image/jpeg",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stork SMS - Web3 Chat",
    description: "Decentralized messaging on Solana",
    images: ["https://dapp.stork-sms.net/stork-dapp-webpreview-twitter.jpg"],
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
        <DynamicClientWrapper>
          {children}
        </DynamicClientWrapper>
      </body>
    </html>
  )
}
