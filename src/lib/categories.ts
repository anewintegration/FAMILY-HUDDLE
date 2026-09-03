export type CategoryId = 'SPORTS' | 'HEALTH' | 'SCHOOL' | 'FRIENDS' | 'FAMILY' | 'WORK' | 'PERSONAL'

export const CATEGORIES: { id: CategoryId; label: string; color: string }[] = [
  { id: 'SPORTS', label: 'Sports', color: '#4C86A8' },
  { id: 'HEALTH', label: 'Health', color: '#A85E42' },
  { id: 'SCHOOL', label: 'School', color: '#A87C31' },
  { id: 'FRIENDS', label: 'Friends', color: '#5E7256' },
  { id: 'FAMILY', label: 'Family', color: '#8B6F47' },
  { id: 'WORK', label: 'Work', color: '#5C6F7D' },
  { id: 'PERSONAL', label: 'Personal', color: '#A8768F' },
]

export const categoryById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

// Kids get Sports/Health/School/Friends/Family. Parents get Family/Work/Personal.
const BOY_CATEGORY_IDS: CategoryId[] = ['SPORTS', 'HEALTH', 'SCHOOL', 'FRIENDS', 'FAMILY']
const PARENT_CATEGORY_IDS: CategoryId[] = ['FAMILY', 'WORK', 'PERSONAL']

export function categoriesForSlug(slug: string) {
  if (slug === 'benjamin' || slug === 'bradley') {
    return CATEGORIES.filter((c) => BOY_CATEGORY_IDS.includes(c.id))
  }
  if (slug === 'dad' || slug === 'mom' || slug === 'parents') {
    return CATEGORIES.filter((c) => PARENT_CATEGORY_IDS.includes(c.id))
  }
  return []
}

export type TaskLike = {
  status: 'OPEN' | 'DONE'
  dueDate: Date | null
}

export type TaskStatusBadge = {
  label: 'Overdue' | 'Due now' | 'Due soon'
  className: string
} | null

// Computes the Overdue / Due now / Due soon badge from a real due date,
// replacing the mock "when" bucket used during design.
export function taskStatus(task: TaskLike): TaskStatusBadge {
  if (task.status === 'DONE' || !task.dueDate) return null

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfter = new Date(startOfTomorrow)
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1)

  const due = task.dueDate

  if (due < now) return { label: 'Overdue', className: 'status-overdue' }
  if (due < startOfTomorrow) return { label: 'Due now', className: 'status-due-now' }
  return { label: 'Due soon', className: 'status-due-soon' }
}

// Which bucket (today / tomorrow / week) a due date falls into, used by the
// dashboard's three Must Do columns. "week" covers day 2 through day 7.
export function bucketForDate(date: Date, weekOffset = 0): 'today' | 'tomorrow' | 'week' | 'later' | 'none' {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfTomorrow = new Date(startOfToday)
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1)
  const startOfDayAfter = new Date(startOfTomorrow)
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1)
  const weekStart = new Date(startOfToday)
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  if (weekOffset === 0) {
    if (date < startOfTomorrow) return 'today'
    if (date < startOfDayAfter) return 'tomorrow'
    if (date < weekEnd) return 'week'
    return 'later'
  }
  if (date >= weekStart && date < weekEnd) return 'week'
  return 'later'
}

export function formatWeekRange(weekOffset: number) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(startOfToday)
  start.setDate(start.getDate() + weekOffset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}
