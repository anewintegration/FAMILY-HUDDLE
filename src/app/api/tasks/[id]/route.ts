import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (user.role === 'CHILD' && task.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Resolve a new assignee if the client sent one (a slug, "parents", or "family").
  let assigneeUpdate: { assigneeId: string | null; sharedParents?: boolean; sharedFamily?: boolean } | null = null
  if (body.assigneeId !== undefined && user.role === 'PARENT') {
    if (body.assigneeId === 'parents') {
      assigneeUpdate = { assigneeId: null, sharedParents: true, sharedFamily: false }
    } else if (body.assigneeId === 'family') {
      assigneeUpdate = { assigneeId: null, sharedParents: false, sharedFamily: true }
    } else {
      const assignee = await prisma.user.findUnique({ where: { slug: body.assigneeId } })
      if (assignee) assigneeUpdate = { assigneeId: assignee.id, sharedParents: false, sharedFamily: false }
    }
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...(body.status ? { status: body.status, completedAt: body.status === 'DONE' ? new Date() : null } : {}),
      ...(body.title ? { title: body.title } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
      ...(body.category !== undefined ? { category: body.category || null } : {}),
      ...(assigneeUpdate || {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'CHILD' && task.assigneeId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.task.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
