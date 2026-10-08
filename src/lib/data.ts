import { prisma } from '@/lib/prisma'
import { Prisma, Category } from '@prisma/client'
import { SHARED_COLORS } from '@/lib/categories'
import { toDateInput, hasClockTime, formatTime } from '@/lib/dates'

export function visibilityWhere(role: string, ownId: string): Prisma.TaskWhereInput {
  if (role === 'PARENT') {
    return { OR: [{ assigneeId: { not: null } }, { sharedParents: true }, { sharedFamily: true }] }
  }
  return { OR: [{ assigneeId: ownId }, { sharedFamily: true }] }
}

export function eventVisibilityWhere(role: string, ownId: string): Prisma.EventWhereInput {
  if (role === 'PARENT') {
    return { OR: [{ ownerId: { not: null } }, { sharedParents: true }, { sharedFamily: true }] }
  }
  return { OR: [{ ownerId: ownId }, { sharedFamily: true }] }
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export async function getOpenTaskCount(role: string, ownId: string) {
  return prisma.task.count({
    where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }] },
  })
}

// Today's completion (done vs total tasks due today) - powers the dashboard progress ring.
export async function getTodayProgress(role: string, ownId: string) {
  const start = startOfToday()
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const [total, done] = await Promise.all([
    prisma.task.count({ where: { AND: [visibilityWhere(role, ownId), { dueDate: { gte: start, lt: end } }] } }),
    prisma.task.count({
      where: { AND: [visibilityWhere(role, ownId), { dueDate: { gte: start, lt: end } }, { status: 'DONE' }] },
    }),
  ])
  return { done, total }
}

function bucketRange(bucket: 'today' | 'tomorrow' | 'week', weekOffset: number) {
  const today = startOfToday()
  const startOfTomorrow = new Date(today)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfter = new Date(startOfTomorrow)
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1)

  if (bucket === 'today') return { gte: today, lt: startOfTomorrow }
  if (bucket === 'tomorrow') return { gte: startOfTomorrow, lt: startOfDayAfter }

  if (weekOffset === 0) {
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return { gte: startOfDayAfter, lt: weekEnd }
  }
  const start = new Date(today)
  start.setDate(start.getDate() + weekOffset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { gte: start, lt: end }
}

export async function getBucketItems(
  role: string,
  ownId: string,
  bucket: 'today' | 'tomorrow' | 'week',
  weekOffset = 0,
  category?: string | null
) {
  const range = bucketRange(bucket, weekOffset)
  const cat = category as Category | undefined
  const eventCategoryFilter: Prisma.EventWhereInput = cat ? { category: cat } : {}
  const taskCategoryFilter: Prisma.TaskWhereInput = cat ? { category: cat } : {}

  // Open tasks from earlier days that never got done ride along on "Today", so the
  // "past due - reschedule or mark done" prompt actually reaches someone. (Tasks with
  // no due date are not "late", so a less-than filter leaves them out.)
  const taskDueFilter: Prisma.TaskWhereInput = bucket === 'today' ? { dueDate: { lt: range.lt } } : { dueDate: range }

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: range }, eventCategoryFilter] },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, taskDueFilter, taskCategoryFilter] },
      include: { assignee: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  return { events, tasks }
}

// One person's open tasks, soonest first (tasks with no date sink to the bottom).
export async function getTasksForUser(userId: string, status?: 'OPEN' | 'DONE') {
  return prisma.task.findMany({
    where: { assigneeId: userId, ...(status ? { status } : {}) },
    include: { assignee: true },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })
}

// One person's events from the start of today (so one that already happened today
// is still there to be rescheduled or removed).
export async function getEventsForUser(userId: string) {
  return prisma.event.findMany({
    where: { ownerId: userId, startTime: { gte: startOfToday() } },
    include: { owner: true },
    orderBy: { startTime: 'asc' },
    take: 20,
  })
}

// Every open task the viewer can see, then the most recent finished ones.
export async function getAllVisibleTasks(role: string, ownId: string) {
  const [open, done] = await Promise.all([
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }] },
      include: { assignee: true },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'DONE' }] },
      include: { assignee: true },
      orderBy: [{ completedAt: 'desc' }],
      take: 100,
    }),
  ])
  return [...open, ...done]
}

// Upcoming events (from the start of today) soonest first, then the 50 most recent past ones.
export async function getAllVisibleEvents(role: string, ownId: string) {
  const start = startOfToday()
  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { gte: start } }] },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { lt: start } }] },
      include: { owner: true },
      orderBy: { startTime: 'desc' },
      take: 50,
    }),
  ])
  return [...upcoming, ...past]
}

export async function getTopOfMindNotes() {
  return prisma.topOfMindNote.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getChecklist(kind: 'GOAL' | 'BUCKET_LIST') {
  return prisma.checklistItem.findMany({ where: { kind }, orderBy: { createdAt: 'asc' } })
}

export async function getWhiteboardPosts() {
  return prisma.whiteboardPost.findMany({
    include: { author: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function getMonthItems(role: string, ownId: string, year: number, month: number) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { gte: start, lt: end } }] },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, { dueDate: { gte: start, lt: end } }] },
      include: { assignee: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  return { events, tasks }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Powers the "What's happening this week" card: a rolling 7 days with today first,
// each day listing its items in time order (open tasks only), plus a couple of
// plain-language highlights for the busiest days.
export async function getWeekAheadData(role: string, ownId: string, category?: string | null) {
  const today = startOfToday()
  const endOfWindow = new Date(today)
  endOfWindow.setDate(endOfWindow.getDate() + 7)
  const cat = category as Category | undefined
  const eventCatFilter: Prisma.EventWhereInput = cat ? { category: cat } : {}
  const taskCatFilter: Prisma.TaskWhereInput = cat ? { category: cat } : {}

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { gte: today, lt: endOfWindow } }, eventCatFilter] },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, { dueDate: { gte: today, lt: endOfWindow } }, taskCatFilter] },
      include: { assignee: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)

    const entries = [
      ...events
        .filter((e) => sameDay(e.startTime, d))
        .map((e) => ({
          at: e.startTime.getTime(),
          text: e.title,
          time: formatTime(e.startTime) as string | null,
          color: e.owner?.color ?? (e.sharedFamily ? SHARED_COLORS.family : SHARED_COLORS.parents),
        })),
      ...tasks
        .filter((t) => t.dueDate && sameDay(t.dueDate, d))
        .map((t) => ({
          at: (t.dueDate as Date).getTime(),
          text: t.title,
          time: hasClockTime(t.dueDate) ? (formatTime(t.dueDate as Date) as string | null) : null,
          color: t.assignee?.color ?? (t.sharedFamily ? SHARED_COLORS.family : SHARED_COLORS.parents),
        })),
    ].sort((a, b) => a.at - b.at)

    return {
      label: DAY_LABELS[d.getDay()],
      dateNum: d.getDate(),
      dateKey: toDateInput(d),
      isToday: i === 0,
      colors: entries.slice(0, 3).map((x) => x.color),
      items: entries.map((x) => ({ text: x.text, time: x.time })),
      count: entries.length,
    }
  })

  // Highlights: the two busiest days, in plain language.
  const highlights = days
    .filter((day) => day.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((day) => {
      const names = day.items.map((x) => x.text)
      const summary = names.length <= 2 ? names.join(', ') : `${names[0]} + ${names.length - 1} more`
      return { label: day.isToday ? 'Today' : day.label, summary, color: day.colors[0] || SHARED_COLORS.parents }
    })

  return { days, highlights }
}

// "Fine print" lookahead: notable items after the 7 days shown in the week card and
// within the next 4 weeks, so parents can spot things worth prepping for early.
export async function getUpcomingWeeksPreview(role: string, ownId: string, category?: string | null) {
  const today = startOfToday()
  const endOfThisWeek = new Date(today)
  endOfThisWeek.setDate(endOfThisWeek.getDate() + 7)
  const rangeEnd = new Date(today)
  rangeEnd.setDate(rangeEnd.getDate() + 28)
  const cat = category as Category | undefined
  const eventCatFilter: Prisma.EventWhereInput = cat ? { category: cat } : {}
  const taskCatFilter: Prisma.TaskWhereInput = cat ? { category: cat } : {}

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { gte: endOfThisWeek, lt: rangeEnd } }, eventCatFilter] },
      orderBy: { startTime: 'asc' },
      take: 10,
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, { dueDate: { gte: endOfThisWeek, lt: rangeEnd } }, taskCatFilter] },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ])

  const items = [
    ...events.map((e) => ({ date: e.startTime, title: e.title })),
    ...tasks.map((t) => ({ date: t.dueDate as Date, title: t.title })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4)

  return items.map((i) => ({
    label: i.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    title: i.title,
  }))
}
