'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_DESTINATIONS, trailFor } from '@/lib/nav'

/**
 * The way back, on a page the rest of the nav does not already show a
 * position for.
 *
 * The app is an installed PWA: `display: standalone` means Chrome renders no
 * chrome and no back button, so a deep page — `/dsa/arrays-hashing`,
 * `/companies/google` — is a genuine dead end without this. Rendered once
 * here rather than by hand on nine page types, so a tenth page (and every
 * mini-app after it) gets it for free.
 *
 * RENDER RULE: only on a page one level deeper than the nav model itself
 * knows about. `trailFor` returns `[Learn]` for `/dsa` too (it is a true
 * ancestor list, not a render verdict), but `/dsa` is already shown as the
 * open section in the strip / rail — a trail there would repeat, not add.
 * `NAV_DESTINATIONS` is exactly the set of app and section roots, so "not in
 * it" is "deeper than anything the nav already renders".
 *
 * A client component reading the pathname, the same shape `SectionTabs` next
 * to it already uses: Next server-renders it like everything else, so the
 * trail is in the first response, before hydration — the same bar the route
 * sweep holds every `<h1>` to.
 *
 * Ancestors only, never the current page: the page's own `<h1>` is the leaf,
 * and this component has no way to know it (nor should it reach for one). So
 * nothing here carries `aria-current="page"` — every crumb is a real
 * ancestor, none of them is where you are.
 */
export default function Breadcrumb() {
  const pathname = usePathname() ?? ''
  if (NAV_DESTINATIONS.includes(pathname)) return null

  const trail = trailFor(pathname)
  if (trail.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" data-testid="breadcrumb" className="mb-4 min-w-0">
      <ol className="eyebrow flex min-w-0 flex-wrap items-center gap-y-1">
        {trail.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center">
            <Link
              href={crumb.href}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 hover:text-[var(--accent)]"
            >
              {crumb.label}
            </Link>
            {i < trail.length - 1 && (
              <span aria-hidden="true" className="text-[var(--text-faint)]">
                /
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
