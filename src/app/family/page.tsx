import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount, getEventsForUser, getTasksForUser } from '@/lib/data'
import Header from '@/components/Header'

export default async function FamilyPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)

  const [openTaskCount, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const rosters = await Promise.all(
    people.map(async (p) => {
      const [events, tasks] = await Promise.all([getEventsForUser(p.id), getTasksForUser(p.id, 'OPEN')])
      return { person: p, events: events.slice(0, 2), tasks: tasks.slice(0, 2), openCount: tasks.length }
    })
  )

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="max-w-3xl mx-auto px-4 py-5">
        <p className="font-display text-xl font-semibold text-charcoal mb-1">Family</p>
        <p className="text-xs text-charcoal-muted mb-4">Everyone's world, at a glance.</p>
        <div className="flex flex-col gap-3">
          {rosters.map(({ person, events, tasks, openCount }) => (
            <div key={person.id} className="card p-4">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                  style={{ background: person.color }}
                >
                  {person.displayName[0]}
                </div>
                <p className="font-display text-[15px] font-semibold text-charcoal">{person.displayName}</p>
                {openCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-terracotta-dark bg-terracotta-dark/10 px-2 py-0.5 rounded-full">
                    {openCount} open
                  </span>
                )}
              </div>
              {events.length === 0 && tasks.length === 0 && (
                <p className="text-xs text-charcoal-faint">Nothing on the books.</p>
              )}
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: person.color }} />
                  <span className="text-xs text-charcoal-muted w-14 shrink-0">
                    {new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span className="text-sm">{e.title}</span>
                </div>
              ))}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1">
                  <span className="w-3 h-3 rounded-full border border-charcoal-faint shrink-0" />
                  <span className="text-sm">{t.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
