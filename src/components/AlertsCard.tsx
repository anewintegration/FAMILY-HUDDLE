'use client'

import { useEffect, useState } from 'react'
import { readAlertState, savePref, sendTest, turnOff, turnOn } from '@/lib/pushClient'
import type { AlertKind, AlertState } from '@/lib/pushClient'

export type AlertPrefs = Record<AlertKind, boolean>

const STATUS: Record<AlertState['kind'], string> = {
  loading: 'Checking this device...',
  kiosk: 'This is the fridge screen. It shows the day but does not buzz. Turn alerts on from your phone or computer instead.',
  'needs-home-screen':
    'To get alerts on an iPhone or iPad, Huddle has to be on your Home Screen first. Tap the Share button, choose Add to Home Screen, then open Huddle from its new icon and come back to this page. (Needs iOS 16.4 or newer.)',
  unsupported:
    'This browser cannot show Huddle alerts. Chrome, Edge, Firefox and Safari can (on an iPhone or iPad, iOS 16.4 or newer).',
  denied:
    'Alerts are blocked for Huddle on this device. Allow notifications for Huddle in this device settings, then reload this page. On an iPhone or iPad: Settings, then Notifications, then Huddle. If it is not listed there, delete the Huddle icon and add it to the Home Screen again.',
  off: 'Alerts are off on this device. Turn them on to hear about changes the moment they happen.',
  on: 'Alerts are on for this device.',
}

const buttonClass = 'tap rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-60'

// Your choices apply to all of your phones and computers; the on/off button above applies to this one.
export default function AlertsCard({ userId, isParent, initial }: { userId: string; isParent: boolean; initial: AlertPrefs }) {
  const [state, setState] = useState<AlertState>({ kind: 'loading' })
  const [prefs, setPrefs] = useState<AlertPrefs>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    readAlertState(userId).then((found) => {
      if (alive) setState(found)
    })
    return () => {
      alive = false
    }
  }, [userId])

  const choices: { kind: AlertKind; label: string; hint: string }[] = [
    { kind: 'alertChanges', label: 'New and changed items', hint: 'Someone adds, moves or cancels a task or an event' },
    {
      kind: 'alertDone',
      label: 'Finished tasks',
      hint: isParent ? 'A kid finishes a task, or someone finishes one you set' : 'Someone finishes a task you set',
    },
    { kind: 'alertBoard', label: 'Whiteboard posts', hint: 'Someone writes on the family whiteboard' },
    { kind: 'alertReminders', label: 'Reminders and the 7 AM briefing', hint: '30 minutes before something starts, and what is on today' },
  ]

  async function enable() {
    if (busy) return
    setBusy(true)
    setError('')
    setNote('')
    // Straight from the tap: iPhones only show the "Allow notifications?" question this way.
    const result = await turnOn(userId)
    if (result.ok) {
      setState({ kind: 'on' })
      setNote('Alerts are on for this device.')
    } else {
      setError(result.error)
      setState(await readAlertState(userId))
    }
    setBusy(false)
  }

  async function disable() {
    if (busy) return
    setBusy(true)
    setError('')
    setNote('')
    const result = await turnOff(userId)
    if (result.ok) {
      setState({ kind: 'off' })
      setNote('Alerts are off for this device.')
    } else {
      setError(result.error)
    }
    setBusy(false)
  }

  async function test() {
    if (busy) return
    setBusy(true)
    setError('')
    setNote('')
    const result = await sendTest()
    if (!result.ok) setError(result.error)
    else if (result.sent > 0) setNote('Test sent. It should show up in a few seconds.')
    else setError('The test did not reach any device. Try turning alerts off and on again.')
    setBusy(false)
  }

  async function change(kind: AlertKind, value: boolean) {
    const before = prefs[kind]
    setPrefs({ ...prefs, [kind]: value })
    setError('')
    setNote('')
    const result = await savePref(kind, value)
    if (!result.ok) {
      setPrefs((now) => ({ ...now, [kind]: before }))
      setError(result.error)
    }
  }

  const showChoices = state.kind === 'on' || state.kind === 'off'

  return (
    <section className="card p-4 mb-3 flex flex-col gap-3" aria-labelledby="alerts-title">
      <div>
        <p id="alerts-title" className="font-display text-[14px] font-semibold text-charcoal">
          Alerts on this device
        </p>
        <p className="text-xs text-charcoal-muted mt-1">{STATUS[state.kind]}</p>
      </div>

      {state.kind === 'off' && (
        <button type="button" onClick={enable} disabled={busy} className={`${buttonClass} bg-terracotta text-white`}>
          {busy ? 'Turning on...' : 'Turn on alerts'}
        </button>
      )}
      {state.kind === 'on' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={test} disabled={busy} className={`${buttonClass} bg-terracotta text-white`}>
            Send a test alert
          </button>
          <button type="button" onClick={disable} disabled={busy} className={`${buttonClass} bg-white border border-cream-border text-charcoal`}>
            Turn off
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs font-semibold text-terracotta-dark">
          {error}
        </p>
      )}
      {note && (
        <p role="status" className="text-xs font-semibold text-sage-dark">
          {note}
        </p>
      )}

      {showChoices && (
        <fieldset className="border-t border-cream-border pt-2">
          <legend className="sr-only">Which alerts do you want?</legend>
          <p className="text-xs text-charcoal-muted mb-1">Which alerts do you want? (This applies to all of your devices.)</p>
          {choices.map((c) => (
            <label key={c.kind} className="flex items-center gap-3 min-h-[44px] py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[c.kind]}
                onChange={(e) => change(c.kind, e.target.checked)}
                className="w-5 h-5 shrink-0 accent-terracotta"
              />
              <span>
                <span className="block text-sm font-semibold text-charcoal">{c.label}</span>
                <span className="block text-[11px] text-charcoal-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  )
}
