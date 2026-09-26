'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })
    if (res?.error) {
      setError("That username or password doesn't match. Try again.")
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm p-8 flex flex-col gap-4">
        <div className="w-10 h-10 rounded-xl bg-charcoal flex items-center justify-center mb-1">
          <span className="font-display text-base font-bold text-terracotta">M</span>
        </div>
        <h1 className="font-display text-xl font-bold text-charcoal">Huddle</h1>
        <p className="text-sm text-charcoal-muted -mt-2">Sign in to see your dashboard</p>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-charcoal-muted">Username</label>
          <input
            className="border border-cream-border rounded-xl px-3 py-2 text-charcoal outline-none focus:border-terracotta"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="benjamin"
            autoCapitalize="none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm text-charcoal-muted">Password</label>
          <input
            type="password"
            className="border border-cream-border rounded-xl px-3 py-2 text-charcoal outline-none focus:border-terracotta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-terracotta-dark">{error}</p>}

        <button type="submit" className="bg-terracotta text-white rounded-full py-2 font-semibold">
          Sign in
        </button>
      </form>
    </main>
  )
}
