import { prisma } from '@/lib/prisma'
import { Prisma, Category } from '@prisma/client'

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

export async function getOpenTaskCount(role: string, ownId: string) {
  return prisma.task.count({
    where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }] },
  })
}

// Today's completion (done vs total tasks due today) - powers the dashboard progress ring.
export async function getTodayProgress(role: string, ownId: string) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfter = new Date(startOfTomorrow)
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1)

  if (bucket === 'today') return { gte: startOfToday, lt: startOfTomorrow }
  if (bucket === 'tomorrow') return { gte: startOfTomorrow, lt: startOfDayAfter }

  if (weekOffset === 0) {
    const weekEnd = new Date(startOfToday)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return { gte: startOfDayAfter, lt: weekEnd }
  }
  const start = new Date(startOfToday)
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

  const [events, tasks] = await Promise.all([
    bucket !== 'week' || weekOffset === 0
      ? prisma.event.findMany({
          where: { AND: [eventVisibilityWhere(role, ownId), { startTime: range }, eventCategoryFilter] },
          include: { owner: true },
          orderBy: { startTime: 'asc' },
        })
      : Promise.resolve([]),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, { dueDate: range }, taskCategoryFilter] },
      include: { assignee: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  return { events, tasks }
}

export async function getTasksForUser(userId: string, status?: 'OPEN' | 'DONE') {
  return prisma.task.findMany({
    where: { assigneeId: userId, ...(status ? { status } : {}) },
    include: { assignee: true },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getEventsForUser(userId: string) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return prisma.event.findMany({
    where: { ownerId: userId, startTime: { gte: start } },
    orderBy: { startTime: 'asc' },
    take: 20,
  })
}

export async function getAllVisibleTasks(role: string, ownId: string) {
  return prisma.task.findMany({
    where: visibilityWhere(role, ownId),
    include: { assignee: true },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  })
}

export async function getAllVisibleEvents(role: string, ownId: string) {
  return prisma.event.findMany({
    where: eventVisibilityWhere(role, ownId),
    include: { owner: true },
    orderBy: { startTime: 'asc' },
  })
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

// Powers the dashboard hero's "What's happening this week" strip - Sunday
// through Saturday of the current calendar week, with per-day dot colors
// and a couple of plain-language highlights for the busiest days ahead.
export async function getWeekAheadData(role: string, ownId: string, category?: string | null) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfWindow = new Date(startOfToday)
  endOfWindow.setDate(endOfWindow.getDate() + 7)
  const cat = category as Category | undefined
  const eventCatFilter: Prisma.EventWhereInput = cat ? { category: cat } : {}
  const taskCatFilter: Prisma.TaskWhereInput = cat ? { category: cat } : {}

  const [events, tasks] = await Promise.all([
    prisma.event.findMany({
      where: { AND: [eventVisibilityWhere(role, ownId), { startTime: { gte: startOfToday, lt: endOfWindow } }, eventCatFilter] },
      include: { owner: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.task.findMany({
      where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }, { dueDate: { gte: startOfToday, lt: endOfWindow } }, taskCatFilter] },
      include: { assignee: true },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // Rolling window: today is always the leftmost cell, followed by the next 6 days.
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() + i)
    const dayEvents = events.filter((e) => sameDay(e.startTime, d))
    const dayTasks = tasks.filter((t) => t.dueDate && sameDay(t.dueDate, d))
    const colors = [
      ...dayEvents.map((e) => e.owner?.color ?? '#1B2340'),
      ...dayTasks.map((t) => t.assignee?.color ?? '#1B2340'),
    ].slice(0, 3)
    const items = [...dayEvents.map((e) => e.title), ...dayTasks.map((t) => t.title)]
    return {
      label: DAY_LABELS[d.getDay()],
      dateNum: d.getDate(),
      isToday: i === 0,
      colors,
      items,
      count: dayEvents.length + dayTasks.length,
    }
  })

  // Highlights: the two busiest days ahead, in plain language.
  const upcomingDays = days
    .map((day, i) => ({ ...day, offset: i }))
    .filter((day) => day.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)

  const highlights = upcomingDays.map((day) => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() + day.offset)
    const dayEvents = events.filter((e) => sameDay(e.startTime, d))
    const dayTasks = tasks.filter((t) => t.dueDate && sameDay(t.dueDate, d))
    const items = [...dayEvents.map((e) => e.title), ...dayTasks.map((t) => t.title)]
    const summary = items.length <= 2 ? items.join(', ') : `${items.slice(0, 1).join(', ')} + ${items.length - 1} more`
    return { label: day.label, summary, color: day.colors[0] || '#1B2340' }
  })

  return { days, highlights }
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// "Fine print" lookahead: notable items landing after this week but within
// the next 3 weeks, so parents can spot things worth prepping for early.
export async function getUpcomingWeeksPreview(role: string, ownId: string, category?: string | null) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const endOfThisWeek = new Date(startOfWeek)
  endOfThisWeek.setDate(endOfThisWeek.getDate() + 7)
  const rangeEnd = new Date(endOfThisWeek)
  rangeEnd.setDate(rangeEnd.getDate() + 21)
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
