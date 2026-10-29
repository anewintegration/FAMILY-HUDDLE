import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAllVisibleTasks } from '@/lib/data'
import { cleanTitle, isCategory, readBody, readDate } from '@/lib/validate'
import { actorOf, notifyAdded, taskItem } from '@/lib/alerts'
import { SERIES_TRANSACTION, readRepeat, repeatSummary } from '@/lib/recurrence'

// Answers depend on who is signed in, so they are never saved at build time.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const tasks = await getAllVisibleTasks(user.role, user.id)
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const body = await readBody(req)

  const title = cleanTitle(body.title)
  if (!title) return NextResponse.json({ error: 'Please give the task a title (up to 200 characters).' }, { status: 400 })

  const due = readDate(body.dueDate)
  if (!due.ok) return NextResponse.json({ error: 'That date or time is not valid.' }, { status: 400 })

  if (body.category && !isCategory(body.category)) {
    return NextResponse.json({ error: 'That category is not valid.' }, { status: 400 })
  }

  // "Repeat" + "repeat until": the checks (and their plain-English refusals) live in lib/recurrence.ts.
  const repeat = readRepeat(body, due.value, 'task')
  if (!repeat.ok) return NextResponse.json({ error: repeat.error }, { status: 400 })
  const plan = repeat.plan

  // The client sends a slug (e.g. "benjamin") or "parents"/"family" - not a real
  // database id - so it is resolved to the actual user here. Kids can only add
  // tasks for themselves.
  const requestedSlug = user.role === 'PARENT' ? body.assigneeId || user.slug : user.slug
  const sharedParents = user.role === 'PARENT' && requestedSlug === 'parents'
  const sharedFamily = user.role === 'PARENT' && requestedSlug === 'family'

  let assigneeId: string | null = null
  if (!sharedParents && !sharedFamily) {
    const assignee = await prisma.user.findUnique({ where: { slug: String(requestedSlug) } })
    if (!assignee) {
      return NextResponse.json({ error: `There is no one called "${requestedSlug}".` }, { status: 400 })
    }
    assigneeId = assignee.id
  }

  const common = { title, category: body.category || null, assigneeId, sharedParents, sharedFamily, createdById: user.id }

  if (!plan) {
    const task = await prisma.task.create({ data: { ...common, dueDate: due.value } })
    notifyAdded(taskItem(task), actorOf(user))
    return NextResponse.json(task)
  }

  // A repeat is one ordinary task for every date, written together or not at all, and announced once.
  const run = { seriesId: randomUUID(), repeat: plan.kind }
  const first = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({ data: { ...common, ...run, dueDate: plan.dates[0] } })
    await tx.task.createMany({ data: plan.dates.slice(1).map((dueDate) => ({ ...common, ...run, dueDate })) })
    return created
  }, SERIES_TRANSACTION)
  notifyAdded({ ...taskItem(first), repeatNote: repeatSummary(plan.kind, plan.untilKey) }, actorOf(user))
  return NextResponse.json({ ...first, count: plan.dates.length })
}
