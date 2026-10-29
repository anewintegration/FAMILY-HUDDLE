import { categoryById } from '@/lib/categories'
import { REPEAT_CHOICES, repeatLabel } from '@/lib/recurrence'
import type { RepeatKind, Scope } from '@/lib/recurrence'
import type { PersonOption } from '@/lib/rows'

// Small pieces the task and event rows share.

export function CategoryBadge({ id }: { id: string | null }) {
  const cat = id ? categoryById[id as keyof typeof categoryById] : undefined
  if (!cat) return null
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: cat.color, background: `${cat.color}1A` }}>
      {cat.label}
    </span>
  )
}

// A small tag on a task or event that is one of a repeating run: "↻ Every week".
export function RepeatBadge({ repeat }: { repeat: RepeatKind | null }) {
  if (!repeat) return null
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-white border border-cream-border text-charcoal-muted"
      title={`Repeats: ${repeatLabel(repeat).toLowerCase()}`}
    >
      <span aria-hidden="true">↻</span> {repeatLabel(repeat)}
    </span>
  )
}

// "Repeat" and, once one is chosen, "Repeat until": on every add form, and on the edit form of an entry that
// does not repeat yet. The caller passes the same class its other boxes use, so it fits in with them.
export function RepeatFields({
  repeat,
  until,
  onRepeat,
  onUntil,
  className,
}: {
  repeat: RepeatKind | ''
  until: string
  onRepeat: (v: RepeatKind | '') => void
  onUntil: (v: string) => void
  className: string
}) {
  return (
    <>
      <select value={repeat} onChange={(e) => onRepeat(e.target.value as RepeatKind | '')} aria-label="Repeat" className={className}>
        <option value="">Doesn’t repeat</option>
        {REPEAT_CHOICES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      {repeat && (
        <label className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-muted">
          until
          <input type="date" value={until} onChange={(e) => onUntil(e.target.value)} aria-label="Repeat until" className={className} />
        </label>
      )}
    </>
  )
}

// On the edit form of a repeating entry: change only this one, or this one and every later one.
export function ScopeChoice({ value, onChange, repeat }: { value: Scope; onChange: (v: Scope) => void; repeat: RepeatKind }) {
  const pill = (on: boolean) =>
    `tap text-[11px] font-bold px-3 py-1 rounded-full border ${on ? 'bg-charcoal text-white border-charcoal' : 'bg-white text-charcoal-muted border-cream-border'}`
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold text-charcoal-muted">
        <span aria-hidden="true">↻</span> {repeatLabel(repeat)} — apply changes to:
      </p>
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => onChange('this')} aria-pressed={value === 'this'} className={pill(value === 'this')}>
          Just this one
        </button>
        <button type="button" onClick={() => onChange('following')} aria-pressed={value === 'following'} className={pill(value === 'following')}>
          This and all following
        </button>
      </div>
    </div>
  )
}

// The "who is it for" choices: each person, then the two groups.
export function WhoOptions({ people }: { people: PersonOption[] }) {
  return (
    <>
      {people.map((p) => (
        <option key={p.slug} value={p.slug}>
          {p.name}
        </option>
      ))}
      <option value="parents">Parents</option>
      <option value="family">Family</option>
    </>
  )
}

export function CheckCircle({ done }: { done: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {done ? (
        <>
          <circle cx="12" cy="12" r="10" fill="#00C2A8" />
          <path d="M7 12l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <circle cx="12" cy="12" r="9" stroke="#6B6F7A" strokeWidth="1.8" />
      )}
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
