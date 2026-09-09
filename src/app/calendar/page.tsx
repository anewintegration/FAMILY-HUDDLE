import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getMonthItems } from '@/lib/data'
import { categoryById, taskStatus } from '@/lib/categories'
import Header from '@/components/Header'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) {
  return n.toString().padStart(2, '0')
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { month?: string; day?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const now = new Date()
  const [yearStr, monthStr] = (searchParams.month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`).split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1 // JS Date months are 0-indexed

  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const selectedDay = searchParams.day || todayKey

  const [openTaskCount, { events, tasks }] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getMonthItems(user.role, user.id, year, month),
  ])

  // Group items by day-of-month for quick lookup while building the grid.
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
  const startWeekday = firstOfMonth.getDay() // 0 = Sunday

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
    <main className="min-h-screen bg-cream">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="font-display text-xl font-semibold text-charcoal">
            {MONTH_NAMES[month]} {year}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?month=${prevMonthParam}`}
              className="w-8 h-8 rounded-md bg-white border border-cream-border flex items-center justify-center text-charcoal-muted"
              aria-label="Previous month"
            >
              ‹
            </Link>
            <Link
              href={`/calendar?month=${thisMonthParam}&day=${todayKey}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-white border border-cream-border text-charcoal-muted"
            >
              Today
            </Link>
            <Link
              href={`/calendar?month=${nextMonthParam}`}
              className="w-8 h-8 rounded-md bg-white border border-cream-border flex items-center justify-center text-charcoal-muted"
              aria-label="Next month"
            >
              ›
            </Link>
          </div>
        </div>

        <div className="card p-3 mb-5">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="text-[10px] font-bold text-charcoal-faint uppercase text-center py-1">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.day === null) return <div key={i} />
              const dayItems = itemsByDay[cell.key!] || { events: [], tasks: [] }
              const totalCount = dayItems.events.length + dayItems.tasks.length
              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDay
              const dots = [
                ...dayItems.events.map((e) => e.owner?.color ?? '#3D3D3A'),
                ...dayItems.tasks.map((t) => t.assignee?.color ?? '#3D3D3A'),
              ].slice(0, 4)

              return (
                <Link
                  key={i}
                  href={`/calendar?month=${yearStr}-${pad(month + 1)}&day=${cell.key}`}
                  className="aspect-square rounded-md p-1 flex flex-col items-center justify-start"
                  style={{
                    background: isSelected ? '#DCE3D3' : '#fff',
                    border: isToday ? '1.5px solid #A85E42' : '0.5px solid #E9E3D6',
                  }}
                >
                  <span
                    className="text-xs mb-0.5"
                    style={{ fontWeight: isToday ? 700 : 400, color: isToday ? '#A85E42' : '#3D3D3A' }}
                  >
                    {cell.day}
                  </span>
                  {dots.length > 0 && (
                    <div className="flex flex-wrap gap-[2px] justify-center">
                      {dots.map((c, di) => (
                        <span key={di} className="w-[5px] h-[5px] rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                  )}
                  {totalCount > 4 && <span className="text-[8px] text-charcoal-faint mt-[1px]">+{totalCount - 4}</span>}
                </Link>
              )
            })}
          </div>
        </div>

        <p className="text-[13px] font-semibold text-charcoal mb-2">
          {selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="card p-4">
          {selectedItems.events.length === 0 && selectedItems.tasks.length === 0 && (
            <p className="text-sm text-charcoal-faint">Nothing on this day.</p>
          )}
          {selectedItems.events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-lg shadow-sm">
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: e.owner?.color ?? '#3D3D3A' }}
              >
                {(e.owner?.displayName ?? 'P')[0]}
              </div>
              <span className="text-xs font-semibold text-charcoal-muted w-16 shrink-0">
                {new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="text-sm flex-1">
                {user.role === 'PARENT' ? `${e.owner?.displayName ?? 'Parents'}: ${e.title}` : e.title}
              </span>
              {e.category && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ color: categoryById[e.category].color, background: `${categoryById[e.category].color}1A` }}
                >
                  {categoryById[e.category].label}
                </span>
              )}
            </div>
          ))}
          {selectedItems.tasks.map((t) => {
            const status = taskStatus({ status: t.status, dueDate: t.dueDate })
            return (
              <div key={t.id} className="flex items-center justify-between px-3 py-2.5 mb-2 bg-white border border-cream-border rounded-lg shadow-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full border shrink-0"
                    style={{ borderColor: t.status === 'DONE' ? '#7C9473' : '#9A9484', background: t.status === 'DONE' ? '#7C9473' : 'transparent' }}
                  />
                  <span className={`text-sm truncate ${t.status === 'DONE' ? 'line-through text-charcoal-faint' : ''}`}>
                    {user.role === 'PARENT' ? `${t.assignee?.displayName ?? 'Parents'}: ${t.title}` : t.title}
                  </span>
                  {t.category && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ color: categoryById[t.category].color, background: `${categoryById[t.category].color}1A` }}
                    >
                      {categoryById[t.category].label}
                    </span>
                  )}
                </div>
                {status && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
