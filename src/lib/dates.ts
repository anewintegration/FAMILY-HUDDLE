// Date helpers shared by the server and the browser.
//
// Rules that keep days from drifting:
//  - Never build a date key with toISOString().slice(0, 10) - that is UTC, so an
//    evening item (after ~8pm Eastern) lands on tomorrow.
//  - Never call new Date('YYYY-MM-DD') - a bare date is parsed as UTC midnight,
//    which is the evening before in Eastern time.
// Everything below uses the local calendar (the server is pinned to Eastern in
// next.config.js, and the browser is on the family's own clock).

const pad = (n: number) => n.toString().padStart(2, '0')

/** "YYYY-MM-DD" for the local calendar day of a date (what <input type="date"> uses). */
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "HH:MM" for the local time of a date (what <input type="time"> uses). */
export function toTimeInput(value: string | Date | null | undefined, fallback = '09:00'): string {
  if (!value) return fallback
  const d = new Date(value)
  if (isNaN(d.getTime())) return fallback
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** A task saved without a time means "any time that day" - stored as 11:59 PM. */
export const ANYTIME = '23:59'

/** Combine a date box and a time box into the ISO string the API expects. */
export function fromInputs(date: string, time?: string, fallback = '09:00'): string | null {
  if (!date) return null
  const d = new Date(`${date}T${time || fallback}`)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/** False for the "any time that day" placeholder, so we don't show a fake 11:59 PM. */
export function hasClockTime(value: string | Date | null | undefined): boolean {
  if (!value) return false
  const d = new Date(value)
  if (isNaN(d.getTime())) return false
  return !(d.getHours() === 23 && d.getMinutes() === 59)
}

export function formatTime(v: string | Date) {
  return new Date(v).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** Compact time for tight spots like calendar squares: 9a, 3:30p. */
export function formatTimeShort(v: string | Date) {
  const d = new Date(v)
  const h = d.getHours()
  const m = d.getMinutes()
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}${m === 0 ? '' : ':' + pad(m)}${h >= 12 ? 'p' : 'a'}`
}

export function formatShortDate(v: string | Date) {
  return new Date(v).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Today as "YYYY-MM-DD" on the local calendar. */
export function todayKey(): string {
  return toDateInput(new Date())
}

/** Move a "YYYY-MM-DD" key by a number of days (negative goes back). */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return toDateInput(new Date(y, m - 1, d + days))
}

/** True for a real calendar date written as "YYYY-MM-DD". */
export function isValidDateKey(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** True when the date falls on today's local calendar day. */
export function isToday(v: string | Date | null | undefined): boolean {
  return !!v && toDateInput(v) === todayKey()
}

// ---- Months ("YYYY-MM") - used by the monthly Goals page and the calendar ----

export function monthKeyOf(v: string | Date) {
  const d = new Date(v)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthKeyShift(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  return monthKeyOf(new Date(y, m - 1 + delta, 1))
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
}

export function isValidMonthKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
}
