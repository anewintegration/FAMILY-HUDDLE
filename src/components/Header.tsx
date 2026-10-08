'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { CATEGORIES, categoriesForSlug } from '@/lib/categories'
import { monthKeyOf, monthLabel } from '@/lib/dates'
import AutoRefresh from '@/components/AutoRefresh'

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
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Tell the rest of the page how tall the header is, so the left-hand "this week"
  // card and the calendar's day panel can stick right underneath it.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    publish()
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(publish)
      observer.observe(el)
    }
    window.addEventListener('resize', publish)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', publish)
    }
  }, [])

  const parentTabs: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/family', label: 'Family' },
    { href: '/mom-and-dad', label: 'Parents' },
    { href: '/benjamin', label: 'Benjamin' },
    { href: '/bradley', label: 'Bradley' },
    { href: '/dad', label: 'Dad' },
    { href: '/mom', label: 'Mom' },
    { href: '/goals', label: `${monthLabel(monthKeyOf(new Date()))} Goals`, special: 'gold' },
    { href: '/bucket-list', label: 'Family Bucket List', special: 'terracotta' },
  ]

  const childTabs: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/calendar', label: 'Calendar' },
  ]

  const tabs = role === 'PARENT' ? parentTabs : childTabs
  const quickCategories = role === 'PARENT' ? CATEGORIES : categoriesForSlug(slug || '')

  return (
    <div ref={wrapperRef} className="relative md:sticky md:top-0 z-30">
      <AutoRefresh />
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'linear-gradient(180deg, rgba(10,37,64,0.94), rgba(13,59,79,0.88))', backdropFilter: 'blur(6px)' }}
      />
      <div className="px-2 pt-3 pb-2">
        <div
          className="rounded-2xl px-3 py-2.5 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(10,20,40,0.25)' }}
        >
          {/* Row 1: logo, the page tabs and the action buttons. Wide screens keep them on one line; on a
              narrower screen the tabs drop to their own full-width line underneath. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 relative z-10">
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
              className="flex gap-0.5 overflow-x-auto rounded-xl px-1 py-1 min-w-0 w-full order-last lg:w-auto lg:order-none"
              style={{ background: '#F4F5F7', border: '1px solid #E9EBEF' }}
            >
              {tabs.map((tab) => {
                const active = pathname === tab.href
                const specialDot = tab.special === 'gold' ? '#FFB238' : tab.special === 'terracotta' ? '#FF5A36' : undefined
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`tap shrink-0 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded-full ${
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

            <div
              className="flex items-center gap-1 shrink-0 rounded-xl px-1 py-1 ml-auto"
              style={{ background: '#DFE2E7', border: '1px solid #CDD1D8' }}
            >
              <Link href="/whiteboard" className="tap flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#FFB238' }} />
                Whiteboard
              </Link>
              <Link href="/events" className="tap flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#4C86A8' }} />
                Events
              </Link>
              <Link href="/tasks" className="tap flex items-center gap-1 bg-white text-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                <span className="w-[4px] h-[4px] rounded-full shrink-0" style={{ background: '#FF5A36' }} />
                Tasks
                {openTaskCount > 0 && (
                  <span className="bg-terracotta text-white text-[8px] font-bold rounded-full px-1">{openTaskCount}</span>
                )}
              </Link>
              <Link
                href="/account"
                aria-label="My account"
                title="My account"
                className="tap-avatar rounded-full bg-white text-charcoal text-[10px] font-bold flex items-center justify-center shadow-sm"
                style={{ boxShadow: pathname === '/account' ? '0 0 0 2px #1B2340' : undefined }}
              >
                {slug ? slug[0].toUpperCase() : '?'}
              </Link>
            </div>
          </div>

          {/* Row 2: greeting on the left, view toggle in the middle, category chips on the right */}
          {(rightSlot || middleSlot || quickCategories.length > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2 pt-2 border-t border-cream-border relative z-10">
              {rightSlot && <div className="shrink-0">{rightSlot}</div>}
              {middleSlot && <div className="shrink-0">{middleSlot}</div>}
              {quickCategories.length > 0 && (
                <div className="flex gap-1 min-w-0 w-full overflow-x-auto sm:w-auto sm:flex-wrap sm:justify-end sm:ml-auto sm:overflow-visible">
                  {quickCategories.map((c) => {
                    const active = activeCategory === c.id
                    return (
                      <Link
                        key={c.id}
                        // Tapping the chip that is already on turns the filter off.
                        href={active ? '/dashboard?bucket=week' : `/dashboard?bucket=week&category=${c.id}`}
                        aria-current={active ? 'true' : undefined}
                        className="tap shrink-0 flex items-center gap-1 text-[10px] font-bold whitespace-nowrap px-2 py-0.5 rounded-full"
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
