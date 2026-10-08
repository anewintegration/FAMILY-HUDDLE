import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getOpenTaskCount, getMonthItems } from '@/lib/data'
import { SHARED_COLORS } from '@/lib/categories'
import { formatTimeShort, hasClockTime, isValidDateKey, isValidMonthKey, monthKeyOf, monthKeyShift, toDateInput, todayKey } from '@/lib/dates'
import { eventRow, personOptions, taskRow, viewerOf } from '@/lib/rows'
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

export default async function CalendarPage({ searchParams }: { searchParams: { month?: string; day?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any
  const viewer = viewerOf(user)
  const isParent = viewer.role === 'PARENT'

  const now = new Date()
  const today = todayKey()
  const thisMonth = monthKeyOf(now)

  // The calendar only looks forward: a missing, odd or past month shows this month.
  const monthKey = isValidMonthKey(searchParams.month) && searchParams.month >= thisMonth ? searchParams.month : thisMonth
  const [year, monthNumber] = monthKey.split('-').map(Number)
  const month = monthNumber - 1

  // The chosen day has to be a real day, inside this month, and not in the past.
  const requestedDay = searchParams.day
  const selectedDay =
    isValidDateKey(requestedDay) && requestedDay.slice(0, 7) === monthKey && requestedDay >= today
      ? requestedDay
      : monthKey === thisMonth
        ? today
        : `${monthKey}-01`

  const [openTaskCount, { events, tasks }, people] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getMonthItems(user.role, user.id, year, month),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
  ])

  const itemsByDay: Record<string, { events: typeof events; tasks: typeof tasks }> = {}
  for (const e of events) {
    const key = toDateInput(e.startTime)
    itemsByDay[key] = itemsByDay[key] || { events: [], tasks: [] }
    itemsByDay[key].events.push(e)
  }
  for (const t of tasks) {
    if (!t.dueDate) continue
    const key = toDateInput(t.dueDate)
    itemsByDay[key] = itemsByDay[key] || { events: [], tasks: [] }
    itemsByDay[key].tasks.push(t)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startWeekday = new Date(year, month, 1).getDay()

  const prevMonthParam = monthKeyShift(monthKey, -1)
  const nextMonthParam = monthKeyShift(monthKey, 1)
  const canGoBack = monthKey > thisMonth

  const cells: { day: number | null; key: string | null }[] = []
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, key: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: `${monthKey}-${pad(d)}` })

  // A week that is completely over is left out, so there is no empty band at the top.
  const visibleCells: typeof cells = []
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7)
    if (week.some((c) => c.key !== null && c.key >= today)) visibleCells.push(...week)
  }

  // The chosen day, in time order, as the same rows used on every other screen.
  const selectedItems = itemsByDay[selectedDay] || { events: [], tasks: [] }
  const rowContext = { people: personOptions(people), canAssignOthers: isParent, currentUserSlug: viewer.slug }
  const agenda = [
    ...selectedItems.events.map((e) => ({
      at: e.startTime.getTime(),
      node: <EditableEventRow key={`e-${e.id}`} {...eventRow(e, viewer)} {...rowContext} showDate="never" showOwner={isParent} />,
    })),
    ...selectedItems.tasks.map((t) => ({
      at: (t.dueDate as Date).getTime(),
      node: <EditableTaskRow key={`t-${t.id}`} {...taskRow(t, viewer)} {...rowContext} showDate="never" showOwner={isParent} />,
    })),
  ].sort((a, b) => a.at - b.at)

  const [selY, selM, selD] = selectedDay.split('-').map(Number)
  const selectedDateObj = new Date(selY, selM - 1, selD)

  const navButton = 'tap-icon rounded-full bg-white flex items-center justify-center text-charcoal text-lg font-bold shadow-sm'

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} />
      <div className="w-full px-2 sm:px-4 py-4">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] gap-4 items-start">
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="font-display text-xl font-semibold text-white">
                {MONTH_NAMES[month]} {year}
              </p>
              <div className="flex items-center gap-2">
                {canGoBack ? (
                  <Link href={`/calendar?month=${prevMonthParam}`} className={navButton} aria-label="Previous month">
                    ‹
                  </Link>
                ) : (
                  <span className={`${navButton} opacity-30`} aria-hidden="true">
                    ‹
                  </span>
                )}
                <Link href={`/calendar?month=${thisMonth}&day=${today}`} className="tap text-xs font-bold px-3.5 py-1.5 rounded-full bg-white text-charcoal shadow-sm">
                  Today
                </Link>
                <Link href={`/calendar?month=${nextMonthParam}`} className={navButton} aria-label="Next month">
                  ›
                </Link>
              </div>
            </div>

            <div className="card p-2 sm:p-3">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((w) => (
                  <div key={w} className="text-[10px] font-bold text-charcoal-faint uppercase text-center py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {visibleCells.map((cell, i) => {
                  if (cell.day === null || cell.key === null) return <div key={i} />
                  // Days that are over stay blank - the calendar only looks ahead.
                  if (cell.key < today) return <div key={i} className="min-h-[92px]" />

                  const dayItems = itemsByDay[cell.key] || { events: [], tasks: [] }
                  const isToday = cell.key === today
                  const isSelected = cell.key === selectedDay
                  const entries = [
                    ...dayItems.events.map((e) => ({
                      at: e.startTime.getTime(),
                      text: `${formatTimeShort(e.startTime)} ${e.title}`,
                      color: e.owner?.color ?? (e.sharedFamily ? SHARED_COLORS.family : SHARED_COLORS.parents),
                    })),
                    ...dayItems.tasks.map((t) => ({
                      at: (t.dueDate as Date).getTime(),
                      text: `${hasClockTime(t.dueDate) ? formatTimeShort(t.dueDate as Date) + ' ' : ''}${t.title}`,
                      color: t.assignee?.color ?? (t.sharedFamily ? SHARED_COLORS.family : SHARED_COLORS.parents),
                    })),
                  ].sort((a, b) => a.at - b.at)

                  return (
                    <Link
                      key={i}
                      href={`/calendar?month=${monthKey}&day=${cell.key}`}
                      scroll={false}
                      aria-label={`${MONTH_NAMES[month]} ${cell.day}${entries.length ? `, ${entries.length} item${entries.length === 1 ? '' : 's'}` : ''}`}
                      aria-current={isSelected ? 'date' : undefined}
                      className="min-h-[92px] rounded-2xl p-1.5 flex flex-col items-start justify-start"
                      style={{
                        background: isSelected ? '#E3E8F0' : '#fff',
                        border: isSelected ? '2.5px solid #1B2340' : isToday ? '2px solid #D8451F' : '1.5px solid #8C93A3',
                      }}
                    >
                      <span className="text-xs mb-0.5" style={{ fontWeight: isToday ? 800 : 700, color: isToday ? '#D8451F' : '#1B2340' }}>
                        {cell.day}
                      </span>
                      <div className="flex flex-col gap-[2px] w-full">
                        {entries.slice(0, 3).map((item, di) => (
                          <p key={di} className="text-[10px] leading-tight truncate w-full text-left font-semibold" style={{ color: item.color }}>
                            ● {item.text}
                          </p>
                        ))}
                        {entries.length > 3 && <span className="text-[9px] font-semibold text-charcoal-muted">+{entries.length - 3} more</span>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 lg:mt-0 lg:sticky lg:top-[calc(var(--header-h,168px)_+_8px)]">
            <div className="card p-3.5">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="font-display text-[15px] font-bold text-charcoal">
                  {selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <span className="text-[11px] font-semibold text-charcoal-muted">
                  {agenda.length === 0 ? 'Nothing planned' : `${agenda.length} item${agenda.length === 1 ? '' : 's'}`}
                </span>
              </div>
              <CalendarQuickAdd key={selectedDay} dateKey={selectedDay} {...rowContext} />
              {agenda.length === 0 && <p className="text-sm text-charcoal-faint">Nothing on this day yet.</p>}
              {agenda.map((a) => a.node)}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
