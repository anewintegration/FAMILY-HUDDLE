'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="tap card w-full mt-3 py-2.5 text-sm font-semibold text-charcoal"
    >
      Sign out
    </button>
  )
}
