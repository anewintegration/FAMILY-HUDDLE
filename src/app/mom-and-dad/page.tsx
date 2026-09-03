import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount } from '@/lib/data'
import Header from '@/components/Header'
import { categoryById, taskStatus } from '@/lib/categories'

export default async function ParentsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)

  const [openTaskCount, events, tasks] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    prisma.event.findMany({
      where: { OR: [{ owner: { role: 'PARENT' } }, { sharedParents: true }], startTime: { gte: new Date() } },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
      take: 15,
    }),
    prisma.task.findMany({
      where: { OR: [{ assignee: { role: 'PARENT' } }, { sharedParents: true }], status: 'OPEN' },
      include: { assignee: true },
      orderBy: [{ dueDate: 'asc' }],
    }),
  ])

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="max-w-3xl mx-auto px-4 py-5">
        <p className="font-display text-xl font-semibold text-charcoal mb-4">Parents</p>

        <p className="text-[13px] font-semibold text-charcoal mb-2">Upcoming</p>
        <div className="card p-4 mb-5">
          {events.length === 0 && <p className="text-sm text-charcoal-faint">Nothing scheduled yet.</p>}
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2 py-2 border-b border-cream-border last:border-b-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.owner?.color ?? '#3D3D3A' }} />
              <span className="text-xs text-charcoal-muted w-24 shrink-0">
                {new Date(e.startTime).toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="text-sm flex-1">{`${e.owner?.displayName ?? 'Parents'}: ${e.title}`}</span>
              {e.category && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: categoryById[e.category].color, background: `${categoryById[e.category].color}1A` }}
                >
                  {categoryById[e.category].label}
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-[13px] font-semibold text-charcoal mb-2">Household tasks</p>
        <div className="flex flex-col gap-2">
          {tasks.length === 0 && <p className="text-sm text-charcoal-faint">All caught up.</p>}
          {tasks.map((t) => {
            const status = taskStatus({ status: t.status, dueDate: t.dueDate })
            return (
              <div key={t.id} className="flex items-center justify-between bg-cream-card border border-cream-border rounded-lg px-3.5 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border border-charcoal-faint shrink-0" />
                  <span className="text-sm">{`${t.assignee?.displayName ?? 'Parents'}: ${t.title}`}</span>
                  {t.category && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: categoryById[t.category].color, background: `${categoryById[t.category].color}1A` }}
                    >
                      {categoryById[t.category].label}
                    </span>
                  )}
                </div>
                {status && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
