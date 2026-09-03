import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOpenTaskCount, getAllVisibleTasks } from '@/lib/data'
import Header from '@/components/Header'
import TasksClient from './TasksClient'

export default async function TasksPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const [openTaskCount, tasks, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getAllVisibleTasks(user.role, user.id),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  return (
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="max-w-3xl mx-auto px-4 py-5">
        <p className="font-display text-xl font-semibold text-charcoal mb-4">Tasks</p>
        <TasksClient
          initialTasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            category: t.category,
            assigneeName: t.assignee?.displayName ?? 'Parents',
            assigneeSlug: t.assignee?.slug ?? 'parents',
          }))}
          people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug }))}
          canAssignOthers={user.role === 'PARENT'}
          currentUserSlug={user.slug}
        />
      </div>
    </main>
  )
}
