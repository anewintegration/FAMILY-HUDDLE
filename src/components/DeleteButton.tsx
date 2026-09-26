'use client'

import { useRouter } from 'next/navigation'

export default function DeleteButton({
  endpoint,
  confirmText,
}: {
  endpoint: string
  confirmText: string
}) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(confirmText)) return
    await fetch(endpoint, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      aria-label="Delete"
      className="text-charcoal-faint hover:text-terracotta-dark text-sm w-6 h-6 flex items-center justify-center rounded-full shrink-0"
    >
      ✕
    </button>
  )
}
