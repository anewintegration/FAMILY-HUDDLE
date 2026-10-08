'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { categoriesForSlug, categoryById } from '@/lib/categories'
import { ANYTIME, addDaysKey, fromInputs, todayKey } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { EventRowData, PersonOption, TaskRowData } from '@/lib/rows'
import EditableEventRow from '@/components/EditableEventRow'
import EditableTaskRow from '@/components/EditableTaskRow'
import { WhoOptions } from '@/components/RowBits'

type Bucket = 'today' | 'tomorrow' | 'week'

const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: "This Week's",
}
const BUCKET_ACCENT: Record<Bucket, string> = {
  today: '#D8451F',
  tomorrow: '#A56A00',
  week: '#00806E',
}
const BUCKET_GLOW: Record<Bucket, string> = {
  today: '#FF7A56',
  tomorrow: '#FFCB74',
  week: '#5FE0CC',
}

export default function DashboardClient({
  role,
  currentUserSlug,
  bucket,
  weekOffset,
  weekLabel,
  weekRange,
  todayLabel,
  tomorrowLabel,
  category: activeCategory,
  viewFilter,
  counts,
  selected,
  topOfMind,
  people,
}: {
  role: 'PARENT' | 'CHILD'
  currentUserSlug: string
  bucket: Bucket
  weekOffset: number
  weekLabel: string
  weekRange: { min: string; max: string }
  todayLabel: string
  tomorrowLabel: string
  category: string | null
  viewFilter: 'all' | 'events' | 'tasks'
  counts: { today: number; tomorrow: number; week: number }
  selected: { events: EventRowData[]; tasks: TaskRowData[] }
  topOfMind: { id: string; text: string }[]
  people: PersonOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isParent = role === 'PARENT'

  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [taskDate, setTaskDate] = useState('')
  const [taskTime, setTaskTime] = useState('')
  const [owner, setOwner] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [addError, setAddError] = useState('')

  const [newNote, setNewNote] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState('')

  const categoryOptions = categoriesForSlug(isParent ? owner : currentUserSlug)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  function openAdd() {
    setTaskDate(weekRange.min)
    setAddError('')
    setShowAdd(true)
  }

  function changeOwner(slug: string) {
    setOwner(slug)
    if (!categoriesForSlug(slug).some((c) => c.id === category)) setCategory('')
  }

  // The day a new task lands on follows the box you are looking at.
  function dayForNewTask() {
    if (bucket === 'today') return todayKey()
    if (bucket === 'tomorrow') return addDaysKey(todayKey(), 1)
    return taskDate
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setAddError('Please type what needs to get done.')
      return
    }
    const day = dayForNewTask()
    if (!day) {
      setAddError('Pick a day for this task.')
      return
    }
    setBusy(true)
    setAddError('')
    const res = await api('POST', '/api/tasks', {
      title: title.trim(),
      assigneeId: isParent ? owner : currentUserSlug,
      category: category || null,
      dueDate: fromInputs(day, taskTime, ANYTIME),
    })
    setBusy(false)
    if (!res.ok) {
      setAddError(res.error)
      return
    }
    setTitle('')
    setTaskTime('')
    setCategory('')
    setShowAdd(false)
    refresh()
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (noteBusy) return
    if (!newNote.trim()) {
      setNoteError('Please write something first.')
      return
    }
    setNoteBusy(true)
    setNoteError('')
    const res = await api('POST', '/api/top-of-mind', { text: newNote.trim() })
    setNoteBusy(false)
    if (!res.ok) {
      setNoteError(res.error)
      return
    }
    setNewNote('')
    refresh()
  }

  async function removeNote(id: string) {
    setNoteError('')
    const res = await api('DELETE', `/api/top-of-mind/${id}`)
    if (!res.ok) {
      setNoteError(res.error)
      return
    }
    refresh()
  }

  const showEvents = viewFilter !== 'tasks'
  const showTasks = viewFilter !== 'events'
  const visibleEvents = showEvents ? selected.events : []
  const visibleTasks = showTasks ? selected.tasks : []
  const rowContext = { people, canAssignOthers: isParent, currentUserSlug }
  const fieldClass = 'border border-cream-border rounded-xl px-2 py-1.5 text-xs bg-white'
  const activeCat = activeCategory ? categoryById[activeCategory as keyof typeof categoryById] : undefined

  return (
    <div className="w-full px-1 sm:px-3 py-3">
      {activeCat && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-white/80">Filtered to</span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white" style={{ color: activeCat.color }}>
            {activeCat.label}
          </span>
          <Link
            href={`/dashboard?bucket=${bucket}${bucket === 'week' ? `&week=${weekOffset}` : ''}`}
            className="tap text-xs font-semibold text-white underline"
          >
            Clear
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <MetricCard bucketKey="today" label={BUCKET_LABEL.today} sub={todayLabel} value={counts.today} active={bucket === 'today'} category={activeCategory} view={viewFilter} />
        <MetricCard bucketKey="tomorrow" label={BUCKET_LABEL.tomorrow} sub={tomorrowLabel} value={counts.tomorrow} active={bucket === 'tomorrow'} category={activeCategory} view={viewFilter} />
        <MetricCard bucketKey="week" label={BUCKET_LABEL.week} sub={weekLabel} value={counts.week} active={bucket === 'week'} weekOffset={weekOffset} category={activeCategory} view={viewFilter} />
      </div>

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <p className="font-display text-[13px] font-semibold" style={{ color: BUCKET_GLOW[bucket] }}>
          {bucket === 'week' ? `This Week's Must Do — ${weekLabel}` : `${BUCKET_LABEL[bucket]}'s Must Do`}
        </p>
        {!showAdd && (
          <button
            type="button"
            onClick={openAdd}
            className="tap text-xs font-bold px-3.5 py-1 rounded-full border-2 text-white shadow-sm"
            style={{ background: BUCKET_ACCENT[bucket], borderColor: BUCKET_ACCENT[bucket] }}
          >
            + Add task
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addTask} className="bg-white border-2 rounded-2xl p-2.5 flex flex-col gap-2 mb-3" style={{ borderColor: `${BUCKET_ACCENT[bucket]}88` }}>
          <div className="flex flex-wrap gap-1.5 items-center">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              aria-label="Task title"
              maxLength={200}
              className="flex-1 min-w-[160px] border border-cream-border rounded-xl px-2.5 py-1.5 text-sm outline-none"
            />
            {bucket === 'week' && (
              <input
                type="date"
                value={taskDate}
                min={weekRange.min}
                max={weekRange.max}
                onChange={(e) => setTaskDate(e.target.value)}
                aria-label="Day"
                className={fieldClass}
              />
            )}
            <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} aria-label="Time" className={`${fieldClass} w-[100px]`} />
            {isParent && (
              <select value={owner} onChange={(e) => changeOwner(e.target.value)} aria-label="Who is it for" className={fieldClass}>
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
          {addError && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{addError}</p>}
          <div className="flex gap-2 items-center">
            <button type="submit" disabled={busy} className="tap text-white text-xs font-semibold rounded-full px-4 h-8 disabled:opacity-60" style={{ background: BUCKET_ACCENT[bucket] }}>
              {busy ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAddError('') }} className="tap text-charcoal-muted text-xs font-semibold px-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className={`card p-3 mb-4 ${pending ? 'opacity-80' : ''}`}>
        {visibleEvents.length === 0 && visibleTasks.length === 0 && (
          <p className="text-sm text-charcoal-faint">
            {bucket === 'week' && weekOffset > 0 ? 'Nothing planned for this week yet.' : 'Nothing here.'}
          </p>
        )}

        {visibleEvents.length > 0 && (
          <div className={visibleTasks.length > 0 ? 'mb-3' : ''}>
            <p className="text-[10px] font-bold tracking-widest text-charcoal-faint uppercase mb-1.5">Schedule</p>
            {visibleEvents.map((e) => (
              <EditableEventRow key={e.id} {...e} {...rowContext} showOwner={isParent} />
            ))}
          </div>
        )}

        {visibleTasks.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-widest text-charcoal-faint uppercase mb-1.5">Tasks</p>
            {visibleTasks.map((t) => (
              <EditableTaskRow key={t.id} {...t} {...rowContext} showOwner={isParent} />
            ))}
          </div>
        )}
      </div>

      {isParent && (
        <div>
          <p className="font-display text-[13px] font-semibold mb-1.5" style={{ color: '#FFCB74' }}>Mom &amp; Dad Top of Mind</p>
          <div className="bg-cream-card border rounded-card p-3" style={{ borderColor: '#FFB23866' }}>
            {topOfMind.length === 0 && <p className="text-sm text-charcoal-faint">Nothing on your mind right now.</p>}
            {topOfMind.map((note, i) => (
              <div key={note.id} className={`flex items-start justify-between gap-2 py-1.5 ${i < topOfMind.length - 1 ? 'border-b border-cream-border' : ''}`}>
                <div className="flex items-start gap-2">
                  <span className="text-gold font-bold leading-[18px]">•</span>
                  <span className="text-sm leading-[1.5] break-words">{note.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeNote(note.id)}
                  aria-label="Remove note"
                  className="tap-icon shrink-0 flex items-center justify-center rounded-full text-charcoal-faint hover:text-terracotta-dark text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
            <form onSubmit={addNote} className="flex gap-1.5 mt-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add something to keep in mind"
                aria-label="New note"
                maxLength={500}
                className="flex-1 border border-cream-border rounded-xl px-2.5 py-1.5 text-xs outline-none bg-white"
              />
              <button type="submit" disabled={noteBusy} className="tap text-white text-xs font-semibold rounded-full px-3 bg-gold disabled:opacity-60">
                Add
              </button>
            </form>
            {noteError && <p role="alert" className="mt-1 text-[11px] font-semibold text-terracotta-dark">{noteError}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  bucketKey,
  label,
  sub,
  value,
  active,
  weekOffset,
  category,
  view,
}: {
  bucketKey: Bucket
  label: string
  sub: string
  value: number
  active: boolean
  weekOffset?: number
  category?: string | null
  view: 'all' | 'events' | 'tasks'
}) {
  const accent = BUCKET_ACCENT[bucketKey]
  const glow = BUCKET_GLOW[bucketKey]
  // The category filter and the All / Events / Tasks choice follow you between boxes.
  const extra = `${category ? `&category=${category}` : ''}${view !== 'all' ? `&view=${view}` : ''}`
  const week = weekOffset ?? 0
  const href = bucketKey === 'week' ? `/dashboard?bucket=week&week=${week}${extra}` : `/dashboard?bucket=${bucketKey}${extra}`
  return (
    <div
      className="rounded-2xl overflow-hidden bg-cream-card relative flex items-center gap-3 px-3.5 py-2.5"
      style={{ border: active ? `2px solid ${accent}` : 'none', boxShadow: active ? `0 6px 18px ${accent}40` : `0 3px 12px ${accent}20`, backdropFilter: 'blur(10px)' }}
    >
      <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${glow}, ${accent})` }} />
      <div className="flex-1 min-w-0">
        <p className="font-display text-[13px] font-bold truncate" style={{ color: accent }}>{label}</p>
        <p className="text-[10px] text-charcoal-faint truncate">{sub}</p>
      </div>
      <span aria-hidden="true" className="font-display text-2xl font-bold text-charcoal leading-none shrink-0">{value}</span>
      {/* One link stretched over the whole card, so a finger anywhere on it switches the list. */}
      <Link href={href} aria-label={`${label}: ${value}`} aria-current={active ? 'true' : undefined} className="absolute inset-0 rounded-2xl" />
      {bucketKey === 'week' && (
        <div className="flex items-center gap-1 shrink-0 relative z-10">
          {week > 0 && (
            <Link
              href={`/dashboard?bucket=week&week=${week - 1}${extra}`}
              className="tap-icon rounded-full bg-white flex items-center justify-center text-sm"
              style={{ color: accent, border: `1px solid ${accent}55` }}
              aria-label="Previous week"
            >
              ‹
            </Link>
          )}
          {week < 3 && (
            <Link
              href={`/dashboard?bucket=week&week=${week + 1}${extra}`}
              className="tap-icon rounded-full bg-white flex items-center justify-center text-sm"
              style={{ color: accent, border: `1px solid ${accent}55` }}
              aria-label="Plan ahead to next week"
            >
              ›
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
