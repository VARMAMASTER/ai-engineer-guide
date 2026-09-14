'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_APPS, isAppActive } from '@/lib/nav'
import NavIcon from './NavIcon'
import { useBareChrome } from './useBareChrome'

/**
 * The phone tab bar: five apps, permanently, in a fixed order.
 *
 * There is no More sheet any more. It existed because eleven sections had
 * nowhere else to go; now they live in the section strip at the top of Learn,
 * which is a level of the hierarchy rather than an overflow bin. Keeping both
 * would mean two routes to the same fourteen pages and a drawer that fills up
 * again the moment a section is added.
 */
export default function BottomNav() {
  // The auth pages render their own minimal header; see useBareChrome.
  const bare = useBareChrome()
  const pathname = usePathname() ?? ''

  // AFTER every hook. An early return above them would change this
  // component's hook count when you navigate to /sign-in while it is still
  // mounted, which is a rules-of-hooks violation and a crash, not a warning.
  if (bare) return null
  return (
    <nav
      data-testid="bottom-nav"
      aria-label="Apps"
      className="panel panel-flush fixed inset-x-0 bottom-0 z-50 flex rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_APPS.map((app) => {
        const active = isAppActive(pathname, app)
        return (
          <Link
            key={app.id}
            href={app.href}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : 'false'}
            data-app={app.id}
            className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2"
          >
            <span
              className={[
                'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                active ? 'nav-pill' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              <NavIcon name={app.id} className="h-[18px] w-[18px]" />
            </span>
            <span
              className={[
                'readout text-[0.625rem] leading-none',
                active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
              ].join(' ')}
            >
              {app.short}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
