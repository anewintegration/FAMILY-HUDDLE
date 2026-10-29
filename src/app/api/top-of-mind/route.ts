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
  const notes = await prisma.topOfMindNote.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  if (user.role !== 'PARENT') return NextResponse.json({ error: 'Only a parent can add notes.' }, { status: 403 })

  const body = await readBody(req)
  const text = cleanText(body.text, 500)
  if (!text) return NextResponse.json({ error: 'Please write something first (up to 500 characters).' }, { status: 400 })

  const note = await prisma.topOfMindNote.create({ data: { text } })
  return NextResponse.json(note)
}
