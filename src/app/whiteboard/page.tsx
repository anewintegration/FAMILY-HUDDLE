import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getWhiteboardPosts } from '@/lib/data'
import Header from '@/components/Header'
import WhiteboardClient from '@/components/WhiteboardClient'

export default async function WhiteboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [openTaskCount, posts] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getWhiteboardPosts(),
  ])

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <WhiteboardClient
        currentUserName={user.name}
        initialPosts={posts.map((p) => ({
          id: p.id,
          text: p.text,
          time: p.createdAt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
          authorName: p.author.displayName,
          authorColor: p.author.color,
          authorInitial: p.author.displayName[0],
        }))}
      />
    </main>
  )
}
