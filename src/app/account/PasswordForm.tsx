'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'

export default function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setDone(false)
    if (next.length < 8) {
      setError('The new password needs at least 8 characters.')
      return
    }
    if (next !== again) {
      setError('The two new passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    const res = await api('POST', '/api/account/password', { current, next })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setCurrent('')
    setNext('')
    setAgain('')
    setDone(true)
  }

  const fieldClass = 'border border-cream-border rounded-xl px-3 py-2 text-sm text-charcoal bg-white outline-none focus:border-terracotta'

  return (
    <form onSubmit={submit} className="card p-4 flex flex-col gap-3">
      <p className="font-display text-[14px] font-semibold text-charcoal">Change my password</p>
      <label className="flex flex-col gap-1 text-xs text-charcoal-muted">
        Current password
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-charcoal-muted">
        New password (at least 8 characters)
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-charcoal-muted">
        New password again
        <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" className={fieldClass} />
      </label>
      {error && <p role="alert" className="text-xs font-semibold text-terracotta-dark">{error}</p>}
      {done && <p role="status" className="text-xs font-semibold text-sage-dark">Password changed. Use the new one next time you sign in.</p>}
      <button type="submit" disabled={busy} className="tap bg-terracotta text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
