'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'

type Person = { id: string; name: string; slug: string; role: 'PARENT' | 'CHILD' }
type EventItem = { id: string; title: string; time: string; category: string | null; ownerName: string; ownerColor: string; ownerInitial: string }
type TaskItem = { id: string; title: string; status: 'OPEN' | 'DONE'; dueDate: string | null; category: string | null; ownerName: string }

const BUCKET_LABEL: Record<'today' | 'tomorrow' | 'week', string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: "This Week's",
}
const BUCKET_ACCENT: Record<'today' | 'tomorrow' | 'week', string> = {
  today: '#D8451F',
  tomorrow: '#A56A00',
  week: '#00806E',
}
const BUCKET_GLOW: Record<'today' | 'tomorrow' | 'week', string> = {
  today: '#FF7A56',
  tomorrow: '#FFCB74',
  week: '#5FE0CC',
}

export default function DashboardClient({
  role,
  currentUserId,
  currentUserSlug,
  greeting,
  progress,
  weekAhead,
  finePrint,
  bucket,
  weekOffset,
  weekLabel,
  category: activeCategory,
  viewFilter,
  counts,
  bullets,
  selected,
  topOfMind: initialTopOfMind,
  people,
}: {
  role: 'PARENT' | 'CHILD'
  currentUserId: string
  currentUserSlug: string
  greeting: string
  progress: { done: number; total: number }
  weekAhead: {
    days: { label: string; dateNum: number; isToday: boolean; colors: string[]; count: number }[]
    highlights: { label: string; summary: string; color: string }[]
  }
  finePrint: { label: string; title: string }[]
  bucket: 'today' | 'tomorrow' | 'week'
  weekOffset: number
  weekLabel: string
  category: string | null
  viewFilter: 'all' | 'events' | 'tasks'
  counts: { today: number; tomorrow: number; week: number }
  bullets: { today: string[]; tomorrow: string[]; week: string[] }
  selected: { events: EventItem[]; tasks: TaskItem[] }
  topOfMind: { id: string; text: string }[]
  people: Person[]
}) {
  const router = useRouter()
  const isParent = role === 'PARENT'
  const [showAdd, setShowAdd] = useState(false)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [title, setTitle] = useState('')
  const [taskTime, setTaskTime] = useState('')
  const [owner, setOwner] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState(initialTopOfMind)
  const [newNote, setNewNote] = useState('')
  const [busy, setBusy] = useState(false)

  const pct = progress.total === 0 ? 100 : Math.round((progress.done / progress.total) * 100)
  const circumference = 2 * Math.PI * 30
  const dashOffset = circumference - (pct / 100) * circumference

  async function toggleTask(id: string, current: 'OPEN' | 'DONE') {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: current === 'OPEN' ? 'DONE' : 'OPEN' }),
    })
    router.refresh()
  }

  async function saveReschedule(id: string) {
    if (!rescheduleDate) return
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: rescheduleDate }),
    })
    setReschedulingId(null)
    setRescheduleDate('')
    router.refresh()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function deleteEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    const dueDate = dueDateForBucket(bucket, weekOffset, taskTime)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        assigneeId: isParent ? owner : currentUserSlug,
        category: category || null,
        dueDate,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Couldn't add that task: ${err.error || res.statusText}`)
      return
    }
    setTitle('')
    setTaskTime('')
    setCategory('')
    setShowAdd(false)
    router.refresh()
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    const res = await fetch('/api/top-of-mind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newNote }),
    })
    const created = await res.json()
    setNotes((prev) => [{ id: created.id, text: created.text }, ...prev])
    setNewNote('')
  }

  async function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await fetch(`/api/top-of-mind/${id}`, { method: 'DELETE' })
  }

  const ownerForCategoryOptions = isParent ? owner : currentUserSlug
  const categoryOptions = categoriesForSlug(ownerForCategoryOptions)

  return (
    <div className="w-full px-3 py-4">
      {activeCategory && categoryById[activeCategory as keyof typeof categoryById] && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-charcoal-muted">Filtered to</span>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              color: categoryById[activeCategory as keyof typeof categoryById].color,
              background: `${categoryById[activeCategory as keyof typeof categoryById].color}1A`,
            }}
          >
            {categoryById[activeCategory as keyof typeof categoryById].label}
          </span>
          <Link href={`/dashboard?bucket=${bucket}${bucket === 'week' ? `&week=${weekOffset}` : ''}`} className="text-xs text-charcoal-faint">
            Clear
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <MetricCard bucketKey="today" label={BUCKET_LABEL.today} sub={new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} value={counts.today} accent={BUCKET_ACCENT.today} glow={BUCKET_GLOW.today} active={bucket === 'today'} bullets={bullets.today} category={activeCategory} />
        <MetricCard bucketKey="tomorrow" label={BUCKET_LABEL.tomorrow} sub={new Date(Date.now() + 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} value={counts.tomorrow} accent={BUCKET_ACCENT.tomorrow} glow={BUCKET_GLOW.tomorrow} active={bucket === 'tomorrow'} bullets={bullets.tomorrow} category={activeCategory} />
        <MetricCard bucketKey="week" label={BUCKET_LABEL.week} sub={weekLabel} value={counts.week} accent={BUCKET_ACCENT.week} glow={BUCKET_GLOW.week} active={bucket === 'week'} bullets={bullets.week} weekOffset={weekOffset} category={activeCategory} />
      </div>

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="font-display text-[13px] font-semibold" style={{ color: BUCKET_ACCENT[bucket] }}>
          {bucket === 'week' ? `This Week's Must Do — ${weekLabel}` : `${BUCKET_LABEL[bucket]}'s Must Do`}
        </p>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-bold px-3 py-1 rounded-full border-2 text-white shadow-sm"
            style={{ background: BUCKET_ACCENT[bucket], borderColor: BUCKET_ACCENT[bucket] }}
          >
            + Add task
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addTask} className="bg-white border rounded-2xl p-2.5 flex flex-wrap gap-1.5 items-center mb-3" style={{ borderColor: `${BUCKET_ACCENT[bucket]}55` }}>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to get done?" className="flex-1 min-w-[160px] border border-cream-border rounded-xl px-2.5 py-1.5 text-sm outline-none" />
          <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs w-[90px]" />
          {isParent && (
            <select value={owner} onChange={(e) => { setOwner(e.target.value); setCategory('') }} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs">
              {people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              <option value="parents">Parents</option>
              <option value="family">Family</option>
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs">
              <option value="">No category</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
          <button type="submit" disabled={busy} className="text-white text-xs font-semibold rounded-full px-3 h-8" style={{ background: BUCKET_ACCENT[bucket] }}>Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-charcoal-faint text-base px-1">✕</button>
        </form>
      )}

      <div className="card p-3.5 mb-4">
        {(() => {
          const showEvents = viewFilter !== 'tasks'
          const showTasks = viewFilter !== 'events'
          const visibleEvents = showEvents ? selected.events : []
          const visibleTasks = showTasks ? selected.tasks : []
          return (
            <>
              {visibleEvents.length === 0 && visibleTasks.length === 0 && (
                <p className="text-sm text-charcoal-faint">
                  {bucket === 'week' && weekOffset > 0 ? 'Nothing imported yet for this week.' : 'Nothing here.'}
                </p>
              )}

              {visibleEvents.length > 0 && (
                <div className={visibleTasks.length > 0 ? 'mb-4' : ''}>
                  <p className="text-[10px] font-bold tracking-widest text-charcoal-faint uppercase mb-2">Schedule</p>
                  {visibleEvents.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-2xl">
                      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: e.ownerColor }}>
                        {e.ownerInitial}
                      </div>
                      <span className="text-xs font-semibold text-charcoal-muted w-14 shrink-0">{e.time}</span>
                      <span className="text-sm flex-1">{isParent ? `${e.ownerName}: ${e.title}` : e.title}</span>
                      {e.category && <CategoryBadge id={e.category} />}
                      <button
                        onClick={() => { if (confirm('Delete this event?')) deleteEvent(e.id) }}
                        aria-label="Delete event"
                        className="text-charcoal-faint hover:text-terracotta-dark text-sm w-5 h-5 flex items-center justify-center rounded-full shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {visibleTasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-charcoal-faint uppercase mb-2">Tasks</p>
                  {visibleTasks.map((t) => {
                    const status = taskStatus({ status: t.status, dueDate: t.dueDate ? new Date(t.dueDate) : null })
                    const isOverdue = status?.label === 'Overdue'
                    return (
                      <div key={t.id} className="px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-2xl">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button onClick={() => toggleTask(t.id, t.status)} aria-label="toggle task" className="shrink-0">
                              <Checkbox done={t.status === 'DONE'} />
                            </button>
                            {t.dueDate && (
                              <span className="text-xs font-semibold text-charcoal-muted shrink-0">
                                {new Date(t.dueDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                            <span className={`text-sm truncate ${t.status === 'DONE' ? 'line-through text-charcoal-faint' : ''}`}>
                              {isParent ? `${t.ownerName}: ${t.title}` : t.title}
                            </span>
                            {t.category && <CategoryBadge id={t.category} />}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {status && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${status.className}`}>
                                {status.label}
                              </span>
                            )}
                            <button
                              onClick={() => { if (confirm('Delete this task?')) deleteTask(t.id) }}
                              aria-label="Delete task"
                              className="text-charcoal-faint hover:text-terracotta-dark text-sm w-5 h-5 flex items-center justify-center rounded-full"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {isOverdue && reschedulingId !== t.id && (
                          <div className="flex items-center gap-2 mt-2 pl-6">
                            <span className="text-[11px] text-charcoal-muted">Past due —</span>
                            <button
                              onClick={() => { setReschedulingId(t.id); setRescheduleDate('') }}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full border border-terracotta-dark text-terracotta-dark"
                            >
                              Reschedule
                            </button>
                            <button
                              onClick={() => toggleTask(t.id, t.status)}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sage text-white"
                            >
                              Mark done
                            </button>
                          </div>
                        )}
                        {isOverdue && reschedulingId === t.id && (
                          <div className="flex items-center gap-2 mt-2 pl-6">
                            <input
                              type="date"
                              value={rescheduleDate}
                              onChange={(e) => setRescheduleDate(e.target.value)}
                              className="border border-cream-border rounded-lg px-2 py-1 text-[11px]"
                            />
                            <button
                              onClick={() => saveReschedule(t.id)}
                              className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-terracotta text-white"
                            >
                              Save
                            </button>
                            <button onClick={() => setReschedulingId(null)} className="text-[11px] text-charcoal-faint">
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {isParent && (
        <div>
          <p className="font-display text-[13px] font-semibold mb-1.5" style={{ color: '#A56A00' }}>
            Mom &amp; Dad Top of Mind
          </p>
          <div className="bg-cream-card border rounded-card p-3" style={{ borderColor: '#FFB23866' }}>
            {notes.length === 0 && <p className="text-sm text-charcoal-faint">Nothing on your mind right now.</p>}
            {notes.map((note, i) => (
              <div key={note.id} className={`flex items-start justify-between gap-2 py-2 ${i < notes.length - 1 ? 'border-b border-cream-border' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold leading-[18px]">•</span>
                  <span className="text-sm leading-[1.5]">{note.text}</span>
                </div>
                <button onClick={() => removeNote(note.id)} aria-label="Remove note" className="text-charcoal-faint text-xs shrink-0">✕</button>
              </div>
            ))}
            <form onSubmit={addNote} className="flex gap-1.5 mt-2">
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add something to keep in mind" className="flex-1 border border-cream-border rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white" />
              <button type="submit" className="text-white text-xs font-semibold rounded-full px-3 bg-gold">Add</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function dueDateForBucket(bucket: 'today' | 'tomorrow' | 'week', weekOffset: number, time?: string) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [h, m] = (time || '09:00').split(':').map(Number)
  if (bucket === 'today') {
    const d = new Date(startOfToday)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  if (bucket === 'tomorrow') {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() + 1)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const d = new Date(startOfToday)
  d.setDate(d.getDate() + Math.max(2, weekOffset * 7 + 2))
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function MetricCard({
  bucketKey,
  label,
  sub,
  value,
  accent,
  glow,
  active,
  weekOffset,
  category,
}: {
  bucketKey: 'today' | 'tomorrow' | 'week'
  label: string
  sub: string
  value: number
  accent: string
  glow: string
  active: boolean
  bullets: string[]
  weekOffset?: number
  category?: string | null
}) {
  const catParam = category ? `&category=${category}` : ''
  const href = bucketKey === 'week' ? `/dashboard?bucket=week&week=${weekOffset ?? 0}${catParam}` : `/dashboard?bucket=${bucketKey}${catParam}`
  return (
    <div
      className="rounded-2xl overflow-hidden bg-cream-card relative flex items-center gap-3 px-3.5 py-2.5"
      style={{ border: active ? `2px solid ${accent}` : 'none', boxShadow: active ? `0 6px 18px ${accent}40` : `0 3px 12px ${accent}20`, backdropFilter: 'blur(10px)' }}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${glow}, ${accent})` }} />
      <Link href={href} className="flex-1 min-w-0">
        <p className="font-display text-[13px] font-bold truncate" style={{ color: accent }}>{label}</p>
        <p className="text-[10px] text-charcoal-faint truncate">{sub}</p>
      </Link>
      <Link href={href} className="font-display text-2xl font-bold text-charcoal leading-none shrink-0">{value}</Link>
      {bucketKey === 'week' && (
        <div className="flex items-center gap-1 shrink-0">
          {weekOffset! > 0 && (
            <Link href={`/dashboard?bucket=week&week=${weekOffset! - 1}${catParam}`} className="w-[20px] h-[20px] rounded-full bg-white flex items-center justify-center text-xs" style={{ color: accent, border: `1px solid ${accent}55` }} aria-label="Previous week">‹</Link>
          )}
          <Link href={`/dashboard?bucket=week&week=${Math.min(3, (weekOffset ?? 0) + 1)}${catParam}`} className="w-[20px] h-[20px] rounded-full bg-white flex items-center justify-center text-xs" style={{ color: accent, border: `1px solid ${accent}55` }} aria-label="Plan ahead to next week">›</Link>
        </div>
      )}
    </div>
  )
}

function CategoryBadge({ id }: { id: string }) {
  const cat = categoryById[id as keyof typeof categoryById]
  if (!cat) return null
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: cat.color, background: `${cat.color}1A` }}>
      {cat.label}
    </span>
  )
}

function Checkbox({ done }: { done: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      {done ? (
        <>
          <circle cx="12" cy="12" r="10" stroke="#00C2A8" strokeWidth="2" fill="#00C2A8" />
          <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle cx="12" cy="12" r="9" stroke="#9599A6" strokeWidth="1.5" />
      )}
    </svg>
  )
}
