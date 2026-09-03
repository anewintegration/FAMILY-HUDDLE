import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getChecklist } from '@/lib/data'
import Header from '@/components/Header'
import ChecklistPageClient from '@/components/ChecklistPageClient'

export default async function BucketListPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)

  const [openTaskCount, items] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getChecklist('BUCKET_LIST'),
  ])

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <ChecklistPageClient
        kind="BUCKET_LIST"
        title="Family Bucket List"
        subtitle="Things we want to do together, no deadline attached."
        initialItems={items.map((i) => ({ id: i.id, text: i.text, done: i.done }))}
        placeholder="Add something to the bucket list"
        accent="#A85E42"
      />
    </main>
  )
}
