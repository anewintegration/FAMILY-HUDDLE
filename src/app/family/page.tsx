import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount, getEventsForUser, getTasksForUser } from '@/lib/data'
import { eventRow, personOptions, taskRow, viewerOf } from '@/lib/rows'
import Header from '@/components/Header'
import EditableEventRow from '@/components/EditableEventRow'
import EditableTaskRow from '@/components/EditableTaskRow'

const SHOWN_PER_LIST = 3

export default async function FamilyPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)
  const viewer = viewerOf(user)

  const [openTaskCount, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const rosters = await Promise.all(
    people.map(async (p) => {
      const [events, tasks] = await Promise.all([getEventsForUser(p.id), getTasksForUser(p.id, 'OPEN')])
      return { person: p, events, tasks }
    })
  )

  const rowContext = { people: personOptions(people), canAssignOthers: true, currentUserSlug: viewer.slug }

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-3 sm:px-4 py-4">
        <p className="font-display text-xl font-semibold text-white mb-1">Family</p>
        <p className="text-xs text-white/80 mb-3">Everyone's world, at a glance.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {rosters.map(({ person, events, tasks }) => {
            const moreEvents = Math.max(0, events.length - SHOWN_PER_LIST)
            const moreTasks = Math.max(0, tasks.length - SHOWN_PER_LIST)
            return (
              <div key={person.id} className="card p-3.5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: person.color }}>
                    {person.displayName[0]}
                  </div>
                  <Link href={`/${person.slug}`} className="tap font-display text-[15px] font-semibold text-charcoal underline decoration-charcoal/20 underline-offset-4">
                    {person.displayName}
                  </Link>
                  {tasks.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold text-terracotta-dark bg-terracotta-dark/10 px-2 py-0.5 rounded-full">{tasks.length} open</span>
                  )}
                </div>
                {events.length === 0 && tasks.length === 0 && <p className="text-xs text-charcoal-faint">Nothing on the books.</p>}
                {events.slice(0, SHOWN_PER_LIST).map((e) => (
                  <EditableEventRow key={e.id} {...eventRow(e, viewer)} {...rowContext} />
                ))}
                {tasks.slice(0, SHOWN_PER_LIST).map((t) => (
                  <EditableTaskRow key={t.id} {...taskRow(t, viewer)} {...rowContext} />
                ))}
                {(moreEvents > 0 || moreTasks > 0) && (
                  <Link href={`/${person.slug}`} className="tap text-xs font-semibold text-charcoal-muted underline">
                    See everything for {person.displayName}
                    {moreEvents + moreTasks > 0 ? ` (+${moreEvents + moreTasks} more)` : ''}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
