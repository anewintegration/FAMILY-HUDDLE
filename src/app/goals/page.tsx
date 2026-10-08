import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getChecklist } from '@/lib/data'
import { isValidMonthKey, monthKeyOf, monthKeyShift, monthLabel } from '@/lib/dates'
import Header from '@/components/Header'
import ChecklistPageClient from '@/components/ChecklistPageClient'

// Goals belong to a month. A goal saved before months existed counts for the
// month it was created in.
export default async function GoalsPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  if (user.role !== 'PARENT') redirect(`/${user.slug}`)

  const now = new Date()
  const thisMonth = monthKeyOf(now)
  const month = isValidMonthKey(searchParams.month) ? searchParams.month : thisMonth

  const [openTaskCount, goals] = await Promise.all([getOpenTaskCount(user.role, user.id), getChecklist('GOAL')])

  const keyOf = (g: { month: string | null; createdAt: Date }) => g.month ?? monthKeyOf(g.createdAt)
  const forMonth = goals.filter((g) => keyOf(g) === month)
  // Unfinished goals from earlier months are offered for this month (this month or later only).
  const carryOver = month >= thisMonth ? goals.filter((g) => !g.done && keyOf(g) < month) : []

  const label = monthLabel(month)
  const yearSuffix = month.slice(0, 4) !== String(now.getFullYear()) ? ` ${month.slice(0, 4)}` : ''

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <ChecklistPageClient
        kind="GOAL"
        title={`${label}${yearSuffix} Goals`}
        subtitle={month === thisMonth ? 'What Mom and Dad want to make sure happens this month.' : `What Mom and Dad want to make happen in ${label}.`}
        items={forMonth.map((g) => ({ id: g.id, text: g.text, done: g.done }))}
        carryOver={carryOver.map((g) => ({ id: g.id, text: g.text, done: g.done }))}
        carryTo={{ key: month, label }}
        month={month}
        monthNav={{
          prev: `/goals?month=${monthKeyShift(month, -1)}`,
          next: `/goals?month=${monthKeyShift(month, 1)}`,
          thisMonth: month === thisMonth ? null : '/goals',
        }}
        placeholder={`Add a goal for ${label}`}
        accent="#A56A00"
      />
    </main>
  )
}
