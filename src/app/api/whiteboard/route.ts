import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cleanText, readBody } from '@/lib/validate'

// Answers depend on who is signed in, so they are never saved at build time.
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const posts = await prisma.whiteboardPost.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await readBody(req)
  const text = cleanText(body.text, 2000)
  if (!text) return NextResponse.json({ error: 'Please write something first (up to 2000 characters).' }, { status: 400 })

  const post = await prisma.whiteboardPost.create({
    data: { text, authorId: user.id },
    include: { author: true },
  })
  return NextResponse.json(post)
}
