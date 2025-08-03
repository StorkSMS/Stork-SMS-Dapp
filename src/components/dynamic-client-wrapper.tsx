'use client'

import dynamic from "next/dynamic"

// Client component that can use dynamic imports with ssr: false
const ClientAppWrapper = dynamic(
  () => import("@/components/client-app-wrapper").then(mod => ({ default: mod.ClientAppWrapper })),
  { ssr: false }
)

export function DynamicClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientAppWrapper>
      {children}
    </ClientAppWrapper>
  )
}