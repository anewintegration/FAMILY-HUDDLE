import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const event = await prisma.event.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Kids can only delete their own events; parents can delete anything visible to them.
  if (user.role === 'CHILD' && event.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.event.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as any

  const event = await prisma.event.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'CHILD' && event.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  let ownerUpdate: { ownerId: string | null; sharedParents?: boolean; sharedFamily?: boolean } | null = null
  if (body.ownerId !== undefined && user.role === 'PARENT') {
    if (body.ownerId === 'parents') {
      ownerUpdate = { ownerId: null, sharedParents: true, sharedFamily: false }
    } else if (body.ownerId === 'family') {
      ownerUpdate = { ownerId: null, sharedParents: false, sharedFamily: true }
    } else {
      const owner = await prisma.user.findUnique({ where: { slug: body.ownerId } })
      if (owner) ownerUpdate = { ownerId: owner.id, sharedParents: false, sharedFamily: false }
    }
  }

  const updated = await prisma.event.update({
    where: { id: params.id },
    data: {
      ...(body.title ? { title: body.title } : {}),
      ...(body.startTime ? { startTime: new Date(body.startTime) } : {}),
      ...(body.category !== undefined ? { category: body.category || null } : {}),
      ...(ownerUpdate || {}),
    },
  })
  return NextResponse.json(updated)
}
