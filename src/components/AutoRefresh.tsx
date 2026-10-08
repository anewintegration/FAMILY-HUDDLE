'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Keeps a screen that stays on (like the fridge iPad) up to date: re-reads the
// page every minute, and again the moment the screen wakes up or the app comes
// back to the front.
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const timer = setInterval(refresh, seconds * 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router, seconds])

  return null
}
