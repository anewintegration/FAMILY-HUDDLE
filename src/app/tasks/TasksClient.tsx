'use client'

import { useState } from 'react'
import { categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'

type Task = {
  id: string
  title: string
  status: 'OPEN' | 'DONE'
  dueDate: string | null
  category: string | null
  assigneeName: string
  assigneeSlug: string
}

type Person = { id: string; name: string; slug: string }

export default function TasksClient({
  initialTasks,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  initialTasks: Task[]
  people: Person[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const [tasks, setTasks] = useState(initialTasks)
  const [title, setTitle] = useState('')
  const [assigneeSlug, setAssigneeSlug] = useState(currentUserSlug)
  const [category, setCategory] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<'OPEN' | 'DONE'>('OPEN')

  async function toggleTask(task: Task) {
    const newStatus = task.status === 'OPEN' ? 'DONE' : 'OPEN'
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, assigneeId: assigneeSlug, category: category || null, dueDate: dueDate || null }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Couldn't add that task: ${err.error || res.statusText}`)
      return
    }
    const created = await res.json()
    const person = people.find((p) => p.slug === assigneeSlug)
    setTasks((prev) => [
      {
        id: created.id,
        title,
        status: 'OPEN',
        dueDate: dueDate || null,
        category: category || null,
        assigneeName: person?.name ?? 'Parents',
        assigneeSlug,
      },
      ...prev,
    ])
    setTitle('')
    setCategory('')
    setDueDate('')
  }

  const visible = tasks.filter((t) => t.status === filter)
  const categoryOptions = categoriesForSlug(canAssignOthers ? assigneeSlug : currentUserSlug)

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={addTask} className="card p-3 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          className="border border-cream-border rounded-lg px-3 py-2 text-sm text-charcoal outline-none focus:border-sage bg-white"
        />
        <div className="flex gap-2 flex-wrap">
          {canAssignOthers && (
            <select
              value={assigneeSlug}
              onChange={(e) => {
                setAssigneeSlug(e.target.value)
                setCategory('')
              }}
              className="border border-cream-border rounded-lg px-2 py-2 text-sm text-charcoal flex-1"
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
              className="border border-cream-border rounded-lg px-2 py-2 text-sm text-charcoal flex-1"
            >
              <option value="">No category</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border border-cream-border rounded-lg px-2 py-2 text-sm text-charcoal flex-1"
          />
        </div>
        <button
          type="submit"
          className="bg-gradient-to-br from-sage to-sage-dark text-white rounded-lg py-2 text-sm font-semibold shadow-sm"
        >
          Add task
        </button>
      </form>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('OPEN')}
          className={`text-xs px-3 py-1.5 rounded-lg ${
            filter === 'OPEN' ? 'bg-cream-border font-semibold text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('DONE')}
          className={`text-xs px-3 py-1.5 rounded-lg ${
            filter === 'DONE' ? 'bg-cream-border font-semibold text-charcoal' : 'text-charcoal-muted'
          }`}
        >
          Done
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visible.length === 0 && <p className="text-sm text-charcoal-faint">Nothing here.</p>}
        {visible.map((t) => {
          const status = taskStatus({ status: t.status, dueDate: t.dueDate ? new Date(t.dueDate) : null })
          return (
            <div key={t.id} className="flex items-center justify-between card px-3.5 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTask(t)}
                  aria-label={t.status === 'OPEN' ? 'Mark done' : 'Mark open'}
                  className={`w-4 h-4 rounded border shrink-0 ${
                    t.status === 'DONE' ? 'bg-sage border-sage' : 'border-cream-border'
                  }`}
                />
                <span className={`text-sm ${t.status === 'DONE' ? 'text-charcoal-faint line-through' : 'text-charcoal'}`}>
                  {canAssignOthers ? `${t.assigneeName}: ${t.title}` : t.title}
                </span>
                {t.category && categoryById[t.category as keyof typeof categoryById] && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      color: categoryById[t.category as keyof typeof categoryById].color,
                      background: `${categoryById[t.category as keyof typeof categoryById].color}1A`,
                    }}
                  >
                    {categoryById[t.category as keyof typeof categoryById].label}
                  </span>
                )}
              </div>
              {status && (
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${status.className}`}>
                  {status.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
