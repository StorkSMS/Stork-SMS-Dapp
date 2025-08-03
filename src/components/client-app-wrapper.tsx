'use client'

import { WalletContextProvider } from "@/components/wallet-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import ServiceWorkerProvider from "@/components/ServiceWorkerProvider"
import PushNotificationManager from "@/components/PushNotificationManager"

// Client-only wrapper for all app providers
export function ClientAppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ServiceWorkerProvider>
      <WalletContextProvider>
        <AuthProvider>
          <PushNotificationManager />
          {children}
        </AuthProvider>
      </WalletContextProvider>
    </ServiceWorkerProvider>
  )
}