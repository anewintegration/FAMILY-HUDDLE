import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'
import { ZOOM_BOOT } from '@/lib/zoom'

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
    // suppressHydrationWarning: the size script below may add a style to <html> before the page wakes up.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies this screen's saved size (?zoom=70, see lib/zoom.ts) before anything is drawn. */}
        <script dangerouslySetInnerHTML={{ __html: ZOOM_BOOT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
