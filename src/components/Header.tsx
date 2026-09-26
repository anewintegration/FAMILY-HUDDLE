'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { CATEGORIES, categoriesForSlug } from '@/lib/categories'

type NavItem = { href: string; label: string; special?: 'gold' | 'terracotta' }

export default function Header({
  openTaskCount,
  role,
  slug,
  rightSlot,
  middleSlot,
}: {
  openTaskCount: number
  role: 'PARENT' | 'CHILD'
  slug?: string
  rightSlot?: React.ReactNode
  middleSlot?: React.ReactNode
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
  const quickCategories = role === 'PARENT' ? CATEGORIES : categoriesForSlug(slug || '')

  return (
    <div className="sticky top-0 z-30">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, rgba(10,37,64,0.94), rgba(13,59,79,0.88))', backdropFilter: 'blur(6px)' }}
      />
      <div className="px-2 pt-3 pb-2">
        <div
          className="rounded-2xl px-3 py-2.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(10,20,40,0.25)' }}
        >
          {/* Row 1: logo + nav on the left, action buttons on the right */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: '#EDEFF2', border: '1px solid #E0E3E8' }}
                >
                  <span className="font-display text-2xl font-extrabold" style={{ color: '#FF7A56' }}>M</span>
                </div>
                <span className="font-display text-2xl font-extrabold text-charcoal tracking-wide">HUDDLE</span>
              </div>

              <nav
                className="flex gap-0.5 overflow-x-auto rounded-xl px-1.5 py-1 min-w-0"
                style={{ background: '#F4F5F7', border: '1px solid #E9EBEF' }}
              >
                {tabs.map((tab) => {
                  const active = pathname === tab.href
                  const specialDot = tab.special === 'gold' ? '#FFB238' : tab.special === 'terracotta' ? '#FF5A36' : undefined
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`flex items-center gap-1 text-[11px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full ${
                        active ? 'text-white' : 'text-charcoal-muted'
                      }`}
                      style={active ? { background: '#1B2340', boxShadow: '0 2px 6px rgba(27,35,64,0.3)' } : undefined}
                    >
                      {specialDot && <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: specialDot }} />}
                      {tab.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            <div
              className="flex items-center gap-1 shrink-0 rounded-xl px-1.5 py-1"
              style={{ background: '#DFE2E7', border: '1px solid #CDD1D8' }}
            >
              <Link href="/whiteboard" className="flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#FFB238' }} />
                Whiteboard
              </Link>
              <Link href="/events" className="flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#4C86A8' }} />
                Events
              </Link>
              <Link href="/tasks" className="flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#FF5A36' }} />
                Tasks
                {openTaskCount > 0 && (
                  <span className="bg-terracotta text-white text-[8px] font-bold rounded-full px-1">{openTaskCount}</span>
                )}
              </Link>
              <div className="w-5 h-5 rounded-full bg-white text-charcoal text-[9px] font-bold flex items-center justify-center shadow-sm">
                {slug ? slug[0].toUpperCase() : '?'}
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-[10px] font-semibold text-charcoal-muted px-1">
                Sign out
              </button>
            </div>
          </div>

          {/* Row 2: greeting on the left, view toggle in the middle, category chips on the right */}
          {(rightSlot || middleSlot || quickCategories.length > 0) && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-cream-border relative z-10">
              {rightSlot && <div className="shrink-0">{rightSlot}</div>}
              {middleSlot && <div className="shrink-0">{middleSlot}</div>}
              {quickCategories.length > 0 && (
                <div className="flex gap-1 overflow-x-auto justify-end min-w-0 ml-auto">
                  {quickCategories.map((c) => {
                    const active = activeCategory === c.id
                    return (
                      <Link
                        key={c.id}
                        href={`/dashboard?bucket=week&category=${c.id}`}
                        className="flex items-center gap-1 text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full"
                        style={{
                          color: c.color,
                          background: active ? `${c.color}1A` : '#F4F5F7',
                          border: active ? `1.5px solid ${c.color}` : '1px solid #E9EBEF',
                        }}
                      >
                        <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: c.color }} />
                        {c.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
