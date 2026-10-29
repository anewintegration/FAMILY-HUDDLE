import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readBody } from '@/lib/validate'

// Change your own password. The starter passwords ("changeme-...") are refused as
// a new password so nobody keeps one by accident.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (!sessionUser) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await readBody(req)
  const current = typeof body.current === 'string' ? body.current : ''
  const next = typeof body.next === 'string' ? body.next : ''

  if (next.length < 8 || next.length > 100) {
    return NextResponse.json({ error: 'The new password needs to be 8 to 100 characters.' }, { status: 400 })
  }
  if (next.toLowerCase().startsWith('changeme')) {
    return NextResponse.json({ error: 'Please pick something other than the starter password.' }, { status: 400 })
  }
  if (next === current) {
    return NextResponse.json({ error: 'The new password must be different from the current one.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } })
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const matches = await bcrypt.compare(current, user.passwordHash)
  if (!matches) return NextResponse.json({ error: 'Your current password is not right.' }, { status: 400 })

  const passwordHash = await bcrypt.hash(next, 10)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  return NextResponse.json({ ok: true })
}
