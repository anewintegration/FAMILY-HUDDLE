import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanTitle, isCategory, readBody, readDate, readScope } from '@/lib/validate'
import { actorOf, notifyChanged, notifyRemoved, notifyRepeatStarted, taskItem } from '@/lib/alerts'
import { SERIES_TRANSACTION, datesForFollowing, readRepeat, repeatSummary } from '@/lib/recurrence'
import type { RepeatPlan } from '@/lib/recurrence'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'That task no longer exists.' }, { status: 404 })

  const isParent = user.role === 'PARENT'
  const isOwn = task.assigneeId === user.id
  const isFamily = task.sharedFamily
  if (!isParent && !isOwn && !isFamily) {
    return NextResponse.json({ error: 'That task belongs to someone else.' }, { status: 403 })
  }

  const body = await readBody(req)

  // A kid can check off a Family task, but only a parent can change it.
  const statusOnly = !isParent && !isOwn && isFamily
  if (statusOnly && Object.keys(body).some((k) => k !== 'status')) {
    return NextResponse.json({ error: 'Family tasks can be checked off, but only a parent can change them.' }, { status: 403 })
  }

  // For a task that repeats: change just this one (the default), or this one and every later one.
  const scope = readScope(body.scope)
  if (!scope) return NextResponse.json({ error: 'That choice is not valid.' }, { status: 400 })

  const data: any = {}

  if (body.status !== undefined) {
    if (body.status !== 'OPEN' && body.status !== 'DONE') {
      return NextResponse.json({ error: 'That status is not valid.' }, { status: 400 })
    }
    data.status = body.status
    data.completedAt = body.status === 'DONE' ? new Date() : null
  }

  if (body.title !== undefined) {
    const title = cleanTitle(body.title)
    if (!title) return NextResponse.json({ error: 'Please give the task a title (up to 200 characters).' }, { status: 400 })
    data.title = title
  }

  if (body.dueDate !== undefined) {
    const due = readDate(body.dueDate)
    if (!due.ok) return NextResponse.json({ error: 'That date or time is not valid.' }, { status: 400 })
    if (!due.value && task.seriesId) return NextResponse.json({ error: 'A repeating task needs a due date.' }, { status: 400 })
    data.dueDate = due.value
  }

  if (body.category !== undefined) {
    if (body.category && !isCategory(body.category)) {
      return NextResponse.json({ error: 'That category is not valid.' }, { status: 400 })
    }
    data.category = body.category || null
  }

  // Only parents can hand a task to someone else ("parents", "family" or a person).
  if (isParent && body.assigneeId !== undefined) {
    if (body.assigneeId === 'parents') {
      data.assigneeId = null
      data.sharedParents = true
      data.sharedFamily = false
    } else if (body.assigneeId === 'family') {
      data.assigneeId = null
      data.sharedParents = false
      data.sharedFamily = true
    } else {
      const assignee = await prisma.user.findUnique({ where: { slug: String(body.assigneeId) } })
      if (!assignee) return NextResponse.json({ error: 'There is no one by that name.' }, { status: 400 })
      data.assigneeId = assignee.id
      data.sharedParents = false
      data.sharedFamily = false
    }
  }

  // A one-off task can be made to repeat from here on (the same two boxes as when adding one).
  // How an existing repeat comes round is not changed afterwards: delete the later ones and add a new repeat.
  let plan: RepeatPlan | null = null
  if (body.repeat !== undefined && body.repeat !== null && body.repeat !== '') {
    if (task.seriesId) {
      return NextResponse.json(
        { error: 'That task already repeats. To change how it repeats, delete the ones after it and add a new repeat.' },
        { status: 400 }
      )
    }
    const check = readRepeat(body, data.dueDate !== undefined ? data.dueDate : task.dueDate, 'task')
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })
    plan = check.plan
  }

  // "This and all following": the later tasks of the same repeat take over the changes that make sense for all of them.
  // Finishing a task is never one of them. A kid only ever touches their own.
  const later =
    scope === 'following' && task.seriesId && task.repeat && task.dueDate
      ? await prisma.task.findMany({ where: { seriesId: task.seriesId, dueDate: { gt: task.dueDate } }, orderBy: { dueDate: 'asc' } })
      : []
  const shared: any = {}
  for (const key of ['title', 'category', 'assigneeId', 'sharedParents', 'sharedFamily']) if (key in data) shared[key] = data[key]
  const newDates =
    later.length > 0 && task.repeat && task.dueDate && data.dueDate
      ? datesForFollowing(task.repeat, task.dueDate, data.dueDate, later.map((t) => t.dueDate as Date))
      : null
  const touched = later
    .map((t, i) => ({ t, change: { ...shared, ...(newDates ? { dueDate: newDates[i] } : {}) } }))
    .filter(({ t, change }) => Object.keys(change).length > 0 && (isParent || t.assigneeId === user.id))

  let updated
  if (plan) {
    const made = plan
    const run = { seriesId: randomUUID(), repeat: made.kind }
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.task.update({ where: { id: params.id }, data: { ...data, ...run } })
      const rest = made.dates.slice(1).map((dueDate) => ({
        title: row.title,
        notes: row.notes,
        category: row.category,
        assigneeId: row.assigneeId,
        sharedParents: row.sharedParents,
        sharedFamily: row.sharedFamily,
        createdById: row.createdById,
        ...run,
        dueDate,
      }))
      await tx.task.createMany({ data: rest })
      return row
    }, SERIES_TRANSACTION)
  } else if (touched.length > 0) {
    updated = await prisma.$transaction(async (tx) => {
      const row = await tx.task.update({ where: { id: params.id }, data })
      for (const { t, change } of touched) await tx.task.update({ where: { id: t.id }, data: change })
      return row
    }, SERIES_TRANSACTION)
  } else {
    updated = await prisma.task.update({ where: { id: params.id }, data })
  }

  // One alert for the whole change, however many tasks it covered.
  const actor = actorOf(user)
  const after = taskItem(updated)
  notifyChanged(taskItem(task), touched.length > 0 ? { ...after, repeatNote: 'and all following' } : after, actor)
  if (plan) notifyRepeatStarted({ ...after, repeatNote: repeatSummary(plan.kind, plan.untilKey) }, actor)
  return NextResponse.json(plan ? { ...updated, count: plan.dates.length } : updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  // ?scope=following removes this task of a repeat and every later one; the default is just this one.
  const scope = readScope(req.nextUrl.searchParams.get('scope'))
  if (!scope) return NextResponse.json({ error: 'That choice is not valid.' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  // Already gone (deleted on another screen)? Then the job is done.
  if (!task) return NextResponse.json({ ok: true })

  // Parents can delete anything; a kid only their own tasks (never a Family task).
  const isParent = user.role === 'PARENT'
  if (!isParent && task.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Only a parent can delete that task.' }, { status: 403 })
  }

  if (scope === 'following' && task.seriesId && task.dueDate) {
    const removed = await prisma.task.deleteMany({
      where: { seriesId: task.seriesId, dueDate: { gte: task.dueDate }, ...(isParent ? {} : { assigneeId: user.id }) },
    })
    // One alert for the lot, worded around the first one the person clicked.
    if (removed.count > 0) notifyRemoved({ ...taskItem(task), repeatNote: removed.count > 1 ? 'and every repeat after it' : '' }, actorOf(user))
    return NextResponse.json({ ok: true, removed: removed.count })
  }

  const removed = await prisma.task.deleteMany({ where: { id: params.id } })
  if (removed.count > 0) notifyRemoved(taskItem(task), actorOf(user))
  return NextResponse.json({ ok: true })
}
