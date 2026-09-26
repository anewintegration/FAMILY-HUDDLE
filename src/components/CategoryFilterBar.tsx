import Link from 'next/link'
import { CategoryId } from '@/lib/categories'

export default function CategoryFilterBar({
  slug,
  options,
  active,
  accentColor,
}: {
  slug: string
  options: { id: CategoryId; label: string; color: string }[]
  active: string
  accentColor: string
}) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-4">
      <Link
        href={`/${slug}`}
        className="text-xs font-semibold px-3 py-1.5 rounded-full border"
        style={{
          borderColor: active === 'all' ? accentColor : '#EEEDE8',
          borderWidth: active === 'all' ? 1.5 : 1,
          background: active === 'all' ? `${accentColor}22` : '#fff',
          color: active === 'all' ? accentColor : '#6B6F7A',
        }}
      >
        All
      </Link>
      {options.map((c) => (
        <Link
          key={c.id}
          href={`/${slug}?category=${c.id}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-full border"
          style={{
            borderColor: active === c.id ? c.color : '#EEEDE8',
            borderWidth: active === c.id ? 1.5 : 1,
            background: active === c.id ? `${c.color}22` : '#fff',
            color: active === c.id ? c.color : '#6B6F7A',
          }}
        >
          {c.label}
        </Link>
      ))}
    </div>
  )
}
