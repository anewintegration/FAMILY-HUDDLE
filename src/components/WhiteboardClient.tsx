'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api-client'
import { CloseIcon } from '@/components/RowBits'

type Post = {
  id: string
  text: string
  time: string
  authorName: string
  authorColor: string
  authorInitial: string
  canDelete: boolean
}

function PostCard({ post }: { post: Post }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const working = busy || pending

  async function remove() {
    setBusy(true)
    setError('')
    const res = await api('DELETE', `/api/whiteboard/${post.id}`)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setConfirming(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className={`card p-3.5 ${working ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-[11px] shrink-0"
          style={{ background: post.authorColor }}
        >
          {post.authorInitial}
        </div>
        <span className="text-sm font-semibold text-charcoal">{post.authorName}</span>
        <span className="text-[11px] text-charcoal-faint">{post.time}</span>
        {post.canDelete && !confirming && (
          <button
            type="button"
            onClick={() => { setError(''); setConfirming(true) }}
            aria-label="Delete post"
            className="tap-icon ml-auto flex items-center justify-center rounded-full text-charcoal-muted hover:text-terracotta-dark"
          >
            <CloseIcon />
          </button>
        )}
      </div>
      <p className="text-sm text-charcoal leading-relaxed whitespace-pre-wrap break-words">{post.text}</p>
      {confirming && (
        <div className="flex items-center gap-2 mt-2 flex-wrap bg-terracotta/10 rounded-xl px-3 py-2">
          <span className="text-xs font-semibold text-charcoal flex-1 min-w-[140px]">Delete this post?</span>
          <button type="button" onClick={remove} disabled={working} className="tap text-[11px] font-bold px-3 py-1 rounded-full bg-terracotta-dark text-white disabled:opacity-60">
            {working ? 'Deleting…' : 'Delete'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="tap text-[11px] font-bold px-3 py-1 rounded-full bg-white border border-cream-border text-charcoal">
            Keep
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-1 text-[11px] font-semibold text-terracotta-dark">{error}</p>}
    </div>
  )
}

export default function WhiteboardClient({
  initialPosts,
  currentUserName,
}: {
  initialPosts: Post[]
  currentUserName: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function addPost(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!text.trim()) {
      setError('Please write something first.')
      return
    }
    setBusy(true)
    setError('')
    const res = await api('POST', '/api/whiteboard', { text: text.trim() })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setText('')
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <div className="w-full px-3 sm:px-4 py-4">
      <p className="font-display text-xl font-semibold text-white mb-1">Family Whiteboard</p>
      <p className="text-xs text-white/80 mb-3">A running space for ideas, questions, and things on your mind. Anyone can post.</p>

      <form onSubmit={addPost} className="card p-3.5 flex flex-col gap-2 mb-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`What's on your mind, ${currentUserName}?`}
          aria-label="New post"
          rows={3}
          maxLength={2000}
          className="border border-cream-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none bg-white"
        />
        {error && <p role="alert" className="text-[11px] font-semibold text-terracotta-dark">{error}</p>}
        <button type="submit" disabled={busy || pending} className="tap self-end text-white text-sm font-semibold rounded-full px-4 py-2 bg-gold disabled:opacity-60">
          {busy ? 'Posting…' : 'Post'}
        </button>
      </form>

      <div className="flex flex-col gap-2.5">
        {initialPosts.length === 0 && <p className="text-sm text-white/80">Nothing posted yet.</p>}
        {initialPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
