'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug } from '@/lib/categories'
import { formatShortDate, formatTime, fromInputs, isToday, toDateInput, toTimeInput } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { EventRowData, PersonOption } from '@/lib/rows'
import { CategoryBadge, CloseIcon, PencilIcon, WhoOptions } from '@/components/RowBits'

type Mode = 'view' | 'edit' | 'confirm' | 'reschedule'

// One event, the same on every screen: edit it, move it when it has already
// happened, or delete it. What shows up depends on what the viewer may change.
export default function EditableEventRow({
  id,
  title,
  startTime,
  category,
  ownerSlug,
  ownerLabel,
  ownerColor,
  canModify,
  people,
  canAssignOthers,
  currentUserSlug,
  showDate = 'auto',
  showOwner = false,
}: EventRowData & {
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
  const [fWho, setFWho] = useState(ownerSlug)
  const [fCat, setFCat] = useState(category || '')

  const started = new Date(startTime)
  const happened = started.getTime() < Date.now()
  const showDateChip = showDate === 'always' || (showDate === 'auto' && !isToday(startTime))
  const working = busy || pending

  const categoryOptions = categoriesForSlug(canAssignOthers ? fWho : currentUserSlug)

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function run(method: 'PATCH' | 'DELETE', body?: unknown) {
    setBusy(true)
    setError('')
    const res = await api(method, `/api/events/${id}`, body)
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
    setFDate(toDateInput(startTime))
    setFTime(toTimeInput(startTime))
    setFWho(ownerSlug)
    setFCat(category || '')
    setError('')
    setMode('edit')
  }

  function openReschedule() {
    setFDate(toDateInput(startTime))
    setFTime(toTimeInput(startTime))
    setError('')
    setMode('reschedule')
  }

  function changeWho(slug: string) {
    setFWho(slug)
    if (!categoriesForSlug(slug).some((c) => c.id === fCat)) setFCat('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (working) return
    if (!fTitle.trim()) {
      setError('Please give the event a title.')
      return
    }
    if (!fDate) {
      setError('Please pick a date for the event.')
      return
    }
    const body: Record<string, unknown> = {
      title: fTitle.trim(),
      category: fCat || null,
      startTime: fromInputs(fDate, fTime, '09:00'),
    }
    if (canAssignOthers) body.ownerId = fWho
    if (await run('PATCH', body)) setMode('view')
  }

  async function saveReschedule(e: React.FormEvent) {
    e.preventDefault()
    if (working) return
    if (!fDate) {
      setError('Pick a new day first.')
      return
    }
    if (await run('PATCH', { startTime: fromInputs(fDate, fTime, '09:00') })) setMode('view')
  }

  async function remove() {
    if (await run('DELETE')) setMode('view')
  }

  const fieldClass = 'border border-cream-border rounded-xl px-2 py-1.5 text-xs bg-white'

  if (mode === 'edit') {
    return (
      <form onSubmit={save} className="flex flex-col gap-2 px-3 py-3 mb-2 bg-white border-2 border-category-sports rounded-2xl">
        <input
          value={fTitle}
          onChange={(e) => setFTitle(e.target.value)}
          aria-label="Event title"
          maxLength={200}
          className="border border-cream-border rounded-xl px-2.5 py-1.5 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="Event date" className={`${fieldClass} flex-1 min-w-[130px]`} />
          <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} aria-label="Event time" className={`${fieldClass} flex-1 min-w-[100px]`} />
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
          <button type="submit" disabled={working} className="tap flex-1 bg-category-sports text-white rounded-full py-1.5 text-xs font-bold disabled:opacity-60">
            {working ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setMode('view')} className="tap text-charcoal-muted text-xs font-semibold px-3">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className={`mb-2 bg-white border border-cream-border rounded-2xl ${working ? 'opacity-60' : ''}`}>
      <div className={`flex items-center gap-2 px-2.5 py-1.5 ${happened ? 'opacity-60' : ''}`}>
        <div
          className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
          style={{ background: ownerColor }}
          title={ownerLabel}
        >
          {ownerLabel[0]}
        </div>

        <div className="min-w-0 flex-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
          {showDateChip && <span className="text-xs font-semibold text-charcoal-muted shrink-0">{formatShortDate(startTime)}</span>}
          <span className="text-xs font-semibold text-charcoal-muted shrink-0">{formatTime(startTime)}</span>
          <span className="text-sm text-charcoal break-words">{showOwner ? `${ownerLabel}: ${title}` : title}</span>
          <CategoryBadge id={category} />
        </div>

        {canModify && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={openEditor}
              disabled={working}
              aria-label="Edit event"
              className="tap-icon flex items-center justify-center rounded-full text-charcoal-muted hover:text-category-sports"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() => { setError(''); setMode('confirm') }}
              disabled={working}
              aria-label="Delete event"
              className="tap-icon flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta-dark"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>

      {mode === 'view' && happened && canModify && (
        <div className="flex items-center gap-2 px-3 pb-2 pl-10 flex-wrap">
          <span className="text-[11px] text-charcoal-muted">Happened —</span>
          <button
            type="button"
            onClick={openReschedule}
            disabled={working}
            className="tap text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-category-sports text-category-sports bg-white"
          >
            Reschedule?
          </button>
        </div>
      )}

      {mode === 'reschedule' && (
        <form onSubmit={saveReschedule} className="flex items-center gap-2 px-3 pb-2.5 pl-10 flex-wrap">
          <span className="text-[11px] text-charcoal-muted">Move to</span>
          <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} aria-label="New date" className={fieldClass} />
          <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} aria-label="New time" className={fieldClass} />
          <button type="submit" disabled={working} className="tap text-[11px] font-bold px-3 py-0.5 rounded-full bg-category-sports text-white disabled:opacity-60">
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
