import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const post = await prisma.whiteboardPost.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ ok: true })

  // You can take down your own post; a parent can take down anyone's.
  if (user.role !== 'PARENT' && post.authorId !== user.id) {
    return NextResponse.json({ error: 'You can only remove your own posts.' }, { status: 403 })
  }

  await prisma.whiteboardPost.deleteMany({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
