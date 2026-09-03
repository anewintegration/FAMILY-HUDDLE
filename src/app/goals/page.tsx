import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getChecklist } from '@/lib/data'
import Header from '@/components/Header'
import ChecklistPageClient from '@/components/ChecklistPageClient'

export default async function GoalsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)

  const [openTaskCount, items] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getChecklist('GOAL'),
  ])

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <ChecklistPageClient
        kind="GOAL"
        title="September Goals"
        subtitle="What Mom and Dad want to make sure happens this month."
        initialItems={items.map((i) => ({ id: i.id, text: i.text, done: i.done }))}
        placeholder="Add a goal for September"
        accent="#A87C31"
      />
    </main>
  )
}
