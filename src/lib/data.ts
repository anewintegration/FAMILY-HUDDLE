import { prisma } from '@/lib/prisma'
import { Prisma, Category } from '@prisma/client'

// Builds the Prisma where-clause fragment for "items this session user may see".
// PARENT -> everyone's items, plus anything shared to "Parents" collectively.
// CHILD  -> only their own items (never sees Parents-shared items).
export function visibilityWhere(role: string, ownId: string): Prisma.TaskWhereInput {
  if (role === 'PARENT') {
    return { OR: [{ assigneeId: { not: null } }, { sharedParents: true }] }
  }
  return { assigneeId: ownId }
}

export function eventVisibilityWhere(role: string, ownId: string): Prisma.EventWhereInput {
  if (role === 'PARENT') {
    return { OR: [{ ownerId: { not: null } }, { sharedParents: true }] }
  }
  return { ownerId: ownId }
}

export async function getOpenTaskCount(role: string, ownId: string) {
  return prisma.task.count({
    where: { AND: [visibilityWhere(role, ownId), { status: 'OPEN' }] },
  })
}

// Date-range boundaries for the three dashboard buckets. weekOffset=0 is the
// current week (today/tomorrow live inside it); weekOffset>0 looks further ahead.
function bucketRange(bucket: 'today' | 'tomorrow' | 'week', weekOffset: number) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfter = new Date(startOfTomorrow)
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1)

  if (bucket === 'today') return { gte: startOfToday, lt: startOfTomorrow }
  if (bucket === 'tomorrow') return { gte: startOfTomorrow, lt: startOfDayAfter }

  // "week" bucket: for weekOffset 0, the rest of this week after tomorrow.
  // For weekOffset > 0, a full 7-day window that many weeks out.
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
    // Events only apply to the current week's buckets (no "future weeks" concept for events yet).
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
