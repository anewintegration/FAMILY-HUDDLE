import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanTitle, isCategory, readBody, readDate } from '@/lib/validate'

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

  const updated = await prisma.event.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const event = await prisma.event.findUnique({ where: { id: params.id } })
  if (!event) return NextResponse.json({ ok: true })

  // Parents can delete anything; a kid only their own events.
  if (user.role !== 'PARENT' && event.ownerId !== user.id) {
    return NextResponse.json({ error: 'Only a parent can delete that event.' }, { status: 403 })
  }

  await prisma.event.deleteMany({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
