'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug } from '@/lib/categories'
import { fromInputs, todayKey } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { EventRowData, PersonOption } from '@/lib/rows'
import EditableEventRow from '@/components/EditableEventRow'
import { WhoOptions } from '@/components/RowBits'

export default function EventsClient({
  events,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  events: EventRowData[]
  people: PersonOption[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [ownerSlug, setOwnerSlug] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(() => todayKey())
  const [time, setTime] = useState('')
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const categoryOptions = categoriesForSlug(canAssignOthers ? ownerSlug : currentUserSlug)
  const rowContext = { people, canAssignOthers, currentUserSlug }

  // "Upcoming" starts at the beginning of today, so something that already happened
  // this morning is still there to move or remove.
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const upcoming = events.filter((e) => new Date(e.startTime).getTime() >= startOfToday)
  const past = events.filter((e) => new Date(e.startTime).getTime() < startOfToday)
  const visible = filter === 'upcoming' ? upcoming : past

  function changeOwner(slug: string) {
    setOwnerSlug(slug)
    if (!categoriesForSlug(slug).some((c) => c.id === category)) setCategory('')
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setError('Please give the event a title.')
      return
    }
    if (!date) {
      setError('Please pick a date for the event.')
      return
    }
    setBusy(true)
    setError('')
    const res = await api('POST', '/api/events', {
      title: title.trim(),
      ownerId: canAssignOthers ? ownerSlug : currentUserSlug,
      category: category || null,
      startTime: fromInputs(date, time, '09:00'),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setTitle('')
    setCategory('')
    setTime('')
    startTransition(() => {
      router.refresh()
    })
  }

  const fieldClass = 'border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal bg-white flex-1 min-w-[110px]'
  const tabClass = (on: boolean) =>
    `tap text-xs px-3.5 py-1.5 rounded-full font-semibold ${on ? 'bg-white text-charcoal shadow-sm' : 'bg-white/20 text-white'}`

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={addEvent} className="card p-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          aria-label="Event title"
          maxLength={200}
          className="border border-cream-border rounded-xl px-3 py-2 text-sm text-charcoal outline-none bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Event date" className={fieldClass} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Event time" className={fieldClass} />
          {canAssignOthers && (
            <select value={ownerSlug} onChange={(e) => changeOwner(e.target.value)} aria-label="Who is it for" className={fieldClass}>
              <WhoOptions people={people} />
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" className={fieldClass}>
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
        <button type="submit" disabled={busy} className="tap bg-category-sports text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Adding…' : 'Add event'}
        </button>
      </form>

      <div className="flex gap-2">
        <button type="button" onClick={() => setFilter('upcoming')} aria-pressed={filter === 'upcoming'} className={tabClass(filter === 'upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button type="button" onClick={() => setFilter('past')} aria-pressed={filter === 'past'} className={tabClass(filter === 'past')}>
          Past ({past.length})
        </button>
      </div>

      <div className={`card p-3 ${pending ? 'opacity-80' : ''}`}>
        {visible.length === 0 && <p className="text-sm text-charcoal-faint">{filter === 'upcoming' ? 'Nothing coming up.' : 'No past events.'}</p>}
        {visible.map((e) => (
          <EditableEventRow key={e.id} {...e} {...rowContext} showDate="always" showOwner={canAssignOthers} />
        ))}
      </div>
    </div>
  )
}
