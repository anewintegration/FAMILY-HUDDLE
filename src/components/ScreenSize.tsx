'use client'

import { useEffect, useState } from 'react'
import { ZOOM_KEY } from '@/lib/zoom'

// Only appears on a screen that has been shrunk or enlarged with ?zoom= (see lib/zoom.ts): it says so, and
// gives a way back without having to know the address trick. On every other screen it draws nothing.
export default function ScreenSize() {
  const [percent, setPercent] = useState(0)

  useEffect(() => {
    const zoom = parseFloat(document.documentElement.style.getPropertyValue('--zoom'))
    setPercent(zoom > 0 && zoom !== 1 ? Math.round(zoom * 100) : 0)
  }, [])

  if (!percent) return null

  function backToNormal() {
    try {
      window.localStorage.removeItem(ZOOM_KEY)
    } catch {
      // Storage can be blocked; the size below is still put back for this visit.
    }
    const root = document.documentElement
    root.style.removeProperty('zoom')
    root.style.removeProperty('--zoom')
    root.style.removeProperty('--view-h')
    setPercent(0)
  }

  return (
    <section className="card p-4 mb-3 flex flex-col gap-3" aria-labelledby="size-title">
      <div>
        <p id="size-title" className="font-display text-[14px] font-semibold text-charcoal">
          Size on this screen
        </p>
        <p className="text-xs text-charcoal-muted mt-1">
          Huddle is showing at {percent}% on this screen. Other phones and computers are not affected.
        </p>
      </div>
      <button
        type="button"
        onClick={backToNormal}
        className="tap self-start rounded-full px-5 py-2 text-sm font-semibold bg-white border border-cream-border text-charcoal"
      >
        Back to normal size
      </button>
    </section>
  )
}
