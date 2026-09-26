'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'

type Person = { id: string; name: string; slug: string }

export default function EditableTaskRow({
  id,
  title,
  status,
  dueDate,
  category,
  assigneeSlug,
  displayName,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  id: string
  title: string
  status: 'OPEN' | 'DONE'
  dueDate: string | null
  category: string | null
  assigneeSlug: string
  displayName: string
  people: Person[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editCategory, setEditCategory] = useState(category || '')
  const [editWho, setEditWho] = useState(assigneeSlug)
  const [editTime, setEditTime] = useState(dueDate ? new Date(dueDate).toTimeString().slice(0, 5) : '09:00')

  const cat = category ? categoryById[category as keyof typeof categoryById] : null
  const statusBadge = taskStatus({ status, dueDate: dueDate ? new Date(dueDate) : null })
  const categoryOptions = categoriesForSlug(canAssignOthers ? editWho : currentUserSlug)

  async function toggleDone() {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status === 'OPEN' ? 'DONE' : 'OPEN' }),
    })
    router.refresh()
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || busy) return
    setBusy(true)
    const dateOnly = dueDate ? new Date(dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    const newDueDate = new Date(`${dateOnly}T${editTime || '09:00'}`).toISOString()
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        category: editCategory || null,
        dueDate: newDueDate,
        ...(canAssignOthers ? { assigneeId: editWho } : {}),
      }),
    })
    setBusy(false)
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-2 px-3 py-3 mb-2 bg-white border-2 border-terracotta rounded-2xl">
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-sm" />
        <div className="flex gap-2 flex-wrap">
          <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs flex-1" />
          {canAssignOthers && (
            <select value={editWho} onChange={(e) => { setEditWho(e.target.value); setEditCategory('') }} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs flex-1">
              {people.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              <option value="parents">Parents</option>
              <option value="family">Family</option>
            </select>
          )}
          {categoryOptions.length > 0 && (
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-xs flex-1">
              <option value="">No category</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 bg-terracotta text-white rounded-full py-1.5 text-xs font-bold">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="text-charcoal-faint text-xs px-3">Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-2xl">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={toggleDone}
          aria-label={status === 'OPEN' ? 'Mark done' : 'Mark open'}
          className="w-4 h-4 rounded-full border shrink-0"
          style={{ borderColor: status === 'DONE' ? '#00C2A8' : '#9599A6', background: status === 'DONE' ? '#00C2A8' : 'transparent' }}
        />
        {dueDate && (
          <span className="text-xs font-semibold text-charcoal-muted shrink-0">
            {new Date(dueDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
        <span className={`text-sm truncate ${status === 'DONE' ? 'line-through text-charcoal-faint' : ''}`}>{displayName}</span>
        {cat && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: cat.color, background: `${cat.color}1A` }}>{cat.label}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {statusBadge && (
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
        )}
        <button onClick={() => setEditing(true)} aria-label="Edit task" className="text-charcoal-faint hover:text-terracotta text-xs w-6 h-6 flex items-center justify-center rounded-full">
          ✎
        </button>
        <button onClick={remove} aria-label="Delete task" className="text-charcoal-faint hover:text-terracotta-dark text-sm w-6 h-6 flex items-center justify-center rounded-full">
          ✕
        </button>
      </div>
    </div>
  )
}
