// Is this the fridge iPad? That is: an iPad running Huddle from its Home Screen icon.
// A parent can also force it either way on any device by opening Huddle once with
// ?kiosk=1 (on) or ?kiosk=0 (off); the device remembers.
// Browser only. KioskMode and the alert switches both ask this, so they always agree.
export function isFridgeScreen(): boolean {
  try {
    const forced = new URLSearchParams(window.location.search).get('kiosk')
    if (forced === '1' || forced === '0') window.localStorage.setItem('huddle-kiosk', forced)
    const saved = window.localStorage.getItem('huddle-kiosk')
    if (saved === '1') return true
    if (saved === '0') return false
  } catch {
    // Storage can be blocked; detection below still works.
  }
  const nav = navigator as Navigator & { standalone?: boolean }
  // iPads announce themselves as Macs now, but a Mac has no touch screen.
  const isIpad = /iPad/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  const isHomeScreenApp = nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return isIpad && isHomeScreenApp
}
