'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { categoriesForSlug, categoryById } from '@/lib/categories'

type Person = { id: string; name: string; slug: string; color: string }

export default function EditableEventRow({
  id,
  title,
  time,
  category,
  ownerName,
  ownerSlug,
  ownerColor,
  people,
  canAssignOthers,
  currentUserSlug,
}: {
  id: string
  title: string
  time: string
  category: string | null
  ownerName: string
  ownerSlug: string
  ownerColor: string
  people: Person[]
  canAssignOthers: boolean
  currentUserSlug: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const [editCategory, setEditCategory] = useState(category || '')
  const [editWho, setEditWho] = useState(ownerSlug)

  const cat = category ? categoryById[category as keyof typeof categoryById] : null
  const categoryOptions = categoriesForSlug(canAssignOthers ? editWho : currentUserSlug)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!editTitle.trim() || busy) return
    setBusy(true)
    await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        category: editCategory || null,
        ...(canAssignOthers ? { ownerId: editWho } : {}),
      }),
    })
    setBusy(false)
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Delete this event?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-2 px-3 py-3 mb-2 bg-white border-2 border-category-sports rounded-2xl">
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="border border-cream-border rounded-xl px-2 py-1.5 text-sm" />
        <div className="flex gap-2 flex-wrap">
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
          <button type="submit" disabled={busy} className="flex-1 bg-category-sports text-white rounded-full py-1.5 text-xs font-bold">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="text-charcoal-faint text-xs px-3">Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-2xl">
      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: ownerColor }}>
        {ownerName[0]}
      </div>
      <span className="text-xs font-semibold text-charcoal-muted w-16 shrink-0">{time}</span>
      <span className="text-sm flex-1 truncate">{title}</span>
      {cat && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: cat.color, background: `${cat.color}1A` }}>{cat.label}</span>
      )}
      <button onClick={() => setEditing(true)} aria-label="Edit event" className="text-charcoal-faint hover:text-category-sports text-xs w-6 h-6 flex items-center justify-center rounded-full shrink-0">
        ✎
      </button>
      <button onClick={remove} aria-label="Delete event" className="text-charcoal-faint hover:text-terracotta-dark text-sm w-6 h-6 flex items-center justify-center rounded-full shrink-0">
        ✕
      </button>
    </div>
  )
}
