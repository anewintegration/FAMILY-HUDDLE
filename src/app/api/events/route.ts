import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { eventVisibilityWhere } from '@/lib/data'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (!body.title || !body.startTime) {
    return NextResponse.json({ error: 'Title and start time are required' }, { status: 400 })
  }

  const sharedParents = user.role === 'PARENT' && body.ownerId === 'parents'
  const ownerId = user.role === 'PARENT' ? (sharedParents ? null : body.ownerId || user.id) : user.id

  const event = await prisma.event.create({
    data: {
      title: body.title,
      description: body.description || null,
      location: body.location || null,
      category: body.category || null,
      startTime: new Date(body.startTime),
      endTime: body.endTime ? new Date(body.endTime) : null,
      allDay: !!body.allDay,
      ownerId,
      sharedParents,
    },
  })
  return NextResponse.json(event)
}
