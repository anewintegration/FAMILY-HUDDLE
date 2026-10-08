import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Huddle',
  description: 'Family dashboard, calendar, and tasks',
  // Lets "Add to Home Screen" on an iPhone or iPad open Huddle like an app (no browser bars).
  appleWebApp: { capable: true, title: 'Huddle', statusBarStyle: 'black' },
}

export const viewport: Viewport = {
  themeColor: '#0A2540',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
