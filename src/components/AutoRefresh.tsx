'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

// How long to wait for the server before calling it out of reach, and how soon to look again.
const ASK_TIMEOUT_MS = 8000
const RETRY_MS = 10_000

// Is the server answering? Anything below 500 counts (even a redirect to the sign-in page).
// A dropped connection, no answer at all, or a 5xx from the host while it restarts does not.
async function serverIsUp(): Promise<boolean> {
  const controller = new AbortController()
  const giveUp = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS)
  try {
    const res = await fetch('/api/health', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
    return res.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(giveUp)
  }
}

// Keeps a screen that stays on (like the fridge iPad) up to date: re-reads the page every
// minute, and again the moment the screen wakes up, the app comes back to the front, or the
// Wi-Fi returns.
//
// It asks the server whether it is there first. If a refresh fails, Next.js falls back to
// loading the whole page again, which would leave a dead error page on a screen nobody can
// reload. While the server is out of reach it shows a small note and keeps trying.
export default function AutoRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter()
  const [reconnecting, setReconnecting] = useState(false)
  const asking = useRef(false)

  useEffect(() => {
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined

    const refresh = async () => {
      if (document.visibilityState !== 'visible' || asking.current) return
      asking.current = true
      clearTimeout(retry)
      const up = await serverIsUp()
      asking.current = false
      if (!alive) return
      setReconnecting(!up)
      if (up) router.refresh()
      else retry = setTimeout(refresh, RETRY_MS)
    }

    const timer = setInterval(refresh, seconds * 1000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      alive = false
      clearInterval(timer)
      clearTimeout(retry)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [router, seconds])

  if (!reconnecting) return null
  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg"
      style={{ background: 'rgba(27,35,64,0.94)' }}
    >
      Reconnecting… this screen will update by itself
    </div>
  )
}
