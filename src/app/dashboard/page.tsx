import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { getBucketItems, getOpenTaskCount, getTopOfMindNotes, getTodayProgress, getWeekAheadData, getUpcomingWeeksPreview } from '@/lib/data'
import { formatWeekRange } from '@/lib/categories'
import { prisma } from '@/lib/prisma'
import Header from '@/components/Header'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { bucket?: string; week?: string; category?: string; view?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  const user = session.user as any

  const bucket = (['today', 'tomorrow', 'week'].includes(searchParams.bucket || '')
    ? searchParams.bucket
    : 'today') as 'today' | 'tomorrow' | 'week'
  const weekOffset = Math.max(0, Math.min(3, parseInt(searchParams.week || '0', 10) || 0))
  const category = searchParams.category || null
  const viewFilter = (['all', 'events', 'tasks'].includes(searchParams.view || '') ? searchParams.view : 'all') as 'all' | 'events' | 'tasks'

  const [openTaskCount, today, tomorrow, week, topOfMind, people, progress, weekAhead, finePrint] = await Promise.all([
    getOpenTaskCount(user.role, user.id),
    getBucketItems(user.role, user.id, 'today', 0, category),
    getBucketItems(user.role, user.id, 'tomorrow', 0, category),
    getBucketItems(user.role, user.id, 'week', weekOffset, category),
    user.role === 'PARENT' ? getTopOfMindNotes() : Promise.resolve([]),
    prisma.user.findMany({ orderBy: { role: 'asc' } }),
    getTodayProgress(user.role, user.id),
    getWeekAheadData(user.role, user.id, category),
    user.role === 'PARENT' ? getUpcomingWeeksPreview(user.role, user.id, category) : Promise.resolve([]),
  ])

  const countFor = (items: { events: any[]; tasks: any[] }) =>
    items.events.length + items.tasks.filter((t) => t.status === 'OPEN').length

  const selected = bucket === 'today' ? today : bucket === 'tomorrow' ? tomorrow : week

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const isParentFlag = user.role === 'PARENT'

  const pct = progress.total === 0 ? 100 : Math.round((progress.done / progress.total) * 100)
  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference - (pct / 100) * circumference

  const greetingSlot = (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 shrink-0">
        <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="16" cy="16" r="13" stroke="#EDEFF2" strokeWidth="3" fill="none" />
          <circle
            cx="16"
            cy="16"
            r="13"
            stroke="#0E7A6E"
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-[8px] font-bold text-charcoal">
          {pct}%
        </div>
      </div>
      <div>
        <p className="font-display text-[12px] font-bold text-charcoal leading-tight">{greeting}, Morse family</p>
        <p className="text-[10px] text-charcoal-faint">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )

  const weekAheadCard =
    isParentFlag && weekAhead.days.length > 0 ? (
      <div
        className="rounded-2xl px-4 py-3.5 w-full sm:w-[420px] sticky top-[168px] self-start max-h-[calc(100vh-190px)] overflow-y-auto"
        style={{ background: 'linear-gradient(135deg, #1B2340 0%, #151B33 60%, #0E1224 100%)' }}
      >
        <p className="font-display text-[10px] font-bold tracking-widest text-white/50 uppercase mb-2">
          What's happening this week
        </p>
        <div className="flex flex-col gap-2">
          {weekAhead.days.map((day) => (
            <Link
              key={day.label + day.dateNum}
              href="/calendar"
              className="rounded-xl px-4 py-3.5 min-h-[52px]"
              style={day.isToday ? { background: 'rgba(255,122,86,0.2)', border: '1px solid rgba(255,122,86,0.5)' } : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[12px] font-bold w-14 ${day.isToday ? 'text-terracotta-light' : 'text-white/50'}`}>{day.isToday ? 'Today' : day.label}</span>
                  <span className="text-[15px] font-bold text-white">{day.dateNum}</span>
                </div>
                <div className="flex gap-1">
                  {day.colors.map((c, i) => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </div>
              {day.items.length > 0 && (
                <div className="pl-16 flex flex-col gap-0.5">
                  {day.items.slice(0, 3).map((title, i) => (
                    <p key={i} className="text-[11px] text-white/70 truncate">{title}</p>
                  ))}
                  {day.items.length > 3 && (
                    <p className="text-[10px] text-white/40">+{day.items.length - 3} more</p>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
        {weekAhead.highlights.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
            {weekAhead.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: h.color }} />
                <span className="text-[10px] text-white/60">
                  <span className="font-semibold text-white/85">{h.label}:</span> {h.summary}
                </span>
              </div>
            ))}
          </div>
        )}
        {finePrint.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <p className="text-[8px] tracking-wide text-white/30 mb-0.5">Notable in the next 3 weeks</p>
            <p className="text-[9px] leading-relaxed text-white/40 italic">
              {finePrint.map((f, i) => (
                <span key={i}>
                  {f.label} — {f.title}
                  {i < finePrint.length - 1 ? '  •  ' : ''}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    ) : undefined

  const viewToggleBaseParams = `bucket=${bucket}${bucket === 'week' ? `&week=${weekOffset}` : ''}${category ? `&category=${category}` : ''}`
  const viewToggleSlot = (
    <div className="flex items-center gap-1.5">
      {(['all', 'events', 'tasks'] as const).map((v) => {
        const active = viewFilter === v
        return (
          <Link
            key={v}
            href={`/dashboard?${viewToggleBaseParams}&view=${v}`}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={active ? { background: '#1B2340', color: '#fff' } : { background: '#F4F5F7', color: '#6B6F7A', border: '1px solid #E9EBEF' }}
          >
            {v === 'all' ? 'All' : v === 'events' ? 'Events' : 'Tasks'}
          </Link>
        )
      })}
    </div>
  )

  return (
    <main className="min-h-screen">
      <Header openTaskCount={openTaskCount} role={user.role} slug={user.slug} rightSlot={greetingSlot} middleSlot={viewToggleSlot} />
      <div className="flex flex-col lg:flex-row gap-4 px-2 pt-2 items-start">
        {weekAheadCard}
        <div className="flex-1 min-w-0 w-full">
      <DashboardClient
        role={user.role}
        currentUserId={user.id}
        currentUserSlug={user.slug}
        greeting={greeting}
        progress={progress}
        weekAhead={weekAhead}
        finePrint={finePrint}
        bucket={bucket}
        weekOffset={weekOffset}
        weekLabel={formatWeekRange(weekOffset)}
        category={category}
        viewFilter={viewFilter}
        counts={{ today: countFor(today), tomorrow: countFor(tomorrow), week: countFor(week) }}
        bullets={{
          today: [...today.events.map((e) => e.title), ...today.tasks.map((t) => t.title)].slice(0, 3),
          tomorrow: [...tomorrow.events.map((e) => e.title), ...tomorrow.tasks.map((t) => t.title)].slice(0, 3),
          week: [...week.events.map((e) => e.title), ...week.tasks.map((t) => t.title)].slice(0, 3),
        }}
        selected={{
          events: selected.events.map((e: any) => ({
            id: e.id,
            title: e.title,
            time: new Date(e.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            category: e.category,
            ownerName: e.owner?.displayName ?? (e.sharedFamily ? 'Family' : 'Parents'),
            ownerColor: e.owner?.color ?? '#1B2340',
            ownerInitial: (e.owner?.displayName ?? 'P')[0],
          })),
          tasks: selected.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            category: t.category,
            ownerName: t.assignee?.displayName ?? (t.sharedFamily ? 'Family' : 'Parents'),
          })),
        }}
        topOfMind={topOfMind.map((n) => ({ id: n.id, text: n.text }))}
        people={people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug, role: p.role }))}
      />
        </div>
      </div>
    </main>
  )
}
