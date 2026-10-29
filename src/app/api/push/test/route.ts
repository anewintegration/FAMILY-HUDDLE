import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendToUser } from '@/lib/push'

// "Send a test alert to my devices." One every few seconds is plenty.
const lastTest = new Map<string, number>()
const WAIT_MS = 5000

export async function POST() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const now = Date.now()
  if (now - (lastTest.get(user.id) ?? 0) < WAIT_MS) {
    return NextResponse.json({ error: 'Just a moment, then try the test again.' }, { status: 429 })
  }
  lastTest.set(user.id, now)

  const sent = await sendToUser(
    user.id,
    { title: 'Huddle alerts are working', body: `This device will now get Huddle alerts, ${user.name || 'friend'}.`, url: '/account', tag: 'test' },
    { ttl: 300 }
  )
  return NextResponse.json({ sent })
}
