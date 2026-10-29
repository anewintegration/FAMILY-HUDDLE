'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isFridgeScreen } from '@/lib/kiosk'

// After this long with nobody touching the screen, go back to the dashboard.
const IDLE_MS = 5 * 60 * 1000

// Makes the fridge iPad behave like an appliance instead of a web page:
// - pinching or double-tapping can't zoom the page into a corner
// - text can't be selected and long-presses don't pop up menus (see globals.css, html.kiosk)
// - after a few quiet minutes it returns to the dashboard, so the fridge always shows the
//   big picture and no half-finished form or filter is left sitting there
// Phones, laptops and the iPad inside Safari are untouched.
export default function KioskMode() {
  const router = useRouter()

  useEffect(() => {
    if (!isFridgeScreen()) return
    const root = document.documentElement
    root.classList.add('kiosk')

    const stopZoom = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', stopZoom)
    document.addEventListener('gesturechange', stopZoom)

    let idle: ReturnType<typeof setTimeout> | undefined

    function arm() {
      clearTimeout(idle)
      idle = setTimeout(goHome, IDLE_MS)
    }

    function goHome() {
      const active = document.activeElement
      const typing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)
      const { pathname, search } = window.location
      // Never yank the screen away from someone typing, or from the sign-in page.
      if (typing || document.visibilityState !== 'visible' || pathname.startsWith('/login')) return arm()
      if (pathname + search === '/dashboard') window.scrollTo({ top: 0, behavior: 'smooth' })
      else router.replace('/dashboard')
      arm()
    }

    const touches = ['pointerdown', 'keydown', 'touchstart'] as const
    touches.forEach((name) => window.addEventListener(name, arm, { passive: true, capture: true }))
    arm()

    return () => {
      clearTimeout(idle)
      touches.forEach((name) => window.removeEventListener(name, arm, { capture: true }))
      document.removeEventListener('gesturestart', stopZoom)
      document.removeEventListener('gesturechange', stopZoom)
      root.classList.remove('kiosk')
    }
  }, [router])

  return null
}
