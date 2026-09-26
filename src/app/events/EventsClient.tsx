'use client'

import { useState } from 'react'
import { categoriesForSlug, categoryById } from '@/lib/categories'

type EventItem = {
  id: string
  title: string
  startTime: string
  category: string | null
  ownerName: string
  ownerSlug: string
  ownerColor: string
}

type Person = { id: string; name: string; slug: string; color: string }

export default function EventsClient({
  initialEvents,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  initialEvents: EventItem[]
  people: Person[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const [events, setEvents] = useState(initialEvents)
  const [title, setTitle] = useState('')
  const [ownerSlug, setOwnerSlug] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming')

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    const startTime = new Date(`${date}T${time || '09:00'}`).toISOString()
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, ownerId: ownerSlug, category: category || null, startTime }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Couldn't add that event: ${err.error || res.statusText}`)
      return
    }
    const created = await res.json()
    const person = people.find((p) => p.slug === ownerSlug)
    setEvents((prev) =>
      [
        {
          id: created.id,
          title,
          startTime,
          category: category || null,
          ownerName: person?.name ?? (ownerSlug === 'family' ? 'Family' : 'Parents'),
          ownerSlug,
          ownerColor: person?.color ?? '#1B2340',
        },
        ...prev,
      ].sort((a, b) => a.startTime.localeCompare(b.startTime))
    )
    setTitle('')
    setCategory('')
    setDate('')
    setTime('')
  }

  async function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
  }

  const now = new Date()
  const visible = events.filter((e) => (filter === 'upcoming' ? new Date(e.startTime) >= now : new Date(e.startTime) < now))
  const categoryOptions = categoriesForSlug(canAssignOthers ? ownerSlug : currentUserSlug)

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={addEvent} className="card p-3 flex flex-col gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="border border-cream-border rounded-xl px-3 py-2 text-sm text-charcoal outline-none bg-white" />
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal flex-1" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal flex-1" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {canAssignOthers && (
            <select value={ownerSlug} onChange={(e) => { setOwnerSlug(e.target.value); setCategory('') }} className="border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal flex-1">
              {people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              <option value="parents">Parents</option>
              <option value="family">Family</option>
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal flex-1">
              <option value="">No category</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
        </div>
        <button type="submit" className="bg-category-sports text-white rounded-full py-2 text-sm font-semibold">Add event</button>
      </form>

      <div className="flex gap-2">
        <button onClick={() => setFilter('upcoming')} className={`text-xs px-3 py-1.5 rounded-full ${filter === 'upcoming' ? 'bg-cream-border font-semibold text-charcoal' : 'text-charcoal-muted'}`}>Upcoming</button>
        <button onClick={() => setFilter('past')} className={`text-xs px-3 py-1.5 rounded-full ${filter === 'past' ? 'bg-cream-border font-semibold text-charcoal' : 'text-charcoal-muted'}`}>Past</button>
      </div>

      <div className="flex flex-col gap-2">
        {visible.length === 0 && <p className="text-sm text-charcoal-faint">Nothing here.</p>}
        {visible.map((e) => {
          const d = new Date(e.startTime)
          const cat = e.category ? categoryById[e.category as keyof typeof categoryById] : null
          return (
            <div key={e.id} className="flex items-center gap-3 card px-3.5 py-3">
              <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: e.ownerColor }}>
                {e.ownerName[0]}
              </div>
              <span className="text-xs font-semibold text-charcoal-muted w-24 shrink-0">
                {d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="text-sm flex-1">{canAssignOthers ? `${e.ownerName}: ${e.title}` : e.title}</span>
              {cat && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: cat.color, background: `${cat.color}1A` }}>{cat.label}</span>
              )}
              <button
                onClick={() => { if (confirm('Delete this event?')) deleteEvent(e.id) }}
                aria-label="Delete event"
                className="text-charcoal-faint hover:text-terracotta-dark text-sm w-6 h-6 flex items-center justify-center rounded-full shrink-0"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
