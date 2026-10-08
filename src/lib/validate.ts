// Small input checks shared by the API routes. Keeping them here (and not in
// the route files) matters: Next only allows route handlers to export HTTP verbs.

import { CATEGORIES } from '@/lib/categories'

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id))

export function isCategory(v: unknown): boolean {
  return typeof v === 'string' && CATEGORY_IDS.has(v)
}

export type DateResult = { ok: true; value: Date | null } | { ok: false }

/** Empty / null means "no date"; anything else must parse to a real date. */
export function readDate(v: unknown): DateResult {
  if (v === null || v === undefined || v === '') return { ok: true, value: null }
  if (typeof v !== 'string' && typeof v !== 'number') return { ok: false }
  const d = new Date(v)
  return isNaN(d.getTime()) ? { ok: false } : { ok: true, value: d }
}

/** A trimmed title of 1-200 characters, or null if it is missing or too long. */
export function cleanTitle(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= 200 ? t : null
}

/** Free text (notes, whiteboard posts): trimmed, 1..max characters, or null. */
export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= max ? t : null
}

/** The JSON body of a request as a plain object - never throws. */
export async function readBody(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  } catch {
    return {}
  }
}
