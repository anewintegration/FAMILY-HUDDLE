'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { CheckCircle, CloseIcon, PencilIcon } from '@/components/RowBits'

export type ChecklistItemData = { id: string; text: string; done: boolean }

type Mode = 'view' | 'edit' | 'confirm'

// One goal or bucket-list item: check it off, reword it, delete it - and, for a goal
// left over from an earlier month, bring it into this month.
function ChecklistRow({
  item,
  accent,
  bringTo,
}: {
  item: ChecklistItemData
  accent: string
  /** Set on leftover goals: the month to move them into, e.g. { key: '2026-10', label: 'October' } */
  bringTo?: { key: string; label: string }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>('view')
  const [text, setText] = useState(item.text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const working = busy || pending

  async function run(method: 'PATCH' | 'DELETE', body?: unknown) {
    setBusy(true)
    setError('')
    const res = await api(method, `/api/checklist/${item.id}`, body)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      if (res.status === 404) startTransition(() => router.refresh())
      return false
    }
    startTransition(() => {
      router.refresh()
    })
    return true
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (working) return
    if (!text.trim()) {
      setError('Please write something first.')
      return
    }
    if (await run('PATCH', { text: text.trim() })) setMode('view')
  }

  if (mode === 'edit') {
    return (
      <form onSubmit={save} className="flex flex-col gap-2 px-3 py-3 mb-2 bg-white border-2 rounded-2xl" style={{ borderColor: accent }}>
        <input value={text} onChange={(e) => setText(e.target.value)} aria-label="Text" maxLength={200} className="border border-cream-border rounded-xl px-2.5 py-1.5 text-sm" />
        {error && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{error}</p>}
        <div className="flex gap-2 items-center">
          <button type="submit" disabled={working} className="tap flex-1 text-white rounded-full py-1.5 text-xs font-bold disabled:opacity-60" style={{ background: accent }}>
            {working ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => { setMode('view'); setText(item.text); setError('') }} className="tap text-charcoal-muted text-xs font-semibold px-3">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className={`mb-2 bg-white border border-cream-border rounded-2xl ${working ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => run('PATCH', { done: !item.done })}
          disabled={working}
          aria-label={item.done ? 'Mark not done' : 'Mark done'}
          className="tap-icon shrink-0 flex items-center justify-center rounded-full"
        >
          <CheckCircle done={item.done} />
        </button>
        {/* The text and the "Bring to <month>" button share a line when there is room, and stack on a phone. */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`flex-1 basis-32 min-w-0 text-sm break-words ${item.done ? 'line-through text-charcoal-faint' : 'text-charcoal'}`}>{item.text}</span>
          {bringTo && (
            <button
              type="button"
              onClick={() => run('PATCH', { month: bringTo.key })}
              disabled={working}
              className="tap text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white shrink-0"
              style={{ background: accent }}
            >
              Bring to {bringTo.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setText(item.text); setError(''); setMode('edit') }}
          disabled={working}
          aria-label="Edit"
          className="tap-icon shrink-0 flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          onClick={() => { setError(''); setMode('confirm') }}
          disabled={working}
          aria-label="Delete"
          className="tap-icon shrink-0 flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta-dark"
        >
          <CloseIcon />
        </button>
      </div>
      {mode === 'confirm' && (
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap bg-terracotta/10 rounded-b-2xl">
          <span className="text-xs font-semibold text-charcoal flex-1 min-w-[140px]">Delete “{item.text}”?</span>
          <button
            type="button"
            onClick={async () => { if (await run('DELETE')) setMode('view') }}
            disabled={working}
            className="tap text-[11px] font-bold px-3 py-1 rounded-full bg-terracotta-dark text-white disabled:opacity-60"
          >
            {working ? 'Deleting…' : 'Delete'}
          </button>
          <button type="button" onClick={() => setMode('view')} className="tap text-[11px] font-bold px-3 py-1 rounded-full bg-white border border-cream-border text-charcoal">
            Keep
          </button>
        </div>
      )}
      {error && <p role="alert" className="px-3 pb-2 text-[11px] font-semibold text-terracotta-dark">{error}</p>}
    </div>
  )
}

export default function ChecklistPageClient({
  kind,
  title,
  subtitle,
  items,
  carryOver = [],
  carryTo,
  month,
  monthNav,
  placeholder,
  accent,
}: {
  kind: 'GOAL' | 'BUCKET_LIST'
  title: string
  subtitle: string
  items: ChecklistItemData[]
  /** Goals from earlier months that are still not done. */
  carryOver?: ChecklistItemData[]
  carryTo?: { key: string; label: string }
  /** Goals only: the month ("YYYY-MM") new goals are added to. */
  month?: string
  monthNav?: { prev: string; next: string; thisMonth: string | null }
  placeholder: string
  accent: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!text.trim()) {
      setError('Please write something first.')
      return
    }
    setBusy(true)
    setError('')
    const res = await api('POST', '/api/checklist', { text: text.trim(), kind, ...(kind === 'GOAL' && month ? { month } : {}) })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setText('')
    startTransition(() => {
      router.refresh()
    })
  }

  // Open items first, finished ones underneath.
  const ordered = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)]
  const navButton = 'tap-icon rounded-full bg-white flex items-center justify-center text-charcoal text-lg font-bold shadow-sm'

  return (
    <div className="w-full px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <p className="font-display text-xl font-semibold text-white">{title}</p>
        {monthNav && (
          <div className="flex items-center gap-2">
            <Link href={monthNav.prev} className={navButton} aria-label="Previous month">
              ‹
            </Link>
            {monthNav.thisMonth && (
              <Link href={monthNav.thisMonth} className="tap text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-charcoal shadow-sm">
                This month
              </Link>
            )}
            <Link href={monthNav.next} className={navButton} aria-label="Next month">
              ›
            </Link>
          </div>
        )}
      </div>
      <p className="text-xs text-white/80 mb-3">{subtitle}</p>

      <form onSubmit={addItem} className="card p-3 flex flex-col gap-2 mb-3">
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            maxLength={200}
            className="flex-1 border border-cream-border rounded-xl px-3 py-2 text-sm outline-none bg-white"
          />
          <button type="submit" disabled={busy} aria-label="Add" className="tap text-white text-sm font-semibold rounded-full px-4 disabled:opacity-60" style={{ background: accent }}>
            +
          </button>
        </div>
        {error && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{error}</p>}
      </form>

      <div className={`card p-3 ${pending ? 'opacity-80' : ''}`}>
        {ordered.length === 0 && <p className="text-sm text-charcoal-faint">Nothing here yet.</p>}
        {ordered.map((item) => (
          <ChecklistRow key={item.id} item={item} accent={accent} />
        ))}
      </div>

      {carryOver.length > 0 && carryTo && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-white mb-1">Still open from earlier months</p>
          <p className="text-xs text-white/70 mb-2">Bring a goal into {carryTo.label} to keep working on it, or delete it.</p>
          <div className="card p-3">
            {carryOver.map((item) => (
              <ChecklistRow key={item.id} item={item} accent={accent} bringTo={carryTo} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
