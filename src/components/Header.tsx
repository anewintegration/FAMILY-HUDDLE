'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { formatWeekRange, CATEGORIES, categoriesForSlug } from '@/lib/categories'

type NavItem = { href: string; label: string; special?: 'gold' | 'terracotta' }

const FAMILY_NAME = 'Morse Family' // TODO: make this configurable per household
const FAMILY_COLORS = ['#7C9473', '#C97B5C', '#4C86A8', '#D4A24C'] // dad, mom, benjamin, bradley

export default function Header({
  openTaskCount,
  role,
  slug,
}: {
  openTaskCount: number
  role: 'PARENT' | 'CHILD'
  slug?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get('category')

  const parentTabs: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/family', label: 'Family' },
    { href: '/mom-and-dad', label: 'Parents' },
    { href: '/benjamin', label: 'Benjamin' },
    { href: '/bradley', label: 'Bradley' },
    { href: '/dad', label: 'Dad' },
    { href: '/mom', label: 'Mom' },
    { href: '/goals', label: 'September Goals', special: 'gold' },
    { href: '/bucket-list', label: 'Family Bucket List', special: 'terracotta' },
  ]

  const childTabs: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/calendar', label: 'Calendar' },
  ]

  const tabs = role === 'PARENT' ? parentTabs : childTabs

  // Parents see the full taxonomy; kids only see the categories that apply to them.
  const quickCategories = role === 'PARENT' ? CATEGORIES : categoriesForSlug(slug || '')

  return (
    <header className="bg-cream border-b border-cream-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sage to-terracotta flex items-center justify-center shrink-0 shadow-md">
              <span className="font-display text-xl font-bold text-white">M</span>
            </div>
            <div className="flex flex-col gap-[3px]">
              <span className="font-display text-[11px] font-semibold text-terracotta-dark tracking-[0.14em] uppercase">
                {FAMILY_NAME}
              </span>
              <span className="font-display text-xl font-bold text-white tracking-[0.2em] bg-sage-dark px-3 py-1 rounded-lg shadow-sm w-fit leading-snug">
                HUDDLE
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-charcoal-muted">Week of {formatWeekRange(0)}</span>
                <div className="flex gap-[3px]">
                  {FAMILY_COLORS.map((c, i) => (
                    <span key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/whiteboard"
              className="flex items-center gap-1.5 bg-gradient-to-br from-gold to-gold-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              Family Whiteboard
            </Link>
            <Link
              href="/tasks"
              className="flex items-center gap-1.5 bg-gradient-to-br from-sage to-sage-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
            >
              Tasks
              {openTaskCount > 0 && (
                <span className="bg-terracotta text-white text-[10px] font-bold rounded-full px-1.5">
                  {openTaskCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-charcoal-muted"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-2 -mb-px">
          {tabs.map((tab) => {
            const active = pathname === tab.href
            const specialColor =
              tab.special === 'gold' ? 'text-gold-dark' : tab.special === 'terracotta' ? 'text-terracotta-dark' : ''
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm font-bold whitespace-nowrap px-3 py-1.5 rounded-lg ${
                  tab.special
                    ? `${specialColor} ${active ? 'bg-cream-border' : ''}`
                    : active
                    ? 'bg-cream-border text-charcoal'
                    : 'text-charcoal-muted'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        {quickCategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2.5 -mt-0.5">
            {quickCategories.map((c) => {
              const active = activeCategory === c.id
              return (
                <Link
                  key={c.id}
                  href={`/dashboard?bucket=week&category=${c.id}`}
                  className="flex items-center gap-1 text-[10px] whitespace-nowrap px-2.5 py-[3px] rounded-full"
                  style={{
                    fontWeight: active ? 600 : 400,
                    background: active ? `${c.color}22` : `${c.color}14`,
                    color: active ? c.color : '#7A7568',
                    opacity: active ? 1 : 0.85,
                  }}
                >
                  <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: c.color }} />
                  {c.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </header>
  )
}
