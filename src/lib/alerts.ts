// Who gets which alert, and what it says.
//
// The plan... functions are plain (no database, no network), so the rules are easy to test and
// easy to read: they take the family and what just happened, and return a list of alerts.
// The notify... functions at the bottom load the family, plan, and hand the result to the sender.
// They run in the background and never fail the save that triggered them.

import { prisma } from '@/lib/prisma'
import { sendToUser } from '@/lib/push'
import type { PushPayload } from '@/lib/push'
import { addDaysKey, hasClockTime, toDateInput } from '@/lib/dates'

export type Role = 'PARENT' | 'CHILD'

/** What the alerts need to know about a family member (never their password). */
export type Person = {
  id: string
  role: Role
  displayName: string
  alertChanges: boolean
  alertDone: boolean
  alertBoard: boolean
  alertReminders: boolean
}

export const PERSON_SELECT = {
  id: true,
  role: true,
  displayName: true,
  alertChanges: true,
  alertDone: true,
  alertBoard: true,
  alertReminders: true,
} as const

/** The person who just did something. They are never alerted about their own action. */
export type Actor = { id: string; name: string; role: Role }

export function actorOf(user: { id: string; name?: string | null; role: Role }): Actor {
  return { id: user.id, name: user.name || 'Someone', role: user.role }
}

/** A task or an event, reduced to what the alert rules care about. */
export type Item = {
  kind: 'task' | 'event'
  id: string
  title: string
  /** The due date and time (tasks) or the start (events). */
  when: Date | null
  /** False for a task saved with no time ("any time that day"). */
  clock: boolean
  /** The one person it belongs to, if any. */
  personId: string | null
  creatorId: string | null
  sharedParents: boolean
  sharedFamily: boolean
  done: boolean
  /**
   * For an entry of a repeat, a few words the alert adds: "every week until Tue, Dec 15" when a repeat is made,
   * "and all following" when an edit or a removal covers the rest of it. Set by the route, never read from the database.
   */
  repeatNote?: string
}

type TaskRow = {
  id: string
  title: string
  status: string
  dueDate: Date | null
  assigneeId: string | null
  createdById: string
  sharedParents: boolean
  sharedFamily: boolean
}

type EventRow = {
  id: string
  title: string
  startTime: Date
  ownerId: string | null
  sharedParents: boolean
  sharedFamily: boolean
}

export function taskItem(t: TaskRow): Item {
  return {
    kind: 'task',
    id: t.id,
    title: t.title,
    when: t.dueDate,
    clock: hasClockTime(t.dueDate),
    personId: t.assigneeId,
    creatorId: t.createdById,
    sharedParents: t.sharedParents,
    sharedFamily: t.sharedFamily,
    done: t.status === 'DONE',
  }
}

export function eventItem(e: EventRow): Item {
  return {
    kind: 'event',
    id: e.id,
    title: e.title,
    when: e.startTime,
    clock: true,
    personId: e.ownerId,
    creatorId: null,
    sharedParents: e.sharedParents,
    sharedFamily: e.sharedFamily,
    done: false,
  }
}

/**
 * Can this person see this item? The same rule as the screens use (visibilityWhere in data.ts):
 * parents see everything that belongs to someone or is shared; kids see their own and
 * whatever is shared with the family. An alert never goes to someone who could not open the item.
 */
export function canSee(person: Pick<Person, 'id' | 'role'>, item: Pick<Item, 'personId' | 'sharedParents' | 'sharedFamily'>): boolean {
  if (person.role === 'PARENT') return item.personId !== null || item.sharedParents || item.sharedFamily
  return item.personId === person.id || item.sharedFamily
}

// ---------------------------------------------------------------- wording

// Newer versions of Node put a thin non-breaking space before AM / PM; a plain space reads the same
// everywhere.
const tidy = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ')

export const timeLabel = (d: Date) => tidy(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))

export function dayLabel(d: Date, now: Date): string {
  const key = toDateInput(d)
  const today = toDateInput(now)
  if (key === today) return 'Today'
  if (key === addDaysKey(today, 1)) return 'Tomorrow'
  return tidy(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
}

export function whenLabel(item: Item, now: Date): string {
  if (!item.when) return ''
  return item.clock ? `${dayLabel(item.when, now)} · ${timeLabel(item.when)}` : dayLabel(item.when, now)
}

export function nameOf(people: Person[], id: string): string {
  return people.find((p) => p.id === id)?.displayName ?? 'someone'
}

/** "Dentist — Tomorrow · 3:30 PM · for Benjamin" */
function withDetails(title: string, ...details: string[]): string {
  const rest = details.filter(Boolean).join(' · ')
  return rest ? `${title} — ${rest}` : title
}

const article = (item: Item) => (item.kind === 'event' ? 'an event' : 'a task')

function forWhom(item: Item, recipientId: string, actorId: string, people: Person[]): string {
  if (item.personId) {
    if (item.personId === actorId) return '' // they did it for themselves
    if (item.personId === recipientId) return 'for you'
    return `for ${nameOf(people, item.personId)}`
  }
  return item.sharedFamily ? 'for the family' : 'for the parents'
}

/** Where tapping an alert about this item goes: its day on the calendar (or the dashboard). */
export function linkFor(item: Item): string {
  if (!item.when) return '/dashboard'
  const day = toDateInput(item.when)
  return `/calendar?month=${day.slice(0, 7)}&day=${day}`
}

// ---------------------------------------------------------------- the rules

export type Plan = { userId: string; payload: PushPayload; ttl?: number }

// An update that sits unread for hours is stale; let the push service drop it after six.
const UPDATE_TTL = 6 * 60 * 60

/** A new task or event: everyone who can see it, except the person who made it. */
export function planAdded(people: Person[], item: Item, actor: Actor, now: Date): Plan[] {
  return people
    .filter((p) => p.id !== actor.id && p.alertChanges && canSee(p, item))
    .map((p) => ({
      userId: p.id,
      ttl: UPDATE_TTL,
      payload: {
        title: `${actor.name} added ${article(item)}`,
        body: withDetails(item.title, whenLabel(item, now), item.repeatNote ?? '', forWhom(item, p.id, actor.id, people)),
        url: linkFor(item),
        tag: `item-${item.id}`,
      },
    }))
}

/** An existing task or event was made to repeat: everyone who can see it, except the person who did it. */
export function planRepeatStarted(people: Person[], item: Item, actor: Actor, now: Date): Plan[] {
  return people
    .filter((p) => p.id !== actor.id && p.alertChanges && canSee(p, item))
    .map((p) => ({
      userId: p.id,
      ttl: UPDATE_TTL,
      payload: {
        title: `${actor.name} made ${article(item)} repeat`,
        body: withDetails(item.title, whenLabel(item, now), item.repeatNote ?? '', forWhom(item, p.id, actor.id, people)),
        url: linkFor(item),
        tag: `item-${item.id}`,
      },
    }))
}

/**
 * Something about an item was edited. Finishing a task tells the person who set it (and, when a
 * kid finishes something, the parents). A new time or a new name tells everyone who can see it.
 * Someone who has just been given the item hears "added", because for them it is new.
 */
export function planChanged(people: Person[], before: Item, after: Item, actor: Actor, now: Date): Plan[] {
  const plans: Plan[] = []

  if (!before.done && after.done) {
    const wanted = new Set<string>(actor.role === 'CHILD' ? people.filter((p) => p.role === 'PARENT').map((p) => p.id) : [])
    if (after.creatorId) wanted.add(after.creatorId)
    wanted.delete(actor.id)
    for (const p of people) {
      if (!wanted.has(p.id) || !p.alertDone || !canSee(p, after)) continue
      plans.push({
        userId: p.id,
        ttl: UPDATE_TTL,
        payload: { title: `${actor.name} finished a task`, body: after.title, url: '/dashboard', tag: `done-${after.id}` },
      })
    }
  }

  // Changes to something already finished are not news.
  if (after.done) return plans

  const sawBefore = new Set(people.filter((p) => canSee(p, before)).map((p) => p.id))
  const timeChanged = (before.when?.getTime() ?? null) !== (after.when?.getTime() ?? null)
  const titleChanged = before.title !== after.title

  for (const p of people) {
    if (p.id === actor.id || !p.alertChanges || !canSee(p, after)) continue
    let title: string
    let body: string
    if (!sawBefore.has(p.id)) {
      title = `${actor.name} added ${article(after)}`
      body = withDetails(after.title, whenLabel(after, now), forWhom(after, p.id, actor.id, people))
    } else if (timeChanged) {
      if (after.kind === 'event') {
        title = `${actor.name} moved an event`
        body = withDetails(after.title, `now ${whenLabel(after, now)}`, after.repeatNote ?? '')
      } else if (after.when) {
        title = `${actor.name} rescheduled a task`
        body = withDetails(after.title, `now due ${whenLabel(after, now)}`, after.repeatNote ?? '')
      } else {
        title = `${actor.name} updated a task`
        body = withDetails(after.title, 'no due date now')
      }
    } else if (titleChanged) {
      title = `${actor.name} updated ${article(after)}`
      body = `${after.title} — was "${before.title}"${after.repeatNote ? ` · ${after.repeatNote}` : ''}`
    } else {
      continue
    }
    plans.push({ userId: p.id, ttl: UPDATE_TTL, payload: { title, body, url: linkFor(after), tag: `item-${after.id}` } })
  }
  return plans
}

/**
 * A task or event was removed. Only worth an alert while it still mattered: not a task that was
 * already done or days overdue, and not an event that already happened.
 */
export function planRemoved(people: Person[], item: Item, actor: Actor, now: Date): Plan[] {
  if (item.done) return []
  if (item.when) {
    if (item.kind === 'event' && item.when.getTime() < now.getTime()) return []
    if (item.kind === 'task' && toDateInput(item.when) < toDateInput(now)) return []
  }
  return people
    .filter((p) => p.id !== actor.id && p.alertChanges && canSee(p, item))
    .map((p) => ({
      userId: p.id,
      ttl: UPDATE_TTL,
      payload: {
        title: `${actor.name} ${item.kind === 'event' ? 'cancelled an event' : 'removed a task'}`,
        body: withDetails(item.title, item.when ? `was ${whenLabel(item, now)}` : '', item.repeatNote ?? ''),
        url: '/dashboard',
        tag: `item-${item.id}`,
      },
    }))
}

/** A whiteboard post: the whole family, except the person who wrote it. */
export function planBoardPost(people: Person[], post: { id: string; text: string }, author: Actor): Plan[] {
  const text = post.text.length > 140 ? post.text.slice(0, 139).trimEnd() + '…' : post.text
  return people
    .filter((p) => p.id !== author.id && p.alertBoard)
    .map((p) => ({
      userId: p.id,
      ttl: UPDATE_TTL,
      payload: { title: `${author.name} posted on the whiteboard`, body: text, url: '/whiteboard', tag: `board-${post.id}` },
    }))
}

// ---------------------------------------------------------------- sending

const inflight = new Set<Promise<unknown>>()

/** Runs alert work after the save has already been answered; whatever goes wrong stays here. */
function inBackground(work: () => Promise<unknown>): void {
  const job: Promise<unknown> = Promise.resolve()
    .then(work)
    .catch((e) => console.warn('alerts: skipped an alert:', e instanceof Error ? e.message : e))
    .then(() => {
      inflight.delete(job)
    })
  inflight.add(job)
}

/** For tests: resolves once every alert started so far has been handed to the push service. */
export async function alertsSettled(): Promise<void> {
  while (inflight.size > 0) await Promise.all([...inflight])
}

// Most of the time nobody has turned alerts on yet; one cheap count avoids loading the family.
async function familyIfAnyDevices(): Promise<Person[] | null> {
  if ((await prisma.pushSubscription.count()) === 0) return null
  return prisma.user.findMany({ select: PERSON_SELECT })
}

async function deliver(plans: Plan[]): Promise<void> {
  await Promise.all(plans.map((p) => sendToUser(p.userId, p.payload, { ttl: p.ttl })))
}

export function notifyAdded(item: Item, actor: Actor): void {
  inBackground(async () => {
    const people = await familyIfAnyDevices()
    if (people) await deliver(planAdded(people, item, actor, new Date()))
  })
}

export function notifyRepeatStarted(item: Item, actor: Actor): void {
  inBackground(async () => {
    const people = await familyIfAnyDevices()
    if (people) await deliver(planRepeatStarted(people, item, actor, new Date()))
  })
}

export function notifyChanged(before: Item, after: Item, actor: Actor): void {
  inBackground(async () => {
    const people = await familyIfAnyDevices()
    if (people) await deliver(planChanged(people, before, after, actor, new Date()))
  })
}

export function notifyRemoved(item: Item, actor: Actor): void {
  inBackground(async () => {
    const people = await familyIfAnyDevices()
    if (people) await deliver(planRemoved(people, item, actor, new Date()))
  })
}

export function notifyBoardPost(post: { id: string; text: string }, author: Actor): void {
  inBackground(async () => {
    const people = await familyIfAnyDevices()
    if (people) await deliver(planBoardPost(people, post, author))
  })
}
