// Huddle's background helper. It does two things and keeps no other copies of anything, so it
// can never show stale data:
//
// 1. Safety net for a screen that never gets switched off (the fridge iPad): if loading a page
//    fails because the Wi-Fi or the server is down, it shows the friendly "Reconnecting" page
//    (offline.html), which brings Huddle back on its own.
// 2. Alerts: when the server sends a push message (see src/lib/push.ts) it shows it as a
//    notification, and tapping the notification opens Huddle at the right place.
const CACHE = 'huddle-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  // Only whole-page loads. Data requests and files are left alone.
  if (request.mode !== 'navigate') return
  event.respondWith(
    fetch(request)
      .then((response) => (response.status === 502 || response.status === 503 || response.status === 504 ? offlinePage(response) : response))
      .catch(() => offlinePage(null))
  )
})

// The saved "Reconnecting" page; if it somehow is not there, whatever the server said.
function offlinePage(fallback) {
  return caches.match(OFFLINE_URL).then((saved) => saved || fallback || Response.error())
}

// ---------------------------------------------------------------- alerts

// Every push message must end up as a visible notification (iPhones and iPads switch alerts off
// for sites that stay silent), so this always shows something, even if the message is garbled.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = {}
  }
  if (!data || typeof data !== 'object') data = {}

  const title = typeof data.title === 'string' && data.title ? data.title : 'Huddle'
  const options = {
    body: typeof data.body === 'string' ? data.body : 'Something new in Huddle.',
    icon: '/icon.png',
    data: { url: safePath(data.url) },
  }
  // A newer alert about the same thing replaces the older one - and still makes a sound.
  if (typeof data.tag === 'string' && data.tag) {
    options.tag = data.tag
    options.renotify = true
  }

  event.waitUntil(self.registration.showNotification(title, options).then(updateBadge))
})

// Tapping an alert: bring Huddle forward (or open it) at the page the alert is about.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(safePath(event.notification.data && event.notification.data.url), self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
        if (!open) return self.clients.openWindow(target)
        return open
          .focus()
          .then((focused) => ((focused || open).navigate ? (focused || open).navigate(target) : null))
          .catch(() => self.clients.openWindow(target))
      })
      .catch(() => null)
      .then(updateBadge)
  )
})

// Swiped away: the number on the app icon should go down.
self.addEventListener('notificationclose', (event) => {
  event.waitUntil(updateBadge())
})

// Only ever a page on this site - never another address.
function safePath(value) {
  return typeof value === 'string' && value.charAt(0) === '/' && value.charAt(1) !== '/' && value.charAt(1) !== '\\' ? value : '/dashboard'
}

// The little number on the Home Screen / taskbar icon = alerts still waiting to be read.
function updateBadge() {
  return self.registration
    .getNotifications()
    .then((list) => {
      const nav = self.navigator
      if (list.length > 0) return nav.setAppBadge ? nav.setAppBadge(list.length) : null
      return nav.clearAppBadge ? nav.clearAppBadge() : null
    })
    .catch(() => null)
}
