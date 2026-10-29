// Sends alerts to the family's phones and computers using Web Push - the standard that
// iPhones (from the Home Screen icon), Androids, Windows PCs and Macs all understand.
//
// Rule for everything in here: it never throws. An alert that cannot be sent must never
// break the save (a new task, a whiteboard post...) that caused it.

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

export type PushPayload = {
  title: string
  body: string
  /** Where tapping the alert goes: a path on this site, such as "/dashboard". */
  url?: string
  /** A newer alert with the same tag replaces the older one on the screen. */
  tag?: string
}

type VapidKeys = { publicKey: string; privateKey: string }

const VAPID_SETTING = 'vapid'
let vapid: Promise<VapidKeys> | null = null

// The "subject" tells the push services who is sending. The site's address is plenty (and keeps
// anyone's e-mail address out of it).
function siteAddress(): string {
  const fallback = 'https://family-huddle.onrender.com'
  try {
    const url = new URL(process.env.NEXTAUTH_URL || fallback)
    return url.protocol === 'https:' ? url.origin : fallback
  } catch {
    return fallback
  }
}

// A usable pair: the public half is 65 bytes and the private half 32 once decoded, which is what the
// push library insists on.
function isUsablePair(keys: { publicKey?: unknown; privateKey?: unknown } | null | undefined): keys is VapidKeys {
  return (
    !!keys &&
    typeof keys.publicKey === 'string' &&
    typeof keys.privateKey === 'string' &&
    Buffer.from(keys.publicKey, 'base64url').length === 65 &&
    Buffer.from(keys.privateKey, 'base64url').length === 32
  )
}

// Node now and then hands back a key one byte short; the library pads it, but if a copy ever did not, a
// bad pair must never be saved (it would break alerts for good). So check, and simply make another.
function makeKeys(): VapidKeys {
  for (let attempt = 0; attempt < 10; attempt++) {
    const keys = webpush.generateVAPIDKeys()
    if (isUsablePair(keys)) return { publicKey: keys.publicKey, privateKey: keys.privateKey }
  }
  throw new Error('could not make a usable alert key pair')
}

async function readSavedKeys(): Promise<VapidKeys | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: VAPID_SETTING } })
  if (!row) return null
  try {
    const saved = JSON.parse(row.value)
    if (isUsablePair(saved)) return { publicKey: saved.publicKey, privateKey: saved.privateKey }
  } catch {
    // Unreadable: treated as "none saved".
  }
  return null
}

async function loadKeys(): Promise<VapidKeys> {
  let keys = await readSavedKeys()
  if (!keys) {
    const fresh = makeKeys()
    // If two servers start at the very same moment, the first to save wins and both use that pair.
    await prisma.appSetting.createMany({ data: [{ key: VAPID_SETTING, value: JSON.stringify(fresh) }], skipDuplicates: true })
    keys = (await readSavedKeys()) ?? fresh
  }
  webpush.setVapidDetails(siteAddress(), keys.publicKey, keys.privateKey)
  return keys
}

/**
 * The server's push key pair. It is made the first time it is needed and kept in the database,
 * so there is nothing to set up by hand. (Devices subscribe to this pair; the public half is
 * what the browser needs, the private half never leaves the server.)
 */
export function getVapid(): Promise<VapidKeys> {
  if (!vapid) {
    vapid = loadKeys().catch((e) => {
      vapid = null
      throw e
    })
  }
  return vapid
}

// What a push service answers when the device has removed Huddle or its permission.
const GONE = new Set([404, 410])

/**
 * Sends one alert to every device a person has. Returns how many devices took it.
 * Devices that say they are gone are forgotten.
 */
export async function sendToUser(userId: string, payload: PushPayload, opts: { ttl?: number } = {}): Promise<number> {
  try {
    const devices = await prisma.pushSubscription.findMany({ where: { userId } })
    if (devices.length === 0) return 0
    await getVapid()
    // Whole seconds, never negative: the push library refuses anything else.
    const ttl = Math.max(0, Math.floor(opts.ttl ?? 6 * 60 * 60))
    const message = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/dashboard', tag: payload.tag })
    let delivered = 0
    await Promise.all(
      devices.map(async (device) => {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            message,
            { TTL: ttl, urgency: 'high', timeout: 10_000 }
          )
          delivered++
        } catch (e) {
          const status = (e as { statusCode?: number } | null)?.statusCode
          if (status !== undefined && GONE.has(status)) {
            await prisma.pushSubscription.deleteMany({ where: { id: device.id } }).catch(() => {})
          } else {
            console.warn(`alerts: a device did not take an alert (${status ?? (e instanceof Error ? e.message : 'unknown error')})`)
          }
        }
      })
    )
    return delivered
  } catch (e) {
    console.warn('alerts: could not send:', e instanceof Error ? e.message : e)
    return 0
  }
}

// The push services of the browsers people use: Chrome, Edge, Brave, Opera, Samsung (Google's),
// Safari on iPhone / iPad / Mac (Apple's), Firefox (Mozilla's) and Windows' own.
const PUSH_HOSTS = ['fcm.googleapis.com', 'push.apple.com', 'push.services.mozilla.com', 'notify.windows.com']

/**
 * A device's push address is only accepted if it really is one of those services, so nobody
 * can make the server send requests to some other address.
 */
export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    const host = url.hostname.toLowerCase()
    return PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed))
  } catch {
    return false
  }
}

/**
 * One of a device's two keys: URL-safe base64 text that is exactly `bytes` bytes once decoded
 * (a device's public key is always 65 bytes, its secret always 16), or null. A sign-up with
 * anything else could never be sent to, so it is refused at the door.
 */
export function cleanKey(value: unknown, bytes: number): string | null {
  if (typeof value !== 'string' || value.length > 200 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  return Buffer.from(value, 'base64url').length === bytes ? value : null
}
