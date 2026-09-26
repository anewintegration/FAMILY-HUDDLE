import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount, getAllVisibleEvents } from '@/lib/data'
import Header from '@/components/Header'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [openTaskCount, events, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getAllVisibleEvents(user.role, user.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-4 py-5">
        <p className="font-display text-xl font-semibold text-charcoal mb-4">Events</p>
        <EventsClient
          initialEvents={events.map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime.toISOString(),
            category: e.category,
            ownerName: e.owner?.displayName ?? (e.sharedFamily ? 'Family' : 'Parents'),
            ownerSlug: e.owner?.slug ?? 'parents',
            ownerColor: e.owner?.color ?? '#1B2340',
          }))}
          people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug, color: p.color }))}
          canAssignOthers={user.role === 'PARENT'}
          currentUserSlug={user.slug}
        />
      </div>
    </main>
  )
}
