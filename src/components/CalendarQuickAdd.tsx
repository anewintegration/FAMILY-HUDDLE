'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug } from '@/lib/categories'
import { ANYTIME, fromInputs } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { PersonOption } from '@/lib/rows'
import { WhoOptions } from '@/components/RowBits'

// "Add to this day" on the calendar: a task or an event, for anyone, with a category.
export default function CalendarQuickAdd({
  dateKey,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  dateKey: string
  people: PersonOption[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'task' | 'event'>('task')
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [who, setWho] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const working = busy || pending
  const categoryOptions = categoriesForSlug(canAssignOthers ? who : currentUserSlug)

  function changeWho(slug: string) {
    setWho(slug)
    if (!categoriesForSlug(slug).some((c) => c.id === category)) setCategory('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || working) {
      if (!title.trim()) setError('Please type a title first.')
      return
    }
    setBusy(true)
    setError('')

    // A task with no time means "any time that day"; an event with no time starts at 9.
    const res =
      kind === 'task'
        ? await api('POST', '/api/tasks', {
            title: title.trim(),
            assigneeId: canAssignOthers ? who : currentUserSlug,
            category: category || null,
            dueDate: fromInputs(dateKey, time, ANYTIME),
          })
        : await api('POST', '/api/events', {
            title: title.trim(),
            ownerId: canAssignOthers ? who : currentUserSlug,
            category: category || null,
            startTime: fromInputs(dateKey, time, '09:00'),
          })
    setBusy(false)

    if (!res.ok) {
      setError(res.error)
      return
    }
    setTitle('')
    setTime('')
    setCategory('')
    setOpen(false)
    startTransition(() => {
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap text-xs font-bold px-3.5 py-1.5 rounded-full border-2 bg-white text-terracotta-dark border-terracotta-dark mb-3"
      >
        + Add to this day
      </button>
    )
  }

  const fieldClass = 'border border-cream-border rounded-xl px-2 py-2 text-sm bg-white'

  return (
    <form onSubmit={submit} className="bg-white border-2 border-terracotta-dark/40 rounded-2xl p-3 flex flex-col gap-2 mb-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setKind('task')}
          aria-pressed={kind === 'task'}
          className={`tap text-xs font-bold px-3 py-1 rounded-full ${kind === 'task' ? 'bg-terracotta text-white' : 'bg-cream-border text-charcoal-muted'}`}
        >
          Task
        </button>
        <button
          type="button"
          onClick={() => setKind('event')}
          aria-pressed={kind === 'event'}
          className={`tap text-xs font-bold px-3 py-1 rounded-full ${kind === 'event' ? 'bg-category-sports text-white' : 'bg-cream-border text-charcoal-muted'}`}
        >
          Event
        </button>
      </div>
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={kind === 'task' ? 'What needs to get done?' : 'Event title'}
        aria-label={kind === 'task' ? 'Task title' : 'Event title'}
        maxLength={200}
        className="border border-cream-border rounded-xl px-3 py-2 text-sm outline-none"
      />
      <div className="flex gap-2 flex-wrap">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" className={`${fieldClass} flex-1 min-w-[100px]`} />
        {canAssignOthers && (
          <select value={who} onChange={(e) => changeWho(e.target.value)} aria-label="Who is it for" className={`${fieldClass} flex-1 min-w-[110px]`}>
            <WhoOptions people={people} />
          </select>
        )}
        {categoryOptions.length > 0 && (
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={`${fieldClass} flex-1 min-w-[110px]`}>
            <option value="">No category</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{error}</p>}
      <div className="flex gap-2 items-center">
        <button type="submit" disabled={working} className="tap flex-1 bg-terracotta text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
          {working ? 'Adding…' : kind === 'task' ? 'Add task' : 'Add event'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError('') }} className="tap text-charcoal-muted text-sm font-semibold px-3">
          Cancel
        </button>
      </div>
    </form>
  )
}
