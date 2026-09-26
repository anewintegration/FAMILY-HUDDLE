import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getMonthItems } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import CalendarQuickAdd from '@/components/CalendarQuickAdd'
import EditableEventRow from '@/components/EditableEventRow'
import EditableTaskRow from '@/components/EditableTaskRow'

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) {
  return n.toString().padStart(2, '0')
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string; day?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const now = new Date()
  const [yearStr, monthStr] = (searchParams.month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`).split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1

  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const selectedDay = searchParams.day || todayKey

  const [openTaskCount, { events, tasks }, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getMonthItems(user.role, user.id, year, month),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const itemsByDay: Record<string, { events: typeof events; tasks: typeof tasks }> = {}
  for (const e of events) {
    const d = new Date(e.startTime)
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
    itemsByDay[key] = itemsByDay[key] || { events: [], tasks: [] }
    itemsByDay[key].events.push(e)
  }
  for (const t of tasks) {
    if (!t.dueDate) continue
    const d = new Date(t.dueDate)
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate())
    itemsByDay[key] = itemsByDay[key] || { events: [], tasks: [] }
    itemsByDay[key].tasks.push(t)
  }

  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = firstOfMonth.getDay()

  const prevMonthDate = new Date(year, month - 1, 1)
  const nextMonthDate = new Date(year, month + 1, 1)
  const prevMonthParam = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}`
  const nextMonthParam = `${nextMonthDate.getFullYear()}-${pad(nextMonthDate.getMonth() + 1)}`
  const thisMonthParam = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`

  const cells: { day: number | null; key: string | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: dateKey(year, month, d) })

  const selectedItems = itemsByDay[selectedDay] || { events: [], tasks: [] }
  const selectedDateObj = new Date(`${selectedDay}T00:00:00`)

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-4 py-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="font-display text-xl font-semibold text-charcoal">{MONTH_NAMES[month]} {year}</p>
          <div className="flex items-center gap-2">
            <Link href={`/calendar?month=${prevMonthParam}`} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-charcoal-muted" aria-label="Previous month">‹</Link>
            <Link href={`/calendar?month=${thisMonthParam}&day=${todayKey}`} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white text-charcoal-muted">Today</Link>
            <Link href={`/calendar?month=${nextMonthParam}`} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-charcoal-muted" aria-label="Next month">›</Link>
          </div>
        </div>

        <div className="card p-3 mb-5">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-[10px] font-bold text-charcoal-faint uppercase text-center py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.day === null) return <div key={i} />
              const dayItems = itemsByDay[cell.key!] || { events: [], tasks: [] }
              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDay
              const isPast = !!cell.key && cell.key < todayKey
              if (isPast) return <div key={i} />
              const allItems = [
                ...dayItems.events.map((e) => ({ title: e.title, color: e.owner?.color ?? '#1B2340' })),
                ...dayItems.tasks.map((t) => ({ title: t.title, color: t.assignee?.color ?? '#1B2340' })),
              ]

              return (
                <Link
                  key={i}
                  href={`/calendar?month=${yearStr}-${pad(month + 1)}&day=${cell.key}`}
                  className="min-h-[76px] rounded-2xl p-1.5 flex flex-col items-start justify-start"
                  style={{
                    background: isSelected ? '#F0EEE8' : '#fff',
                    border: isToday ? '2px solid #D8451F' : '1.5px solid #C7CCD6',
                  }}
                >
                  <span className="text-xs mb-1" style={{ fontWeight: isToday ? 700 : 600, color: isToday ? '#D8451F' : '#1B2340' }}>{cell.day}</span>
                  <div className="flex flex-col gap-[1px] w-full">
                    {allItems.slice(0, 2).map((item, di) => (
                      <p key={di} className="text-[9px] leading-tight truncate w-full text-left" style={{ color: item.color }}>
                        ● {item.title}
                      </p>
                    ))}
                    {allItems.length > 2 && <span className="text-[8px] text-charcoal-faint">+{allItems.length - 2} more</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <p className="text-[13px] font-semibold text-charcoal mb-2">
          {selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <CalendarQuickAdd
          dateKey={selectedDay}
          people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug }))}
          canAssignOthers={user.role === 'PARENT'}
          currentUserSlug={user.slug}
        />
        <div className="card p-4">
          {selectedItems.events.length === 0 && selectedItems.tasks.length === 0 && <p className="text-sm text-charcoal-faint">Nothing on this day.</p>}
          {selectedItems.events.map((e) => (
            <EditableEventRow
              key={e.id}
              id={e.id}
              title={e.title}
              time={new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              category={e.category}
              ownerName={e.owner?.displayName ?? (e.sharedFamily ? 'Family' : 'Parents')}
              ownerSlug={e.owner?.slug ?? (e.sharedFamily ? 'family' : 'parents')}
              ownerColor={e.owner?.color ?? '#1B2340'}
              people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug, color: p.color }))}
              canAssignOthers={user.role === 'PARENT'}
              currentUserSlug={user.slug}
            />
          ))}
          {selectedItems.tasks.map((t) => (
            <EditableTaskRow
              key={t.id}
              id={t.id}
              title={t.title}
              status={t.status}
              dueDate={t.dueDate ? t.dueDate.toISOString() : null}
              category={t.category}
              assigneeSlug={t.assignee?.slug ?? (t.sharedFamily ? 'family' : 'parents')}
              displayName={user.role === 'PARENT' ? `${t.assignee?.displayName ?? (t.sharedFamily ? 'Family' : 'Parents')}: ${t.title}` : t.title}
              people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug }))}
              canAssignOthers={user.role === 'PARENT'}
              currentUserSlug={user.slug}
            />
          ))}
        </div>
      </div>
    </main>
  )
}
