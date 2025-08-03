import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import dynamic from "next/dynamic"
import "./globals.css"
import ServiceWorkerProvider from "@/components/ServiceWorkerProvider"
import PushNotificationManager from "@/components/PushNotificationManager"

// Dynamically import wallet and auth providers to avoid SSR issues
const WalletContextProvider = dynamic(
  () => import("@/components/wallet-provider").then(mod => ({ default: mod.WalletContextProvider })),
  { ssr: false }
)

const AuthProvider = dynamic(
  () => import("@/contexts/AuthContext").then(mod => ({ default: mod.AuthProvider })),
  { ssr: false }
)

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
        <ServiceWorkerProvider>
          <WalletContextProvider>
            <AuthProvider>
              <PushNotificationManager />
              {children}
            </AuthProvider>
          </WalletContextProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}
