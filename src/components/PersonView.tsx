import { prisma } from '@/lib/prisma'
import { getTasksForUser, getEventsForUser } from '@/lib/data'
import { categoriesForSlug, categoryById } from '@/lib/categories'
import { eventRow, personOptions, taskRow } from '@/lib/rows'
import type { Viewer } from '@/lib/rows'
import CategoryFilterBar from './CategoryFilterBar'
import EditableEventRow from './EditableEventRow'
import EditableTaskRow from './EditableTaskRow'

export default async function PersonView({
  slug,
  categoryFilter,
  viewer,
}: {
  slug: string
  categoryFilter?: string
  viewer: Viewer
}) {
  const person = await prisma.user.findUnique({ where: { slug } })

  if (!person) {
    return <p className="text-sm text-white px-4 py-4">No one found for that page.</p>
  }

  const [allTasks, allEvents, people] = await Promise.all([
    getTasksForUser(person.id, 'OPEN'),
    getEventsForUser(person.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const options = categoriesForSlug(slug)
  // Only a real category narrows the list; anything else shows everything.
  const filter = categoryFilter && categoryById[categoryFilter] && options.some((c) => c.id === categoryFilter) ? categoryFilter : null
  const tasks = filter ? allTasks.filter((t) => t.category === filter) : allTasks
  const events = filter ? allEvents.filter((e) => e.category === filter) : allEvents

  const rowContext = { people: personOptions(people), canAssignOthers: viewer.role === 'PARENT', currentUserSlug: viewer.slug }

  return (
    <div className="w-full px-3 sm:px-4 py-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
          style={{ background: person.color }}
        >
          {person.displayName[0]}
        </div>
        <p className="font-display text-xl font-semibold text-white">{person.displayName}</p>
      </div>

      {options.length > 0 && <CategoryFilterBar slug={slug} options={options} active={filter || 'all'} accentColor={person.color} />}

      <p className="text-[13px] font-semibold text-white mb-2">Upcoming</p>
      <div className="card p-3 mb-5">
        {events.length === 0 && <p className="text-sm text-charcoal-faint">Nothing scheduled yet.</p>}
        {events.map((e) => (
          <EditableEventRow key={e.id} {...eventRow(e, viewer)} {...rowContext} showDate="always" />
        ))}
      </div>

      <p className="text-[13px] font-semibold text-white mb-2">Tasks</p>
      <div className="card p-3">
        {tasks.length === 0 && <p className="text-sm text-charcoal-faint">All caught up.</p>}
        {tasks.map((t) => (
          <EditableTaskRow key={t.id} {...taskRow(t, viewer)} {...rowContext} showDate="always" />
        ))}
      </div>
    </div>
  )
}
