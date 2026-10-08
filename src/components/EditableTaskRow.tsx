'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'
import { ANYTIME, formatShortDate, formatTime, fromInputs, hasClockTime, isToday, toDateInput, toTimeInput, todayKey } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { PersonOption, TaskRowData } from '@/lib/rows'
import { CategoryBadge, CheckCircle, CloseIcon, PencilIcon, WhoOptions } from '@/components/RowBits'

type Mode = 'view' | 'edit' | 'confirm' | 'reschedule'

// One task, the same on every screen: check it off, edit it, reschedule it when it
// is past due, or delete it. What shows up depends on what the viewer may change.
export default function EditableTaskRow({
  id,
  title,
  status,
  dueDate,
  category,
  assigneeSlug,
  assigneeLabel,
  canModify,
  canToggle,
  people,
  canAssignOthers,
  currentUserSlug,
  showDate = 'auto',
  showOwner = false,
}: TaskRowData & {
  people: PersonOption[]
  canAssignOthers: boolean
  currentUserSlug: string
  /** 'auto' shows the date unless it is today; 'always' / 'never' force it. */
  showDate?: 'auto' | 'always' | 'never'
  /** Put "Dad:" in front of the title. */
  showOwner?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>('view')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fTitle, setFTitle] = useState(title)
  const [fDate, setFDate] = useState('')
  const [fTime, setFTime] = useState('')
  const [fWho, setFWho] = useState(assigneeSlug)
  const [fCat, setFCat] = useState(category || '')

  const due = dueDate ? new Date(dueDate) : null
  const badge = taskStatus({ status, dueDate: due })
  const overdue = badge?.label === 'Overdue'
  const showDateChip = !!dueDate && (showDate === 'always' || (showDate === 'auto' && !isToday(dueDate)))
  const showTimeChip = !!dueDate && hasClockTime(dueDate)
  const working = busy || pending

  const categoryOptions = categoriesForSlug(canAssignOthers ? fWho : currentUserSlug)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  // One door for every change: reports a plain-English problem if it fails, and
  // re-reads the page when it works (or when the task has already vanished).
  async function run(method: 'PATCH' | 'DELETE', body?: unknown) {
    setBusy(true)
    setError('')
    const res = await api(method, `/api/tasks/${id}`, body)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      if (res.status === 404) refresh()
      return false
    }
    refresh()
    return true
  }

  function openEditor() {
    setFTitle(title)
    setFDate(toDateInput(dueDate))
    setFTime(dueDate && hasClockTime(dueDate) ? toTimeInput(dueDate) : '')
    setFWho(assigneeSlug)
    setFCat(category || '')
    setError('')
    setMode('edit')
  }

  function openReschedule() {
    setFDate(todayKey())
    setFTime('')
    setError('')
    setMode('reschedule')
  }

  function changeWho(slug: string) {
    setFWho(slug)
    // Keep the category if the new person can have it; otherwise clear it.
    if (!categoriesForSlug(slug).some((c) => c.id === fCat)) setFCat('')
  }

  async function toggle() {
    await run('PATCH', { status: status === 'OPEN' ? 'DONE' : 'OPEN' })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (working) return
    if (!fTitle.trim()) {
      setError('Please give the task a title.')
      return
    }
    const body: Record<string, unknown> = {
      title: fTitle.trim(),
      category: fCat || null,
      dueDate: fDate ? fromInputs(fDate, fTime, ANYTIME) : null,
    }
    if (canAssignOthers) body.assigneeId = fWho
    if (await run('PATCH', body)) setMode('view')
  }

  async function saveReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (working) return
    if (!fDate) {
      setError('Pick a new day first.')
      return
    }
    if (await run('PATCH', { dueDate: fromInputs(fDate, fTime, ANYTIME) })) setMode('view')
  }

  async function remove() {
    if (await run('DELETE')) setMode('view')
  }

  const fieldClass = 'border border-cream-border rounded-xl px-2 py-1.5 text-xs bg-white'

  if (mode === 'edit') {
    return (
      <form onSubmit={save} className="flex flex-col gap-2 px-3 py-3 mb-2 bg-white border-2 border-terracotta rounded-2xl">
        <input
          value={fTitle}
          onChange={(e) => setFTitle(e.target.value)}
          aria-label="Task title"
          maxLength={200}
          className="border border-cream-border rounded-xl px-2.5 py-1.5 text-sm"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Due date" className={`${fieldClass} flex-1 min-w-[130px]`} />
          <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} aria-label="Due time" className={`${fieldClass} flex-1 min-w-[100px]`} />
          {fDate && (
            <button type="button" onClick={() => { setFDate(''); setFTime('') }} className="tap text-[11px] font-semibold text-charcoal-muted underline">
              No date
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {canAssignOthers && (
            <select value={fWho} onChange={(e) => changeWho(e.target.value)} aria-label="Who is it for" className={`${fieldClass} flex-1 min-w-[110px]`}>
              <WhoOptions people={people} />
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Category" className={`${fieldClass} flex-1 min-w-[110px]`}>
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
          <button type="submit" disabled={working} className="tap flex-1 bg-terracotta text-white rounded-full py-1.5 text-xs font-bold disabled:opacity-60">
            {working ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setMode('view')} className="tap text-charcoal-muted text-xs font-semibold px-3">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  const cat = category ? categoryById[category as keyof typeof categoryById] : undefined

  return (
    <div className={`mb-2 bg-white border border-cream-border rounded-2xl ${working ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        {canToggle ? (
          <button
            type="button"
            onClick={toggle}
            disabled={working}
            aria-label={status === 'OPEN' ? 'Mark done' : 'Mark not done'}
            className="tap-icon shrink-0 flex items-center justify-center rounded-full"
          >
            <CheckCircle done={status === 'DONE'} />
          </button>
        ) : (
          <span className="tap-icon shrink-0 flex items-center justify-center opacity-50">
            <CheckCircle done={status === 'DONE'} />
          </span>
        )}

        <div className="min-w-0 flex-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
          {showDateChip && dueDate && <span className="text-xs font-semibold text-charcoal-muted shrink-0">{formatShortDate(dueDate)}</span>}
          {showTimeChip && dueDate && <span className="text-xs font-semibold text-charcoal-muted shrink-0">{formatTime(dueDate)}</span>}
          <span className={`text-sm break-words ${status === 'DONE' ? 'line-through text-charcoal-faint' : 'text-charcoal'}`}>
            {showOwner ? `${assigneeLabel}: ${title}` : title}
          </span>
          {cat && <CategoryBadge id={category} />}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {badge && (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
          )}
          {canModify && (
            <>
              <button
                type="button"
                onClick={openEditor}
                disabled={working}
                aria-label="Edit task"
                className="tap-icon flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={() => { setError(''); setMode('confirm') }}
                disabled={working}
                aria-label="Delete task"
                className="tap-icon flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta-dark"
              >
                <CloseIcon />
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'view' && overdue && (canModify || canToggle) && (
        <div className="flex items-center gap-2 px-3 pb-2 pl-11 flex-wrap">
          <span className="text-[11px] text-charcoal-muted">Past due —</span>
          {canModify && (
            <button
              type="button"
              onClick={openReschedule}
              disabled={working}
              className="tap text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-terracotta-dark text-terracotta-dark bg-white"
            >
              Reschedule
            </button>
          )}
          {canToggle && (
            <button type="button" onClick={toggle} disabled={working} className="tap text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sage-dark text-white">
              Mark done
            </button>
          )}
        </div>
      )}

      {mode === 'reschedule' && (
        <form onSubmit={saveReschedule} className="flex items-center gap-2 px-3 pb-2.5 pl-11 flex-wrap">
          <span className="text-[11px] text-charcoal-muted">Move to</span>
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="New date" className={fieldClass} />
          <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} aria-label="New time" className={fieldClass} />
          <button type="submit" disabled={working} className="tap text-[11px] font-bold px-3 py-0.5 rounded-full bg-terracotta text-white disabled:opacity-60">
            Save
          </button>
          <button type="button" onClick={() => setMode('view')} className="tap text-[11px] font-semibold text-charcoal-muted px-1">
            Cancel
          </button>
        </form>
      )}

      {mode === 'confirm' && (
        <div className="flex items-center gap-2 px-3 py-2 flex-wrap bg-terracotta/10 rounded-b-2xl">
          <span className="text-xs font-semibold text-charcoal flex-1 min-w-[140px]">Delete “{title}”?</span>
          <button type="button" onClick={remove} disabled={working} className="tap text-[11px] font-bold px-3 py-1 rounded-full bg-terracotta-dark text-white disabled:opacity-60">
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
