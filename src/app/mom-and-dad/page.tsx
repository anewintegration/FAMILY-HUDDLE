import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount } from '@/lib/data'
import { eventRow, personOptions, taskRow, viewerOf } from '@/lib/rows'
import Header from '@/components/Header'
import EditableEventRow from '@/components/EditableEventRow'
import EditableTaskRow from '@/components/EditableTaskRow'

export default async function ParentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)
  const viewer = viewerOf(user)

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [openTaskCount, events, tasks, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    prisma.event.findMany({
      where: { OR: [{ owner: { role: 'PARENT' } }, { sharedParents: true }, { sharedFamily: true }], startTime: { gte: startOfToday } },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
      take: 15,
    }),
    prisma.task.findMany({
      where: { OR: [{ assignee: { role: 'PARENT' } }, { sharedParents: true }, { sharedFamily: true }], status: 'OPEN' },
      include: { assignee: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const rowContext = { people: personOptions(people), canAssignOthers: true, currentUserSlug: viewer.slug }

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-3 sm:px-4 py-4">
        <p className="font-display text-xl font-semibold text-white mb-3">Parents</p>

        <p className="text-[13px] font-semibold text-white mb-2">Upcoming</p>
        <div className="card p-3 mb-5">
          {events.length === 0 && <p className="text-sm text-charcoal-faint">Nothing scheduled yet.</p>}
          {events.map((e) => (
            <EditableEventRow key={e.id} {...eventRow(e, viewer)} {...rowContext} showDate="always" showOwner />
          ))}
        </div>

        <p className="text-[13px] font-semibold text-white mb-2">Household tasks</p>
        <div className="card p-3">
          {tasks.length === 0 && <p className="text-sm text-charcoal-faint">All caught up.</p>}
          {tasks.map((t) => (
            <EditableTaskRow key={t.id} {...taskRow(t, viewer)} {...rowContext} showDate="always" showOwner />
          ))}
        </div>
      </div>
    </main>
  )
}
