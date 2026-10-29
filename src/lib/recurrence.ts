// Repeating tasks and events.
//
// A repeat is stored as a run of ordinary tasks (or events), one for each date, that share a seriesId and say how
// often they come round. Everything else in Huddle - the calendar, the lists, alerts, the 30-minute reminders and
// the morning briefing - already works one entry at a time, so each date simply behaves like any other entry.
// This file is the date arithmetic and the checks. It knows nothing about the database or the screen, so the same
// code runs on the server and in the browser.
//
//   Every week          the same weekday, 7 days apart
//   Every other week    the same weekday, 14 days apart
//   Every month         the same day of the month; in a shorter month it lands on that month's last day
//                       (the 31st gives Jan 31, Feb 28, Mar 31, Apr 30 ...)
//
// Every date keeps the clock time of the first one (a task with no time keeps its "any time that day" marker).
// Dates are built from calendar fields in local time, never by adding milliseconds, so a clock change in spring
// or autumn cannot move an entry to another hour or day.

import { formatShortDate, isValidDateKey, toDateInput } from '@/lib/dates'

export type RepeatKind = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'

/** Which entries of a repeat a change covers: only the one it was made on, or that one and every later one. */
export type Scope = 'this' | 'following'

export const REPEAT_CHOICES: { value: RepeatKind; label: string }[] = [
  { value: 'WEEKLY', label: 'Every week' },
  { value: 'BIWEEKLY', label: 'Every other week' },
  { value: 'MONTHLY', label: 'Every month' },
]

/** A repeat may run for this many years from its first date ... */
export const MAX_YEARS = 2
/** ... and it never makes more than this many entries (a weekly repeat for two years is 105). */
export const MAX_ENTRIES = 110

/**
 * The plain lists (Tasks, Events, a person's page, the open-task count) show a repeating entry only when its turn is
 * close: this many days ahead, counting today. One week covers exactly one weekly entry, two weeks one every-other-week
 * entry, and 31 days always covers the next monthly one. The calendar and the dashboard show every date.
 */
export const LIST_WINDOW_DAYS: Record<RepeatKind, number> = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 31 }

/** The database transaction that writes a whole repeat is up to ~110 small writes: allow it longer than the 5-second default. */
export const SERIES_TRANSACTION = { maxWait: 10_000, timeout: 30_000 }

export function isRepeatKind(v: unknown): v is RepeatKind {
  return v === 'WEEKLY' || v === 'BIWEEKLY' || v === 'MONTHLY'
}

/** "Every other week" */
export function repeatLabel(kind: RepeatKind): string {
  return REPEAT_CHOICES.find((c) => c.value === kind)!.label
}

/** "every other week" - for the middle of a sentence. */
export function repeatPhrase(kind: RepeatKind): string {
  return repeatLabel(kind).toLowerCase()
}

/** "every week until Tue, Dec 15" */
export function repeatSummary(kind: RepeatKind, untilKey: string): string {
  const [y, m, d] = untilKey.split('-').map(Number)
  return `${repeatPhrase(kind)} until ${formatShortDate(new Date(y, m - 1, d))}`
}

/** What an add form says after making a repeat, since the lists only show the next one: "Added 12 — every week until Tue, Dec 15. ..." */
export function addedNote(count: number, kind: RepeatKind, untilKey: string): string {
  return `Added ${count} — ${repeatSummary(kind, untilKey)}. The calendar has every one; the lists show each as its turn gets close.`
}

// ---------------------------------------------------------------- the dates

/** The date of the nth entry of a repeat that starts at `first` (n = 0 is the first one itself). */
export function nthOccurrence(first: Date, kind: RepeatKind, n: number): Date {
  if (n === 0) return new Date(first.getTime())
  const seconds = first.getSeconds()
  const millis = first.getMilliseconds()
  const y = first.getFullYear()
  const m = first.getMonth()
  const d = first.getDate()
  if (kind === 'MONTHLY') {
    // Counted from the first date each time (not from the previous entry), so a short month never drags later ones along.
    const month = new Date(y, m + n, 1)
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return new Date(month.getFullYear(), month.getMonth(), Math.min(d, lastDay), first.getHours(), first.getMinutes(), seconds, millis)
  }
  const step = kind === 'WEEKLY' ? 7 : 14
  return new Date(y, m, d + n * step, first.getHours(), first.getMinutes(), seconds, millis)
}

/**
 * Every date from `first` up to and including the day `untilKey` ("YYYY-MM-DD"), and never more than MAX_ENTRIES of
 * them, so a far-off end day cannot make this loop run away.
 */
export function occurrenceDates(first: Date, kind: RepeatKind, untilKey: string): Date[] {
  const out: Date[] = []
  for (let n = 0; n < MAX_ENTRIES; n++) {
    const d = nthOccurrence(first, kind, n)
    if (toDateInput(d) > untilKey) break
    out.push(d)
  }
  return out
}

function lastAllowedKey(first: Date): string {
  return toDateInput(new Date(first.getFullYear() + MAX_YEARS, first.getMonth(), first.getDate()))
}

// ---------------------------------------------------------------- the checks

export type RepeatPlan = {
  kind: RepeatKind
  /** The last day the repeat may run to, as the person picked it. */
  untilKey: string
  /** Every entry to make, the first one included (so at least two). */
  dates: Date[]
}

export type RepeatCheck = { ok: true; plan: RepeatPlan | null } | { ok: false; error: string }

/**
 * Reads the "repeat" and "repeatUntil" a request came with, against the date of the first entry.
 * No repeat asked for is fine (plan: null). Otherwise it must be a known choice, start today or later (so a repeat
 * never fills the list with entries that are already overdue), end on a real day that leaves at least one more entry,
 * and stay inside the size limits. Every refusal is a plain sentence meant to be shown as it is.
 */
export function readRepeat(
  input: { repeat?: unknown; repeatUntil?: unknown },
  first: Date | null,
  noun: 'task' | 'event',
  now: Date = new Date()
): RepeatCheck {
  const asked = input.repeat
  if (asked === undefined || asked === null || asked === '') return { ok: true, plan: null }
  if (!isRepeatKind(asked)) return { ok: false, error: 'That repeat choice is not valid.' }

  if (!first) {
    return { ok: false, error: noun === 'task' ? 'Pick a due date for a task that repeats.' : 'Pick a date for an event that repeats.' }
  }
  if (toDateInput(first) < toDateInput(now)) return { ok: false, error: `A repeating ${noun} has to start today or later.` }

  const until = input.repeatUntil
  if (until === undefined || until === null || until === '') return { ok: false, error: 'Pick the day the repeat should end.' }
  if (!isValidDateKey(until)) return { ok: false, error: 'That “repeat until” date is not valid.' }
  if (until > lastAllowedKey(first)) return { ok: false, error: `A repeat can run for up to ${MAX_YEARS} years. Pick an earlier end date.` }

  const dates = occurrenceDates(first, asked, until)
  if (dates.length < 2) {
    return { ok: false, error: `“Repeat until” has to be on or after the next repeat (${formatShortDate(nthOccurrence(first, asked, 1))}).` }
  }
  return { ok: true, plan: { kind: asked, untilKey: until, dates } }
}

// ---------------------------------------------------------------- "this and all following"

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes()

/** The calendar day of `day` at the clock time of `clock`. */
export function withClockOf(day: Date, clock: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.getHours(), clock.getMinutes(), clock.getSeconds(), clock.getMilliseconds())
}

/**
 * One entry of a repeat was changed "and all following", and moved from `before` to `after`. This gives the new dates
 * for the entries that come after it (`later`, soonest first), or null when they keep the dates they have.
 *   - It moved to another day: the rest are laid out again from the new day, the way they were first made.
 *   - Only its time of day changed: each of the rest keeps its own day and takes the new time.
 *   - Nothing about when changed (a new name, say): their dates are left alone, including any that were moved by hand.
 */
export function datesForFollowing(kind: RepeatKind, before: Date, after: Date, later: Date[]): Date[] | null {
  if (toDateInput(before) !== toDateInput(after)) return later.map((_, i) => nthOccurrence(after, kind, i + 1))
  if (minutesOf(before) !== minutesOf(after)) return later.map((d) => withClockOf(d, after))
  return null
}
