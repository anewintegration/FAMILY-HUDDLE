// Turns database records into the plain, serializable props the shared task and
// event rows need - and decides, once, who is allowed to change what. Every
// screen uses these, so the buttons you see are the same everywhere.

import { SHARED_COLORS } from '@/lib/categories'

export type Viewer = { id: string; role: 'PARENT' | 'CHILD'; slug: string }

export type PersonOption = { id: string; name: string; slug: string; color: string }

export type TaskRowData = {
  id: string
  title: string
  status: 'OPEN' | 'DONE'
  dueDate: string | null
  category: string | null
  assigneeSlug: string
  assigneeLabel: string
  canModify: boolean
  canToggle: boolean
}

export type EventRowData = {
  id: string
  title: string
  startTime: string
  category: string | null
  ownerSlug: string
  ownerLabel: string
  ownerColor: string
  canModify: boolean
}

export function viewerOf(user: any): Viewer {
  return { id: user.id, role: user.role, slug: user.slug }
}

export function personOptions(people: any[]): PersonOption[] {
  return people.map((p) => ({ id: p.id, name: p.displayName, slug: p.slug, color: p.color }))
}

// Parents can change anything. A kid can change their own tasks, and can check
// off (but not edit or delete) a task that belongs to the whole family.
export function taskRow(t: any, viewer: Viewer): TaskRowData {
  const isParent = viewer.role === 'PARENT'
  const canModify = isParent || t.assigneeId === viewer.id
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    category: t.category ?? null,
    assigneeSlug: t.assignee?.slug ?? (t.sharedFamily ? 'family' : 'parents'),
    assigneeLabel: t.assignee?.displayName ?? (t.sharedFamily ? 'Family' : 'Parents'),
    canModify,
    canToggle: canModify || !!t.sharedFamily,
  }
}

// Parents can change any event; a kid only their own.
export function eventRow(e: any, viewer: Viewer): EventRowData {
  const isParent = viewer.role === 'PARENT'
  return {
    id: e.id,
    title: e.title,
    startTime: new Date(e.startTime).toISOString(),
    category: e.category ?? null,
    ownerSlug: e.owner?.slug ?? (e.sharedFamily ? 'family' : 'parents'),
    ownerLabel: e.owner?.displayName ?? (e.sharedFamily ? 'Family' : 'Parents'),
    ownerColor: e.owner?.color ?? (e.sharedFamily ? SHARED_COLORS.family : SHARED_COLORS.parents),
    canModify: isParent || e.ownerId === viewer.id,
  }
}
