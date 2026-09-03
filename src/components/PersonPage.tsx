import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount } from '@/lib/data'
import Header from '@/components/Header'
import PersonView from '@/components/PersonView'

export default async function PersonPage({
  slug,
  categoryFilter,
}: {
  slug: string
  categoryFilter?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const user = session.user as any
  const openTaskCount = await getOpenTaskCount(user.role, user.id)

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <PersonView slug={slug} categoryFilter={categoryFilter} />
    </main>
  )
}
