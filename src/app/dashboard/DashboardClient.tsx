'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CATEGORIES, categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'

type Person = { id: string; name: string; slug: string; role: 'PARENT' | 'CHILD' }
type EventItem = { id: string; title: string; time: string; category: string | null; ownerName: string; ownerColor: string; ownerInitial: string }
type TaskItem = { id: string; title: string; status: 'OPEN' | 'DONE'; dueDate: string | null; category: string | null; ownerName: string }

const BUCKET_LABEL: Record<'today' | 'tomorrow' | 'week', string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: "This Week's",
}
const BUCKET_ACCENT: Record<'today' | 'tomorrow' | 'week', string> = {
  today: '#A85E42',
  tomorrow: '#A87C31',
  week: '#5E7256',
}

export default function DashboardClient({
  role,
  currentUserId,
  currentUserSlug,
  bucket,
  weekOffset,
  weekLabel,
  category: activeCategory,
  counts,
  bullets,
  selected,
  topOfMind: initialTopOfMind,
  people,
}: {
  role: 'PARENT' | 'CHILD'
  currentUserId: string
  currentUserSlug: string
  bucket: 'today' | 'tomorrow' | 'week'
  weekOffset: number
  weekLabel: string
  category: string | null
  counts: { today: number; tomorrow: number; week: number }
  bullets: { today: string[]; tomorrow: string[]; week: string[] }
  selected: { events: EventItem[]; tasks: TaskItem[] }
  topOfMind: { id: string; text: string }[]
  people: Person[]
}) {
  const router = useRouter()
  const isParent = role === 'PARENT'
  const [showAdd, setShowAdd] = useState(false)
  const [viewFilter, setViewFilter] = useState<'all' | 'tasks' | 'events'>('all')
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState(initialTopOfMind)
  const [newNote, setNewNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function toggleTask(id: string, current: 'OPEN' | 'DONE') {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: current === 'OPEN' ? 'DONE' : 'OPEN' }),
    })
    router.refresh()
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    const dueDate = dueDateForBucket(bucket, weekOffset)
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
    <div className="max-w-6xl mx-auto px-4 py-5">
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
            Clear ✕
          </Link>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <MetricCard
          bucketKey="today"
          label={BUCKET_LABEL.today}
          sub={new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          value={counts.today}
          accent={BUCKET_ACCENT.today}
          active={bucket === 'today'}
          bullets={bullets.today}
          category={activeCategory}
        />
        <MetricCard
          bucketKey="tomorrow"
          label={BUCKET_LABEL.tomorrow}
          sub={new Date(Date.now() + 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          value={counts.tomorrow}
          accent={BUCKET_ACCENT.tomorrow}
          active={bucket === 'tomorrow'}
          bullets={bullets.tomorrow}
          category={activeCategory}
        />
        <MetricCard
          bucketKey="week"
          label={BUCKET_LABEL.week}
          sub={weekLabel}
          value={counts.week}
          accent={BUCKET_ACCENT.week}
          active={bucket === 'week'}
          bullets={bullets.week}
          weekOffset={weekOffset}
          category={activeCategory}
        />
      </div>

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="font-display text-[15px] font-semibold" style={{ color: BUCKET_ACCENT[bucket] }}>
          {bucket === 'week' ? `This Week's Must Do — ${weekLabel}` : `${BUCKET_LABEL[bucket]}'s Must Do`}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden" style={{ borderColor: `${BUCKET_ACCENT[bucket]}55` }}>
            {(['all', 'events', 'tasks'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewFilter(v)}
                className="text-xs font-semibold px-2.5 py-1"
                style={{
                  background: viewFilter === v ? BUCKET_ACCENT[bucket] : '#fff',
                  color: viewFilter === v ? '#fff' : BUCKET_ACCENT[bucket],
                }}
              >
                {v === 'all' ? 'All' : v === 'events' ? 'Events' : 'Tasks'}
              </button>
            ))}
          </div>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-white"
              style={{ color: BUCKET_ACCENT[bucket], borderColor: `${BUCKET_ACCENT[bucket]}66` }}
            >
              + Add task
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={addTask}
          className="bg-white border rounded-lg p-2.5 flex flex-wrap gap-1.5 items-center mb-3"
          style={{ borderColor: `${BUCKET_ACCENT[bucket]}55` }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to get done?"
            className="flex-1 min-w-[160px] border border-cream-border rounded-md px-2.5 py-1.5 text-sm outline-none"
          />
          {isParent && (
            <select
              value={owner}
              onChange={(e) => {
                setOwner(e.target.value)
                setCategory('')
              }}
              className="border border-cream-border rounded-md px-2 py-1.5 text-xs"
            >
              {people.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
              <option value="parents">Parents</option>
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-cream-border rounded-md px-2 py-1.5 text-xs"
            >
              <option value="">No category</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={busy}
            className="text-white text-xs font-semibold rounded-md px-3 h-8"
            style={{ background: BUCKET_ACCENT[bucket] }}
          >
            Add
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-charcoal-faint text-base px-1">
            ✕
          </button>
        </form>
      )}

      <div className="card p-4 mb-5">
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
                    <div
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-lg shadow-sm"
                    >
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ background: e.ownerColor }}
                      >
                        {e.ownerInitial}
                      </div>
                      <span className="text-xs font-semibold text-charcoal-muted w-14 shrink-0">{e.time}</span>
                      <span className="text-sm flex-1">{isParent ? `${e.ownerName}: ${e.title}` : e.title}</span>
                      {e.category && <CategoryBadge id={e.category} />}
                    </div>
                  ))}
                </div>
              )}

              {visibleTasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-charcoal-faint uppercase mb-2">Tasks</p>
                  {visibleTasks.map((t) => {
                    const status = taskStatus({ status: t.status, dueDate: t.dueDate ? new Date(t.dueDate) : null })
                    return (
                      <div key={t.id} className="px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-lg shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <button onClick={() => toggleTask(t.id, t.status)} aria-label="toggle task" className="shrink-0">
                              <Checkbox done={t.status === 'DONE'} />
                            </button>
                            <span className={`text-sm truncate ${t.status === 'DONE' ? 'line-through text-charcoal-faint' : ''}`}>
                              {isParent ? `${t.ownerName}: ${t.title}` : t.title}
                            </span>
                            {t.category && <CategoryBadge id={t.category} />}
                          </div>
                          {status && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${status.className}`}>
                              {status.label}
                            </span>
                          )}
                        </div>
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
          <p className="font-display text-[15px] font-semibold mb-2" style={{ color: '#A87C31' }}>
            Mom &amp; Dad Top of Mind
          </p>
          <div className="bg-cream-card border rounded-card p-4 shadow-sm" style={{ borderColor: '#D4A24C66' }}>
            <p className="text-xs text-charcoal-muted mb-2.5">
              Things to keep top of mind as we prepare for the days ahead.
            </p>
            {notes.length === 0 && <p className="text-sm text-charcoal-faint">Nothing on your mind right now.</p>}
            {notes.map((note, i) => (
              <div
                key={note.id}
                className={`flex items-start justify-between gap-2 py-2.5 ${
                  i < notes.length - 1 ? 'border-b border-cream-border' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold leading-[18px]">•</span>
                  <span className="text-sm leading-[1.6]">{note.text}</span>
                </div>
                <button onClick={() => removeNote(note.id)} aria-label="Remove note" className="text-charcoal-faint text-xs shrink-0">
                  ✕
                </button>
              </div>
            ))}
            <form onSubmit={addNote} className="flex gap-1.5 mt-2.5">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add something to keep in mind"
                className="flex-1 border border-cream-border rounded-md px-2.5 py-1.5 text-xs outline-none bg-white"
              />
              <button type="submit" className="text-white text-xs font-semibold rounded-md px-3 bg-gradient-to-br from-gold to-gold-dark">
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function dueDateForBucket(bucket: 'today' | 'tomorrow' | 'week', weekOffset: number) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (bucket === 'today') return startOfToday.toISOString()
  if (bucket === 'tomorrow') {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() + 1)
    return d.toISOString()
  }
  const d = new Date(startOfToday)
  d.setDate(d.getDate() + Math.max(2, weekOffset * 7 + 2))
  return d.toISOString()
}

function MetricCard({
  bucketKey,
  label,
  sub,
  value,
  accent,
  active,
  bullets,
  weekOffset,
  category,
}: {
  bucketKey: 'today' | 'tomorrow' | 'week'
  label: string
  sub: string
  value: number
  accent: string
  active: boolean
  bullets: string[]
  weekOffset?: number
  category?: string | null
}) {
  const catParam = category ? `&category=${category}` : ''
  const href =
    bucketKey === 'week' ? `/dashboard?bucket=week&week=${weekOffset ?? 0}${catParam}` : `/dashboard?bucket=${bucketKey}${catParam}`
  return (
    <div
      className="rounded-card overflow-hidden bg-cream-card"
      style={{
        border: active ? `2px solid ${accent}` : '0.5px solid #C7CFBB',
        boxShadow: active ? `0 4px 14px ${accent}33` : '0 1px 3px rgba(61,61,58,0.06)',
      }}
    >
      <Link href={href} className="block" style={{ background: `${accent}1F`, borderBottom: `1px solid ${accent}33` }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-display text-sm font-bold" style={{ color: accent }}>
              {label}
            </p>
            <p className="text-[11px] opacity-75" style={{ color: accent }}>
              {sub}
            </p>
          </div>
          {bucketKey === 'week' && (
            <div className="flex items-center gap-1">
              {weekOffset! > 0 && (
                <Link
                  href={`/dashboard?bucket=week&week=${weekOffset! - 1}${catParam}`}
                  className="w-[22px] h-[22px] rounded-md bg-white flex items-center justify-center text-xs"
                  style={{ color: accent, border: `1px solid ${accent}55` }}
                  aria-label="Previous week"
                >
                  ‹
                </Link>
              )}
              <Link
                href={`/dashboard?bucket=week&week=${Math.min(3, (weekOffset ?? 0) + 1)}${catParam}`}
                className="w-[22px] h-[22px] rounded-md bg-white flex items-center justify-center text-xs"
                style={{ color: accent, border: `1px solid ${accent}55` }}
                aria-label="Plan ahead to next week"
              >
                ›
              </Link>
            </div>
          )}
        </div>
      </Link>
      <Link href={href} className="block px-4 pt-3.5 pb-4">
        <p className="font-display text-[30px] font-semibold text-charcoal leading-none">{value}</p>
        {bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-charcoal-muted">
                <span className="font-bold" style={{ color: accent }}>
                  •
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {bullets.length === 0 && value === 0 && <p className="text-[11px] text-charcoal-faint mt-3">Nothing here yet.</p>}
      </Link>
    </div>
  )
}

function CategoryBadge({ id }: { id: string }) {
  const cat = categoryById[id as keyof typeof categoryById]
  if (!cat) return null
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
      style={{ color: cat.color, background: `${cat.color}1A` }}
    >
      {cat.label}
    </span>
  )
}

function Checkbox({ done }: { done: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      {done ? (
        <>
          <circle cx="12" cy="12" r="10" stroke="#7C9473" strokeWidth="2" fill="#7C9473" />
          <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle cx="12" cy="12" r="9" stroke="#9A9484" strokeWidth="1.5" />
      )}
    </svg>
  )
}
