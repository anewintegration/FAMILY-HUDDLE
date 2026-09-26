'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug } from '@/lib/categories'

type Person = { id: string; name: string; slug: string }

export default function CalendarQuickAdd({
  dateKey,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  dateKey: string
  people: Person[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'task' | 'event'>('task')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [who, setWho] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)

  const categoryOptions = categoriesForSlug(canAssignOthers ? who : currentUserSlug)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    if (kind === 'task') {
      const fullDueDate = new Date(`${dateKey}T${time || '09:00'}`).toISOString()
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assigneeId: canAssignOthers ? who : currentUserSlug, category: category || null, dueDate: fullDueDate }),
      })
    } else {
      const startTime = new Date(`${dateKey}T${time || '09:00'}`).toISOString()
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ownerId: canAssignOthers ? who : currentUserSlug, category: category || null, startTime }),
      })
    }
    setTitle('')
    setTime('')
    setCategory('')
    setBusy(false)
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-white text-terracotta-dark border-terracotta-dark mb-3"
      >
        + Add to this day
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white border border-terracotta-dark/40 rounded-2xl p-3 flex flex-col gap-2 mb-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind('task')}
          className={`text-xs font-bold px-3 py-1 rounded-full ${kind === 'task' ? 'bg-terracotta text-white' : 'bg-cream-border text-charcoal-muted'}`}
        >
          Task
        </button>
        <button
          type="button"
          onClick={() => setKind('event')}
          className={`text-xs font-bold px-3 py-1 rounded-full ${kind === 'event' ? 'bg-category-sports text-white' : 'bg-cream-border text-charcoal-muted'}`}
        >
          Event
        </button>
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === 'task' ? 'What needs to get done?' : 'Event title'}
        className="border border-cream-border rounded-xl px-3 py-2 text-sm outline-none"
      />
      <div className="flex gap-2 flex-wrap">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border border-cream-border rounded-xl px-2 py-2 text-sm flex-1" />
        {canAssignOthers && (
          <select value={who} onChange={(e) => { setWho(e.target.value); setCategory('') }} className="border border-cream-border rounded-xl px-2 py-2 text-sm flex-1">
            {people.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
            <option value="parents">Parents</option>
            <option value="family">Family</option>
          </select>
        )}
        {categoryOptions.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-cream-border rounded-xl px-2 py-2 text-sm flex-1">
            <option value="">No category</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 bg-terracotta text-white rounded-full py-2 text-sm font-semibold">
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-charcoal-faint text-sm px-3">
          Cancel
        </button>
      </div>
    </form>
  )
}
