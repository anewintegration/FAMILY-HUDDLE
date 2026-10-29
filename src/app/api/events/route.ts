import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { eventVisibilityWhere } from '@/lib/data'
import { cleanTitle, isCategory, readBody, readDate } from '@/lib/validate'
import { actorOf, eventItem, notifyAdded } from '@/lib/alerts'
import { SERIES_TRANSACTION, readRepeat, repeatSummary } from '@/lib/recurrence'

// Answers depend on who is signed in, so they are never saved at build time.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const events = await prisma.event.findMany({
    where: eventVisibilityWhere(user.role, user.id),
    include: { owner: true },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const body = await readBody(req)

  const title = cleanTitle(body.title)
  if (!title) return NextResponse.json({ error: 'Please give the event a title (up to 200 characters).' }, { status: 400 })

  const start = readDate(body.startTime)
  if (!start.ok || !start.value) {
    return NextResponse.json({ error: 'Please pick a date and time for the event.' }, { status: 400 })
  }

  if (body.category && !isCategory(body.category)) {
    return NextResponse.json({ error: 'That category is not valid.' }, { status: 400 })
  }

  // "Repeat" + "repeat until": the checks (and their plain-English refusals) live in lib/recurrence.ts.
  const repeat = readRepeat(body, start.value, 'event')
  if (!repeat.ok) return NextResponse.json({ error: repeat.error }, { status: 400 })
  const plan = repeat.plan

  const requestedSlug = user.role === 'PARENT' ? body.ownerId || user.slug : user.slug
  const sharedParents = user.role === 'PARENT' && requestedSlug === 'parents'
  const sharedFamily = user.role === 'PARENT' && requestedSlug === 'family'

  let ownerId: string | null = null
  if (!sharedParents && !sharedFamily) {
    const owner = await prisma.user.findUnique({ where: { slug: String(requestedSlug) } })
    if (!owner) {
      return NextResponse.json({ error: `There is no one called "${requestedSlug}".` }, { status: 400 })
    }
    ownerId = owner.id
  }

  const common = { title, category: body.category || null, ownerId, sharedParents, sharedFamily }

  if (!plan) {
    const event = await prisma.event.create({ data: { ...common, startTime: start.value } })
    notifyAdded(eventItem(event), actorOf(user))
    return NextResponse.json(event)
  }

  // A repeat is one ordinary event for every date, written together or not at all, and announced once.
  const run = { seriesId: randomUUID(), repeat: plan.kind }
  const first = await prisma.$transaction(async (tx) => {
    const created = await tx.event.create({ data: { ...common, ...run, startTime: plan.dates[0] } })
    await tx.event.createMany({ data: plan.dates.slice(1).map((startTime) => ({ ...common, ...run, startTime })) })
    return created
  }, SERIES_TRANSACTION)
  notifyAdded({ ...eventItem(first), repeatNote: repeatSummary(plan.kind, plan.untilKey) }, actorOf(user))
  return NextResponse.json({ ...first, count: plan.dates.length })
}
