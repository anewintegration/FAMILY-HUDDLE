'use client'

import { useState } from 'react'

type Post = { id: string; text: string; time: string; authorName: string; authorColor: string; authorInitial: string }

export default function WhiteboardClient({
  initialPosts,
  currentUserName,
}: {
  initialPosts: Post[]
  currentUserName: string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function addPost(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const res = await fetch('/api/whiteboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    const created = await res.json()
    setPosts((prev) => [
      {
        id: created.id,
        text: created.text,
        time: 'Just now',
        authorName: created.author.displayName,
        authorColor: created.author.color,
        authorInitial: created.author.displayName[0],
      },
      ...prev,
    ])
    setText('')
    setBusy(false)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <p className="font-display text-xl font-semibold text-charcoal mb-1">Family Whiteboard</p>
      <p className="text-xs text-charcoal-muted mb-4">
        A running space for ideas, questions, and things on your mind. Anyone can post.
      </p>

      <form onSubmit={addPost} className="bg-cream-card border rounded-card p-3.5 flex flex-col gap-2 mb-4 shadow-sm" style={{ borderColor: '#D4A24C66' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`What's on your mind, ${currentUserName}?`}
          rows={3}
          className="border border-cream-border rounded-md px-3 py-2.5 text-sm outline-none resize-none bg-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="self-end text-white text-sm font-semibold rounded-md px-4 py-2 bg-gradient-to-br from-gold to-gold-dark shadow-sm"
        >
          Post
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {posts.length === 0 && <p className="text-sm text-charcoal-faint">Nothing posted yet.</p>}
        {posts.map((post) => (
          <div key={post.id} className="card p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-[11px] shrink-0"
                style={{ background: post.authorColor }}
              >
                {post.authorInitial}
              </div>
              <span className="text-sm font-semibold text-charcoal">{post.authorName}</span>
              <span className="text-[11px] text-charcoal-faint">{post.time}</span>
            </div>
            <p className="text-sm text-charcoal leading-relaxed">{post.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
