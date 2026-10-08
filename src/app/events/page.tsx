import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount, getAllVisibleEvents } from '@/lib/data'
import { eventRow, personOptions, viewerOf } from '@/lib/rows'
import Header from '@/components/Header'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  const viewer = viewerOf(user)

  const [openTaskCount, events, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getAllVisibleEvents(user.role, user.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-3 sm:px-4 py-4">
        <p className="font-display text-xl font-semibold text-white mb-3">Events</p>
        <EventsClient
          events={events.map((e) => eventRow(e, viewer))}
          people={personOptions(people)}
          canAssignOthers={viewer.role === 'PARENT'}
          currentUserSlug={viewer.slug}
        />
      </div>
    </main>
  )
}
