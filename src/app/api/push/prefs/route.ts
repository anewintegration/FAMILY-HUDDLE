import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { readBody } from '@/lib/validate'

// The four kinds of alert each person can switch on or off (for all of their devices).
const KINDS = ['alertChanges', 'alertDone', 'alertBoard', 'alertReminders'] as const

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await readBody(req)
  const keys = Object.keys(body)
  const known = new Set<string>(KINDS)
  if (keys.length === 0 || keys.some((k) => !known.has(k) || typeof body[k] !== 'boolean')) {
    return NextResponse.json({ error: 'That setting is not valid.' }, { status: 400 })
  }

  const data: { alertChanges?: boolean; alertDone?: boolean; alertBoard?: boolean; alertReminders?: boolean } = {}
  for (const k of KINDS) if (typeof body[k] === 'boolean') data[k] = body[k]

  const updated = await prisma.user.update({ where: { id: user.id }, data })
  return NextResponse.json({
    alertChanges: updated.alertChanges,
    alertDone: updated.alertDone,
    alertBoard: updated.alertBoard,
    alertReminders: updated.alertReminders,
  })
}
