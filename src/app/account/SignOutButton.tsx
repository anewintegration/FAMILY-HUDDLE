'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { forgetThisDevice } from '@/lib/pushClient'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)

  async function leave() {
    if (busy) return
    setBusy(true)
    // First stop this device's alerts for this person, so whoever signs in here next is not
    // shown them. Quick, and it can never get in the way of signing out.
    await forgetThisDevice()
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <button type="button" onClick={leave} disabled={busy} className="tap card w-full mt-3 py-2.5 text-sm font-semibold text-charcoal disabled:opacity-60">
      Sign out
    </button>
  )
}
