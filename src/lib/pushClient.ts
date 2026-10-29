// The phone / computer side of Huddle alerts: turn them on or off for this device, keep the
// sign-up fresh, and clear the little number on the icon. Browser only.
// Nothing in here ever throws into the page: a problem becomes a plain sentence or is ignored.

import { api } from '@/lib/api-client'
import { isFridgeScreen } from '@/lib/kiosk'

export type AlertState =
  | { kind: 'loading' }
  | { kind: 'kiosk' } // the fridge screen: it shows the day, it does not buzz
  | { kind: 'needs-home-screen' } // iPhone / iPad: alerts only work from the Home Screen icon
  | { kind: 'unsupported' }
  | { kind: 'denied' } // the person (or the phone) said no to notifications
  | { kind: 'off' }
  | { kind: 'on' }

export type Outcome = { ok: true } | { ok: false; error: string }

export type AlertKind = 'alertChanges' | 'alertDone' | 'alertBoard' | 'alertReminders'

// What this device remembers: whose alerts it is set up for, and when it last checked in with the server.
const FLAG_KEY = 'huddle-alerts'
const DISMISSED_KEY = 'huddle-alerts-dismissed'
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000
const CHECK_IN_EVERY_MS = 12 * 60 * 60 * 1000

type Flag = { user: string; on: boolean; synced?: number }

function readFlag(): Flag | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(FLAG_KEY) || 'null')
    return value && typeof value.user === 'string' && typeof value.on === 'boolean' ? value : null
  } catch {
    return null
  }
}

function writeFlag(flag: Flag): void {
  try {
    window.localStorage.setItem(FLAG_KEY, JSON.stringify(flag))
  } catch {
    // Storage can be blocked; alerts still work, the screen just forgets sooner.
  }
}

/** Was the "turn on alerts" banner put away recently? */
export function alertsPromptDismissed(): boolean {
  try {
    const when = Number(window.localStorage.getItem(DISMISSED_KEY))
    return when > 0 && Date.now() - when < DISMISS_FOR_MS
  } catch {
    return false
  }
}

export function dismissAlertsPrompt(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(Date.now()))
  } catch {
    // Not fatal: the banner just comes back next time.
  }
}

// ---------------------------------------------------------------- helpers

/** The result of `work`, or null if it fails or takes longer than `ms`. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms)
    work.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      }
    )
  })
}

// The background helper (public/sw.js) is what receives alerts. It is switched on by
// ServiceWorkerRegister on every page; this just waits for it.
async function helper(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return withTimeout(navigator.serviceWorker.ready, 5000)
}

function onIphoneOrIpad(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function runsFromHomeScreen(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function canReceiveAlerts(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// The server's key arrives as URL-safe base64 text; the browser wants it as bytes.
function keyBytes(text: string) {
  const padded = (text + '='.repeat((4 - (text.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function usesKey(sub: PushSubscription, key: Uint8Array): boolean {
  const current = sub.options && sub.options.applicationServerKey
  if (!current) return true // the browser does not say; assume it is right
  const have = new Uint8Array(current)
  return have.length === key.length && have.every((byte, i) => byte === key[i])
}

type Signup = { endpoint: string; keys: { p256dh: string; auth: string } }

/** Signs this device up with the browser's alert service (or reuses its existing sign-up) and tells Huddle's server. */
async function signUp(): Promise<Outcome> {
  const keyRes = await api('GET', '/api/push')
  if (!keyRes.ok) return { ok: false, error: keyRes.error }
  const reg = await helper()
  if (!reg) return { ok: false, error: 'Huddle could not start its helper in this browser. Reload the page and try again.' }

  const key = keyBytes(String(keyRes.data.publicKey))
  let sub = await reg.pushManager.getSubscription()
  // Signed up against a different server key (the database was reset): start over.
  if (sub && !usesKey(sub, key)) {
    await sub.unsubscribe().catch(() => false)
    sub = null
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })

  const json = sub.toJSON()
  if (!json.endpoint || !json.keys || !json.keys.p256dh || !json.keys.auth) {
    return { ok: false, error: 'This browser could not set up alerts.' }
  }
  const signup: Signup = { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }
  const res = await api('POST', '/api/push', signup)
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}

// ---------------------------------------------------------------- what the screens use

/** What can this device do about alerts right now? */
export async function readAlertState(userId: string): Promise<AlertState> {
  try {
    if (isFridgeScreen()) return { kind: 'kiosk' }
    // In a Safari tab an iPhone or iPad cannot receive alerts at all; the Home Screen icon can.
    if (onIphoneOrIpad() && !runsFromHomeScreen()) return { kind: 'needs-home-screen' }
    if (!canReceiveAlerts()) return { kind: 'unsupported' }
    if (Notification.permission === 'denied') return { kind: 'denied' }
    if (Notification.permission === 'granted') {
      const flag = readFlag()
      if (flag && flag.on && flag.user === userId) {
        const reg = await helper()
        const sub = reg ? await reg.pushManager.getSubscription() : null
        if (sub) return { kind: 'on' }
      }
    }
    return { kind: 'off' }
  } catch {
    return { kind: 'unsupported' }
  }
}

/**
 * Turn alerts on for this device. Call it straight from a tap: iPhones only show the "Allow
 * notifications?" question when it is asked as the first thing a tap does.
 */
export async function turnOn(userId: string): Promise<Outcome> {
  try {
    const answer = await Notification.requestPermission()
    if (answer === 'denied') {
      return { ok: false, error: 'Alerts are blocked for Huddle on this device. Allow them in the notification settings, then try again.' }
    }
    if (answer !== 'granted') return { ok: false, error: 'Alerts were not turned on. Tap the button again and choose Allow.' }

    const result = await signUp()
    if (result.ok) writeFlag({ user: userId, on: true, synced: Date.now() })
    return result
  } catch {
    return { ok: false, error: 'This device could not turn on alerts. Check the internet connection and try again.' }
  }
}

/** Turn alerts off for this device (other devices keep theirs). */
export async function turnOff(userId: string): Promise<Outcome> {
  try {
    const reg = await helper()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      const res = await api('DELETE', '/api/push', { endpoint: sub.endpoint })
      if (!res.ok) return { ok: false, error: res.error }
      await sub.unsubscribe().catch(() => false)
    }
    writeFlag({ user: userId, on: false })
    clearAlertBadge()
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not turn alerts off. Check the internet connection and try again.' }
  }
}

/**
 * Quietly keeps a device that has alerts on in working order: if the browser or the server lost
 * track of it, it signs up again. At most twice a day, and never asks the person anything.
 */
export async function syncSubscription(userId: string): Promise<void> {
  try {
    const flag = readFlag()
    if (!flag || !flag.on || flag.user !== userId) return
    if (!canReceiveAlerts() || Notification.permission !== 'granted') return
    if (flag.synced && Date.now() - flag.synced < CHECK_IN_EVERY_MS) return
    const result = await signUp()
    if (result.ok) writeFlag({ user: userId, on: true, synced: Date.now() })
  } catch {
    // Quiet by design; it tries again next time.
  }
}

/**
 * Called when someone signs out: this device stops getting that person's alerts, so whoever
 * signs in next here is not shown them. Best effort and quick - signing out never waits long.
 * (The device remembers that alerts were on, so signing back in as the same person restores them.)
 */
export async function forgetThisDevice(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await withTimeout(navigator.serviceWorker.ready, 1500)
    const sub = reg ? await withTimeout(reg.pushManager.getSubscription(), 1500) : null
    if (sub) await withTimeout(api('DELETE', '/api/push', { endpoint: sub.endpoint }), 3000)
    const flag = readFlag()
    if (flag) writeFlag({ ...flag, synced: 0 })
    clearAlertBadge()
  } catch {
    // Signing out must always work.
  }
}

/** Opening Huddle clears the number on its icon and the alerts waiting in the tray. */
export function clearAlertBadge(): void {
  try {
    const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> }
    if (nav.clearAppBadge) nav.clearAppBadge().catch(() => {})
    if (!('serviceWorker' in navigator)) return
    helper()
      .then((reg) => (reg ? reg.getNotifications() : []))
      .then((shown) => shown.forEach((n) => n.close()))
      .catch(() => {})
  } catch {
    // Not important enough to disturb the page.
  }
}

/** Sends a test alert to the signed-in person's devices. */
export async function sendTest(): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const res = await api('POST', '/api/push/test')
  return res.ok ? { ok: true, sent: Number(res.data.sent) || 0 } : { ok: false, error: res.error }
}

/** Saves one of the "which alerts do I want" switches. */
export async function savePref(kind: AlertKind, value: boolean): Promise<Outcome> {
  const res = await api('PATCH', '/api/push/prefs', { [kind]: value })
  return res.ok ? { ok: true } : { ok: false, error: res.error }
}
