'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug } from '@/lib/categories'
import { ANYTIME, fromInputs } from '@/lib/dates'
import { api } from '@/lib/api-client'
import type { PersonOption, TaskRowData } from '@/lib/rows'
import EditableTaskRow from '@/components/EditableTaskRow'
import { WhoOptions } from '@/components/RowBits'

export default function TasksClient({
  tasks,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  tasks: TaskRowData[]
  people: PersonOption[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [assigneeSlug, setAssigneeSlug] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [filter, setFilter] = useState<'OPEN' | 'DONE'>('OPEN')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const categoryOptions = categoriesForSlug(canAssignOthers ? assigneeSlug : currentUserSlug)
  const openCount = tasks.filter((t) => t.status === 'OPEN').length
  const doneCount = tasks.length - openCount
  const visible = tasks.filter((t) => t.status === filter)
  const rowContext = { people, canAssignOthers, currentUserSlug }

  function changeAssignee(slug: string) {
    setAssigneeSlug(slug)
    if (!categoriesForSlug(slug).some((c) => c.id === category)) setCategory('')
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!title.trim()) {
      setError('Please type what needs to get done.')
      return
    }
    setBusy(true)
    setError('')
    // A date with no time means "any time that day"; no date at all means no due date.
    const res = await api('POST', '/api/tasks', {
      title: title.trim(),
      assigneeId: canAssignOthers ? assigneeSlug : currentUserSlug,
      category: category || null,
      dueDate: dueDate ? fromInputs(dueDate, dueTime, ANYTIME) : null,
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setTitle('')
    setCategory('')
    setDueDate('')
    setDueTime('')
    startTransition(() => {
      router.refresh()
    })
  }

  const fieldClass = 'border border-cream-border rounded-xl px-2 py-2 text-sm text-charcoal bg-white flex-1 min-w-[110px]'
  const tabClass = (on: boolean) =>
    `tap text-xs px-3.5 py-1.5 rounded-full font-semibold ${on ? 'bg-white text-charcoal shadow-sm' : 'bg-white/20 text-white'}`

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={addTask} className="card p-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="Task title"
          maxLength={200}
          className="border border-cream-border rounded-xl px-3 py-2 text-sm text-charcoal outline-none focus:border-terracotta bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {canAssignOthers && (
            <select value={assigneeSlug} onChange={(e) => changeAssignee(e.target.value)} aria-label="Who is it for" className={fieldClass}>
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
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Due date" className={fieldClass} />
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} aria-label="Due time" className={fieldClass} />
        </div>
        {error && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{error}</p>}
        <button type="submit" disabled={busy} className="tap bg-terracotta text-white rounded-full py-2 text-sm font-semibold disabled:opacity-60">
          {busy ? 'Adding…' : 'Add task'}
        </button>
      </form>

      <div className="flex gap-2">
        <button type="button" onClick={() => setFilter('OPEN')} aria-pressed={filter === 'OPEN'} className={tabClass(filter === 'OPEN')}>
          Open ({openCount})
        </button>
        <button type="button" onClick={() => setFilter('DONE')} aria-pressed={filter === 'DONE'} className={tabClass(filter === 'DONE')}>
          Done ({doneCount})
        </button>
      </div>

      <div className={`card p-3 ${pending ? 'opacity-80' : ''}`}>
        {visible.length === 0 && <p className="text-sm text-charcoal-faint">{filter === 'OPEN' ? 'All caught up.' : 'Nothing finished yet.'}</p>}
        {visible.map((t) => (
          <EditableTaskRow key={t.id} {...t} {...rowContext} showDate="always" showOwner={canAssignOthers} />
        ))}
      </div>
    </div>
  )
}
