// The alerts that happen on their own, with nobody pressing anything:
//   - "Soccer practice — in 30 min", shortly before an event or a timed task
//   - the morning briefing: what is on today, once a day
//
// A timer inside the server wakes up every minute and looks. Each alert is noted in the AlertLog
// table the moment it is claimed, so a restart (or a second server) can never send it twice.
// Like the rest of the alerts code, none of this may ever break the app: it only logs.

import { prisma } from '@/lib/prisma'
import { sendToUser } from '@/lib/push'
import type { PushPayload } from '@/lib/push'
import { PERSON_SELECT, canSee, eventItem, linkFor, nameOf, taskItem, timeLabel } from '@/lib/alerts'
import type { Item, Person } from '@/lib/alerts'
import { toDateInput } from '@/lib/dates'

const MINUTE = 60_000
const REMIND_MINUTES_AHEAD = 30
const BRIEFING_FIRST_HOUR = 7 // the briefing goes out from 7:00 ...
const BRIEFING_LAST_HOUR = 9 // ... and still goes out until 9:59 (if the server was asleep at 7)
const KEEP_LOG_DAYS = 14
const MAX_BRIEFING_LINES = 5

export type ScheduledAlert = { userId: string; key: string; payload: PushPayload; ttl: number }

// ---------------------------------------------------------------- reminders

// Whose phone buzzes for this item: the person it belongs to, or - for a shared item - everyone it is shared with.
function hears(person: Person, item: Item): boolean {
  if (!canSee(person, item)) return false
  return item.personId ? person.id === item.personId : true
}

/**
 * Items that start within the next 30 minutes get one heads-up each. `people` are the family
 * members who want reminders and have a device. Tasks without a time ("any time that day") never
 * count, and neither do finished ones.
 */
export function planReminders(people: Person[], items: Item[], now: Date): ScheduledAlert[] {
  const out: ScheduledAlert[] = []
  const nowMs = now.getTime()
  for (const item of items) {
    if (!item.when || !item.clock || item.done) continue
    const at = item.when.getTime()
    if (at <= nowMs || at > nowMs + REMIND_MINUTES_AHEAD * MINUTE) continue
    const minutes = Math.max(1, Math.ceil((at - nowMs) / MINUTE))
    const shared = item.personId ? '' : item.sharedFamily ? ' · for the family' : ' · for the parents'
    for (const person of people) {
      if (!person.alertReminders || !hears(person, item)) continue
      out.push({
        userId: person.id,
        // Moving the item to another time makes it a new reminder; the same time never repeats.
        key: `remind:${item.kind}:${item.id}:${at}:${person.id}`,
        // No use delivering "starts in 30 min" after it has started.
        ttl: Math.max(60, Math.floor((at - nowMs) / 1000)),
        payload: {
          title: `${item.title} — in ${minutes} min`,
          body: `${item.kind === 'task' ? 'Task due' : 'Starts'} ${timeLabel(item.when)}${shared}`,
          url: linkFor(item),
          tag: `remind-${item.id}`,
        },
      })
    }
  }
  return out
}

// ---------------------------------------------------------------- morning briefing

const sameLocalDay = (a: Date, b: Date) => toDateInput(a) === toDateInput(b)

function briefingLine(item: Item, person: Person, everyone: Person[]): string {
  const when = item.clock && item.when ? timeLabel(item.when) : 'Anytime'
  const title = item.title.length > 50 ? item.title.slice(0, 49).trimEnd() + '…' : item.title
  let who = ''
  if (item.personId) {
    if (item.personId !== person.id) who = ` (${nameOf(everyone, item.personId)})`
  } else {
    who = item.sharedFamily ? ' (Family)' : ' (Parents)'
  }
  return `${when} ${title}${who}`
}

/**
 * One "what is on today" alert per person who wants it: everything they can see that is due or
 * starting today and not finished, timed things first in time order, then the any-time tasks.
 * Nothing on the list means no alert.
 */
export function planBriefings(people: Person[], everyone: Person[], items: Item[], now: Date): ScheduledAlert[] {
  const day = toDateInput(now)
  const out: ScheduledAlert[] = []
  for (const person of people) {
    if (!person.alertReminders) continue
    const today = items
      .filter((i) => i.when && !i.done && sameLocalDay(i.when, now) && canSee(person, i))
      .sort(
        (a, b) =>
          Number(!a.clock) - Number(!b.clock) ||
          (a.clock ? a.when!.getTime() - b.when!.getTime() : 0) ||
          a.title.localeCompare(b.title)
      )
    if (today.length === 0) continue
    const lines = today.slice(0, MAX_BRIEFING_LINES).map((i) => briefingLine(i, person, everyone))
    if (today.length > MAX_BRIEFING_LINES) lines.push(`+${today.length - MAX_BRIEFING_LINES} more`)
    out.push({
      userId: person.id,
      key: `brief:${day}:${person.id}`,
      ttl: 3 * 60 * 60,
      payload: {
        title: `Good morning, ${person.displayName} — ${today.length} thing${today.length === 1 ? '' : 's'} today`,
        body: lines.join('\n'),
        url: '/dashboard',
        tag: 'briefing',
      },
    })
  }
  return out
}

// ---------------------------------------------------------------- the one-minute check

/** Writes the note "this alert was sent". True only for the one caller that wrote it first. */
async function claim(key: string): Promise<boolean> {
  const { count } = await prisma.alertLog.createMany({ data: [{ key }], skipDuplicates: true })
  return count === 1
}

async function sendReminders(now: Date, listeners: Person[]): Promise<void> {
  const wanting = listeners.filter((p) => p.alertReminders)
  if (wanting.length === 0) return
  const soon = new Date(now.getTime() + REMIND_MINUTES_AHEAD * MINUTE)
  const [events, tasks] = await Promise.all([
    prisma.event.findMany({ where: { startTime: { gt: now, lte: soon } } }),
    prisma.task.findMany({ where: { status: 'OPEN', dueDate: { gt: now, lte: soon } } }),
  ])
  const items = [...events.map(eventItem), ...tasks.map(taskItem)]
  for (const reminder of planReminders(wanting, items, now)) {
    if (await claim(reminder.key)) await sendToUser(reminder.userId, reminder.payload, { ttl: reminder.ttl })
  }
}

async function sendBriefings(now: Date, everyone: Person[], listeners: Person[]): Promise<void> {
  const hour = now.getHours()
  if (hour < BRIEFING_FIRST_HOUR || hour > BRIEFING_LAST_HOUR) return
  const wanting = listeners.filter((p) => p.alertReminders)
  if (wanting.length === 0) return

  const day = toDateInput(now)
  const keyOf = (p: Person) => `brief:${day}:${p.id}`
  const noted = await prisma.alertLog.findMany({ where: { key: { in: wanting.map(keyOf) } } })
  const alreadyDone = new Set(noted.map((n) => n.key))

  // Claimed even when there turns out to be nothing on today's list: the briefing is a morning
  // snapshot, not something that appears later because an item was added at 11.
  const mine: Person[] = []
  for (const person of wanting) {
    if (!alreadyDone.has(keyOf(person)) && (await claim(keyOf(person)))) mine.push(person)
  }
  if (mine.length === 0) return

  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const [events, tasks] = await Promise.all([
    prisma.event.findMany({ where: { startTime: { gte: start, lt: end } } }),
    prisma.task.findMany({ where: { status: 'OPEN', dueDate: { gte: start, lt: end } } }),
  ])
  const items = [...events.map(eventItem), ...tasks.map(taskItem)]
  await Promise.all(planBriefings(mine, everyone, items, now).map((b) => sendToUser(b.userId, b.payload, { ttl: b.ttl })))
}

// The log only has to remember an alert for as long as it could be sent again.
let lastSweep = 0
async function sweepAlertLog(now: Date): Promise<void> {
  if (now.getTime() - lastSweep < 6 * 60 * MINUTE) return
  lastSweep = now.getTime()
  await prisma.alertLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - KEEP_LOG_DAYS * 24 * 60 * MINUTE) } } })
}

async function attempt(what: string, work: () => Promise<unknown>): Promise<void> {
  try {
    await work()
  } catch (e) {
    console.warn(`alerts: ${what} failed:`, e instanceof Error ? e.message : e)
  }
}

/** One look at the clock: send whatever is due. Safe to run any number of times. */
export async function runAlertTick(now: Date = new Date()): Promise<void> {
  const devices = await prisma.pushSubscription.findMany({ select: { userId: true } })
  if (devices.length > 0) {
    const withDevice = new Set(devices.map((d) => d.userId))
    const everyone = await prisma.user.findMany({ select: PERSON_SELECT })
    const listeners = everyone.filter((p) => withDevice.has(p.id))
    await attempt('reminders', () => sendReminders(now, listeners))
    await attempt('morning briefing', () => sendBriefings(now, everyone, listeners))
  }
  await attempt('log clean-up', () => sweepAlertLog(now))
}

const LOOP_FLAG = '__huddleAlertLoop'

// A timer that does not, by itself, keep the program running (the web server does that).
function quietly<T>(timer: T): T {
  ;(timer as unknown as { unref?: () => void }).unref?.()
  return timer
}

/** Starts the once-a-minute check. Calling it again does nothing. */
export function startAlertLoop(): void {
  const g = globalThis as unknown as Record<string, unknown>
  if (g[LOOP_FLAG]) return
  g[LOOP_FLAG] = true

  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      await runAlertTick()
    } catch (e) {
      console.warn('alerts: the reminder check failed:', e instanceof Error ? e.message : e)
    } finally {
      busy = false
    }
  }
  // The first look waits a little, so the server is fully up before it talks to the database.
  quietly(setTimeout(tick, 15_000))
  quietly(setInterval(tick, MINUTE))
}
