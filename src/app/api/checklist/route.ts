import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const kind = req.nextUrl.searchParams.get('kind')
  if (kind !== 'GOAL' && kind !== 'BUCKET_LIST') {
    return NextResponse.json({ error: 'kind must be GOAL or BUCKET_LIST' }, { status: 400 })
  }
  const items = await prisma.checklistItem.findMany({ where: { kind }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.text || (body.kind !== 'GOAL' && body.kind !== 'BUCKET_LIST')) {
    return NextResponse.json({ error: 'text and a valid kind are required' }, { status: 400 })
  }
  const item = await prisma.checklistItem.create({
    data: { text: body.text, kind: body.kind, createdById: user.id },
  })
  return NextResponse.json(item)
}
