import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidMonthKey } from '@/lib/dates'
import { cleanTitle, readBody } from '@/lib/validate'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (user.role !== 'PARENT') return NextResponse.json({ error: 'Only a parent can change this list.' }, { status: 403 })

  const item = await prisma.checklistItem.findUnique({ where: { id: params.id } })
  if (!item) return NextResponse.json({ error: 'That item no longer exists.' }, { status: 404 })

  const body = await readBody(req)
  const data: any = {}

  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') return NextResponse.json({ error: 'That is not valid.' }, { status: 400 })
    data.done = body.done
  }

  if (body.text !== undefined) {
    const text = cleanTitle(body.text)
    if (!text) return NextResponse.json({ error: 'Please write something first (up to 200 characters).' }, { status: 400 })
    data.text = text
  }

  // Move a goal to another month ("Bring to October").
  if (body.month !== undefined) {
    if (item.kind !== 'GOAL' || !isValidMonthKey(body.month)) {
      return NextResponse.json({ error: 'That month is not valid.' }, { status: 400 })
    }
    data.month = body.month
  }

  const updated = await prisma.checklistItem.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (user.role !== 'PARENT') return NextResponse.json({ error: 'Only a parent can change this list.' }, { status: 403 })

  await prisma.checklistItem.deleteMany({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
