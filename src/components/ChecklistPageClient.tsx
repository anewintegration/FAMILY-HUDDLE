'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Item = { id: string; text: string; done: boolean }

export default function ChecklistPageClient({
  kind,
  title,
  subtitle,
  initialItems,
  placeholder,
  accent,
}: {
  kind: 'GOAL' | 'BUCKET_LIST'
  title: string
  subtitle: string
  initialItems: Item[]
  placeholder: string
  accent: string
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const res = await fetch('/api/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, kind }),
    })
    const created = await res.json()
    setItems((prev) => [...prev, { id: created.id, text: created.text, done: false }])
    setText('')
    setBusy(false)
    router.refresh()
  }

  async function toggle(id: string, done: boolean) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !done } : i)))
    await fetch(`/api/checklist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !done }),
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5">
      <p className="font-display text-xl font-semibold text-charcoal mb-1">{title}</p>
      <p className="text-xs text-charcoal-muted mb-4">{subtitle}</p>

      <form onSubmit={addItem} className="card p-3 flex gap-2 mb-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border border-cream-border rounded-md px-3 py-2 text-sm outline-none bg-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="text-white text-sm font-semibold rounded-md px-4"
          style={{ background: accent }}
        >
          +
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-sm text-charcoal-faint">Nothing here yet.</p>}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 bg-cream-card border border-cream-border rounded-lg px-3.5 py-3 shadow-sm"
          >
            <button onClick={() => toggle(item.id, item.done)} aria-label="toggle item" className="shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                {item.done ? (
                  <>
                    <circle cx="12" cy="12" r="10" fill="#7C9473" />
                    <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  <circle cx="12" cy="12" r="9" stroke="#9A9484" strokeWidth="1.5" />
                )}
              </svg>
            </button>
            <span className={`text-sm ${item.done ? 'line-through text-charcoal-faint' : ''}`}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
