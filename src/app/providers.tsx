'use client'

import { SessionProvider } from 'next-auth/react'
import KioskMode from '@/components/KioskMode'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <KioskMode />
      <ServiceWorkerRegister />
      {children}
    </SessionProvider>
  )
}
