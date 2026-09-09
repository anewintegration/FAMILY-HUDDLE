import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAllVisibleTasks } from '@/lib/data'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await getAllVisibleTasks(user.role, user.id)
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Kids may only create tasks assigned to themselves; parents can assign to
  // anyone, or to "parents" to mean "shared between Mom and Dad".
  // The client sends a slug (e.g. "benjamin") or "parents" or "dad" - not a
  // real database id - so we resolve it to the actual user id here.
  const requestedSlug = user.role === 'PARENT' ? body.assigneeId || user.slug : user.slug
  const sharedParents = user.role === 'PARENT' && requestedSlug === 'parents'

  let assigneeId: string | null = null
  if (!sharedParents) {
    const assignee = await prisma.user.findUnique({ where: { slug: requestedSlug } })
    if (!assignee) {
      return NextResponse.json({ error: `No user found for "${requestedSlug}"` }, { status: 400 })
    }
    assigneeId = assignee.id
  }

  const task = await prisma.task.create({
    data: {
      title: body.title,
      notes: body.notes || null,
      category: body.category || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assigneeId,
      sharedParents,
      createdById: user.id,
    },
  })
  return NextResponse.json(task)
}
