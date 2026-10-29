import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanKey, getVapid, isPushEndpoint } from '@/lib/push'
import { readBody } from '@/lib/validate'

// Answers depend on who is signed in, so they are never saved at build time.
export const dynamic = 'force-dynamic'

// A person rarely has more than a phone, a tablet and a computer or two.
const MAX_DEVICES_PER_PERSON = 10

// The key a device needs in order to sign up for this server's alerts.
export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  try {
    const { publicKey } = await getVapid()
    return NextResponse.json({ publicKey })
  } catch {
    return NextResponse.json({ error: 'Alerts are not ready on the server yet. Please try again in a minute.' }, { status: 503 })
  }
}

// "This phone / computer would like alerts for me."
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await readBody(req)
  const endpoint = body.endpoint
  const p256dh = cleanKey(body.keys?.p256dh, 65)
  const auth = cleanKey(body.keys?.auth, 16)
  if (!isPushEndpoint(endpoint) || !p256dh || !auth) {
    return NextResponse.json({ error: 'This device cannot receive alerts.' }, { status: 400 })
  }
  const userAgent = (req.headers.get('user-agent') || '').slice(0, 300) || null

  // One row per device. A device that was set up for someone else before now belongs to whoever
  // is signed in on it.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh, auth, userAgent, userId: user.id },
    update: { p256dh, auth, userAgent, userId: user.id },
  })

  const mine = await prisma.pushSubscription.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  const extra = mine.slice(MAX_DEVICES_PER_PERSON).filter((d) => d.endpoint !== endpoint)
  if (extra.length > 0) await prisma.pushSubscription.deleteMany({ where: { id: { in: extra.map((d) => d.id) } } })

  return NextResponse.json({ ok: true })
}

// "Stop sending alerts to this device." (You can only remove your own.)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await readBody(req)
  if (typeof body.endpoint !== 'string' || body.endpoint.length === 0 || body.endpoint.length > 2000) {
    return NextResponse.json({ error: 'Which device?' }, { status: 400 })
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } })
  return NextResponse.json({ ok: true })
}
