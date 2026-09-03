import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getBucketItems, getOpenTaskCount, getTopOfMindNotes } from '@/lib/data'
import { formatWeekRange } from '@/lib/categories'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { bucket?: string; week?: string; category?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const bucket = (['today', 'tomorrow', 'week'].includes(searchParams.bucket || '')
    ? searchParams.bucket
    : 'today') as 'today' | 'tomorrow' | 'week'
  const weekOffset = Math.max(0, Math.min(3, parseInt(searchParams.week || '0', 10) || 0))
  const category = searchParams.category || null

  const [openTaskCount, today, tomorrow, week, topOfMind, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getBucketItems(user.role, user.id, 'today', 0, category),
    getBucketItems(user.role, user.id, 'tomorrow', 0, category),
    getBucketItems(user.role, user.id, 'week', weekOffset, category),
    user.role === 'PARENT' ? getTopOfMindNotes() : Promise.resolve([]),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const countFor = (items: { events: any[]; tasks: any[] }) =>
    items.events.length + items.tasks.filter((t) => t.status === 'OPEN').length

  const selected = bucket === 'today' ? today : bucket === 'tomorrow' ? tomorrow : week

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <DashboardClient
        role={user.role}
        currentUserId={user.id}
        currentUserSlug={user.slug}
        bucket={bucket}
        weekOffset={weekOffset}
        weekLabel={formatWeekRange(weekOffset)}
        category={category}
        counts={{ today: countFor(today), tomorrow: countFor(tomorrow), week: countFor(week) }}
        bullets={{
          today: [...today.events.map((e) => e.title), ...today.tasks.map((t) => t.title)].slice(0, 3),
          tomorrow: [...tomorrow.events.map((e) => e.title), ...tomorrow.tasks.map((t) => t.title)].slice(0, 3),
          week: [...week.events.map((e) => e.title), ...week.tasks.map((t) => t.title)].slice(0, 3),
        }}
        selected={{
          events: selected.events.map((e: any) => ({
            id: e.id,
            title: e.title,
            time: new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            category: e.category,
            ownerName: e.owner?.displayName ?? 'Parents',
            ownerColor: e.owner?.color ?? '#3D3D3A',
            ownerInitial: (e.owner?.displayName ?? 'P')[0],
          })),
          tasks: selected.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            category: t.category,
            ownerName: t.assignee?.displayName ?? 'Parents',
          })),
        }}
        topOfMind={topOfMind.map((n) => ({ id: n.id, text: n.text }))}
        people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug, role: p.role }))}
      />
    </main>
  )
}
