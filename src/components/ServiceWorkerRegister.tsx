'use client'

import { useEffect } from 'react'
import { clearAlertBadge } from '@/lib/pushClient'

// Turns on the small background helper in public/sw.js (it explains itself there): if a page
// can't load because the Wi-Fi or server is down, the screen shows "Reconnecting" instead of
// a dead error page and comes back on its own - and it is what shows Huddle alerts.
// Opening Huddle (or coming back to it) also clears the number on its icon.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not fatal: without it Huddle simply behaves as it always did.
    })

    clearAlertBadge()
    const cameBack = () => {
      if (document.visibilityState === 'visible') clearAlertBadge()
    }
    document.addEventListener('visibilitychange', cameBack)
    return () => document.removeEventListener('visibilitychange', cameBack)
  }, [])

  return null
}
