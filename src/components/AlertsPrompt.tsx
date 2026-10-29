'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { alertsPromptDismissed, dismissAlertsPrompt, readAlertState, syncSubscription, turnOn } from '@/lib/pushClient'
import type { AlertState } from '@/lib/pushClient'

const buttonClass = 'tap rounded-full px-4 py-1.5 text-sm font-semibold disabled:opacity-60'

// The one-time invitation on the dashboard: "get alerts on this device". It goes away for good once
// alerts are on, stays away for two weeks after "Not now", and never appears on the fridge screen,
// in a browser that cannot do alerts, or after alerts were blocked.
// A device that already has alerts on is quietly kept in working order here too.
export default function AlertsPrompt({ userId }: { userId: string }) {
  const [state, setState] = useState<AlertState>({ kind: 'loading' })
  const [dismissed, setDismissed] = useState(true) // hidden until we know
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [justTurnedOn, setJustTurnedOn] = useState(false)

  useEffect(() => {
    let alive = true
    readAlertState(userId).then((found) => {
      if (!alive) return
      setState(found)
      setDismissed(alertsPromptDismissed())
      if (found.kind === 'on') void syncSubscription(userId)
    })
    return () => {
      alive = false
    }
  }, [userId])

  useEffect(() => {
    if (!justTurnedOn) return
    const timer = setTimeout(() => setJustTurnedOn(false), 8000)
    return () => clearTimeout(timer)
  }, [justTurnedOn])

  async function enable() {
    if (busy) return
    setBusy(true)
    setError('')
    // Straight from the tap: iPhones only show the "Allow notifications?" question this way.
    const result = await turnOn(userId)
    setBusy(false)
    if (result.ok) {
      setState({ kind: 'on' })
      setJustTurnedOn(true)
    } else {
      setError(result.error)
      setState(await readAlertState(userId))
    }
  }

  function notNow() {
    dismissAlertsPrompt()
    setDismissed(true)
    setError('')
  }

  if (justTurnedOn) {
    return (
      <div className="px-2 pt-2">
        <p role="status" className="card px-4 py-3 text-sm font-semibold text-sage-dark">
          Alerts are on for this device. Choose which ones you want under My account.
        </p>
      </div>
    )
  }

  const invite = state.kind === 'off' || state.kind === 'needs-home-screen' || (state.kind === 'denied' && !!error)
  if (!invite || (dismissed && !error)) return null

  return (
    <div className="px-2 pt-2">
      <section className="card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Alerts">
        <div className="flex-1 min-w-[220px]">
          <p className="font-display text-[13px] font-semibold text-charcoal">
            {state.kind === 'needs-home-screen' ? 'Want alerts on this iPhone or iPad?' : 'Get Huddle alerts on this device'}
          </p>
          <p className="text-xs text-charcoal-muted">
            {state.kind === 'needs-home-screen'
              ? 'Add Huddle to your Home Screen first, then turn alerts on from My account.'
              : 'Know the moment something is added or changes, and get a heads-up before things start.'}
          </p>
          {error && (
            <p role="alert" className="text-xs font-semibold text-terracotta-dark mt-1">
              {error}
            </p>
          )}
        </div>
        {state.kind === 'needs-home-screen' ? (
          <Link href="/account" className={`${buttonClass} bg-terracotta text-white`}>
            Show me how
          </Link>
        ) : (
          <button type="button" onClick={enable} disabled={busy} className={`${buttonClass} bg-terracotta text-white`}>
            {busy ? 'Turning on...' : 'Turn on alerts'}
          </button>
        )}
        <button type="button" onClick={notNow} className={`${buttonClass} bg-white border border-cream-border text-charcoal`}>
          Not now
        </button>
      </section>
    </div>
  )
}
