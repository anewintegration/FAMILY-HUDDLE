import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanTitle, isCategory, readBody, readDate } from '@/lib/validate'

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

  const updated = await prisma.task.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  // Already gone (deleted on another screen)? Then the job is done.
  if (!task) return NextResponse.json({ ok: true })

  // Parents can delete anything; a kid only their own tasks (never a Family task).
  if (user.role !== 'PARENT' && task.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Only a parent can delete that task.' }, { status: 403 })
  }

  await prisma.task.deleteMany({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
