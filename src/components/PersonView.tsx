import { prisma } from '@/lib/prisma'
import { getTasksForUser, getEventsForUser } from '@/lib/data'
import { categoriesForSlug, categoryById, taskStatus } from '@/lib/categories'
import CategoryFilterBar from './CategoryFilterBar'

export default async function PersonView({
  slug,
  categoryFilter,
}: {
  slug: string
  categoryFilter?: string
}) {
  const person = await prisma.user.findUnique({ where: { slug } })

  if (!person) {
    return <p className="text-sm text-charcoal-muted px-4 py-4">No one found for that page.</p>
  }

  const [allTasks, allEvents] = await Promise.all([
    getTasksForUser(person.id, 'OPEN'),
    getEventsForUser(person.id),
  ])

  const filter = categoryFilter && categoryFilter !== 'all' ? categoryFilter : null
  const tasks = filter ? allTasks.filter((t) => t.category === filter) : allTasks
  const events = filter ? allEvents.filter((e) => e.category === filter) : allEvents

  const options = categoriesForSlug(slug)

  return (
    <div className="max-w-6xl mx-auto px-4 py-5">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
          style={{ background: person.color, boxShadow: `0 3px 10px ${person.color}55` }}
        >
          {person.displayName[0]}
        </div>
        <p className="font-display text-xl font-semibold text-charcoal">{person.displayName}</p>
      </div>

      {options.length > 0 && <CategoryFilterBar slug={slug} options={options} active={categoryFilter || 'all'} accentColor={person.color} />}

      <p className="text-[13px] font-semibold text-charcoal mb-2">Upcoming</p>
      <div className="card p-4 mb-5">
        {events.length === 0 && <p className="text-sm text-charcoal-faint">Nothing scheduled yet.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 py-2.5 border-b border-cream-border last:border-b-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: person.color, boxShadow: `0 0 0 3px ${person.color}22` }} />
            <span className="text-xs font-semibold text-charcoal-muted w-24 shrink-0">
              {new Date(e.startTime).toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
            </span>
            <span className="text-sm flex-1">{e.title}</span>
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

      <p className="text-[13px] font-semibold text-charcoal mb-2">Tasks</p>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && <p className="text-sm text-charcoal-faint">All caught up.</p>}
        {tasks.map((t) => {
          const status = taskStatus({ status: t.status, dueDate: t.dueDate })
          return (
            <div key={t.id} className="flex items-center justify-between bg-cream-card border border-cream-border rounded-lg px-3.5 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border border-charcoal-faint shrink-0" />
                <span className="text-sm">{t.title}</span>
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
  )
}
