import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanTitle, isCategory, readBody, readDate, readScope } from '@/lib/validate'
import { actorOf, eventItem, notifyChanged, notifyRemoved, notifyRepeatStarted } from '@/lib/alerts'
import { SERIES_TRANSACTION, datesForFollowing, readRepeat, repeatSummary } from '@/lib/recurrence'
import type { RepeatPlan } from '@/lib/recurrence'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const event = await prisma.event.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ error: 'That event no longer exists.' }, { status: 404 })

  const isParent = user.role === 'PARENT'
  // Kids can only change their own events.
  if (!isParent && event.ownerId !== user.id) {
    return NextResponse.json({ error: 'Only a parent can change that event.' }, { status: 403 })
  }

  const body = await readBody(req)

  // For an event that repeats: change just this one (the default), or this one and every later one.
  const scope = readScope(body.scope)
  if (!scope) return NextResponse.json({ error: 'That choice is not valid.' }, { status: 400 })

  const data: any = {}

  if (body.title !== undefined) {
    const title = cleanTitle(body.title)
    if (!title) return NextResponse.json({ error: 'Please give the event a title (up to 200 characters).' }, { status: 400 })
    data.title = title
  }

  if (body.startTime !== undefined) {
    const start = readDate(body.startTime)
    if (!start.ok || !start.value) {
      return NextResponse.json({ error: 'Please pick a date and time for the event.' }, { status: 400 })
    }
    data.startTime = start.value
  }

  if (body.category !== undefined) {
    if (body.category && !isCategory(body.category)) {
      return NextResponse.json({ error: 'That category is not valid.' }, { status: 400 })
    }
    data.category = body.category || null
  }

  if (isParent && body.ownerId !== undefined) {
    if (body.ownerId === 'parents') {
      data.ownerId = null
      data.sharedParents = true
      data.sharedFamily = false
    } else if (body.ownerId === 'family') {
      data.ownerId = null
      data.sharedParents = false
      data.sharedFamily = true
    } else {
      const owner = await prisma.user.findUnique({ where: { slug: String(body.ownerId) } })
      if (!owner) return NextResponse.json({ error: 'There is no one by that name.' }, { status: 400 })
      data.ownerId = owner.id
      data.sharedParents = false
      data.sharedFamily = false
    }
  }

  // A one-off event can be made to repeat from here on (the same two boxes as when adding one).
  // How an existing repeat comes round is not changed afterwards: delete the later ones and add a new repeat.
  let plan: RepeatPlan | null = null
  if (body.repeat !== undefined && body.repeat !== null && body.repeat !== '') {
    if (event.seriesId) {
      return NextResponse.json(
        { error: 'That event already repeats. To change how it repeats, delete the ones after it and add a new repeat.' },
        { status: 400 }
      )
    }
    const check = readRepeat(body, data.startTime !== undefined ? data.startTime : event.startTime, 'event')
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
    plan = check.plan
  }

  // "This and all following": the later events of the same repeat take over the changes that make sense for all of them.
  // A kid only ever touches their own.
  const later =
    scope === 'following' && event.seriesId && event.repeat
      ? await prisma.event.findMany({ where: { seriesId: event.seriesId, startTime: { gt: event.startTime } }, orderBy: { startTime: 'asc' } })
      : []
  const shared: any = {}
  for (const key of ['title', 'category', 'ownerId', 'sharedParents', 'sharedFamily']) if (key in data) shared[key] = data[key]
  const newDates =
    later.length > 0 && event.repeat && data.startTime
      ? datesForFollowing(event.repeat, event.startTime, data.startTime, later.map((e) => e.startTime))
      : null
  const touched = later
    .map((e, i) => ({ e, change: { ...shared, ...(newDates ? { startTime: newDates[i] } : {}) } }))
    .filter(({ e, change }) => Object.keys(change).length > 0 && (isParent || e.ownerId === user.id))

  let updated
  if (plan) {
    const made = plan
    const run = { seriesId: randomUUID(), repeat: made.kind }
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.event.update({ where: { id: params.id }, data: { ...data, ...run } })
      const rest = made.dates.slice(1).map((startTime) => ({
        title: row.title,
        description: row.description,
        location: row.location,
        category: row.category,
        allDay: row.allDay,
        ownerId: row.ownerId,
        sharedParents: row.sharedParents,
        sharedFamily: row.sharedFamily,
        ...run,
        startTime,
      }))
      await tx.event.createMany({ data: rest })
      return row
    }, SERIES_TRANSACTION)
  } else if (touched.length > 0) {
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.event.update({ where: { id: params.id }, data })
      for (const { e, change } of touched) await tx.event.update({ where: { id: e.id }, data: change })
      return row
    }, SERIES_TRANSACTION)
  } else {
    updated = await prisma.event.update({ where: { id: params.id }, data })
  }

  // One alert for the whole change, however many events it covered.
  const actor = actorOf(user)
  const after = eventItem(updated)
  notifyChanged(eventItem(event), touched.length > 0 ? { ...after, repeatNote: 'and all following' } : after, actor)
  if (plan) notifyRepeatStarted({ ...after, repeatNote: repeatSummary(plan.kind, plan.untilKey) }, actor)
  return NextResponse.json(plan ? { ...updated, count: plan.dates.length } : updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  // ?scope=following removes this event of a repeat and every later one; the default is just this one.
  const scope = readScope(req.nextUrl.searchParams.get('scope'))
  if (!scope) return NextResponse.json({ error: 'That choice is not valid.' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ ok: true })

  // Parents can delete anything; a kid only their own events.
  const isParent = user.role === 'PARENT'
  if (!isParent && event.ownerId !== user.id) {
    return NextResponse.json({ error: 'Only a parent can delete that event.' }, { status: 403 })
  }

  if (scope === 'following' && event.seriesId) {
    const removed = await prisma.event.deleteMany({
      where: { seriesId: event.seriesId, startTime: { gte: event.startTime }, ...(isParent ? {} : { ownerId: user.id }) },
    })
    // One alert for the lot, worded around the first one the person clicked.
    if (removed.count > 0) notifyRemoved({ ...eventItem(event), repeatNote: removed.count > 1 ? 'and every repeat after it' : '' }, actorOf(user))
    return NextResponse.json({ ok: true, removed: removed.count })
  }

  const removed = await prisma.event.deleteMany({ where: { id: params.id } })
  if (removed.count > 0) notifyRemoved(eventItem(event), actorOf(user))
  return NextResponse.json({ ok: true })
}
