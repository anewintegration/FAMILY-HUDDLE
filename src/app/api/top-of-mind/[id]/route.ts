import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'PARENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.topOfMindNote.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
