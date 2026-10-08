import { categoryById } from '@/lib/categories'
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
