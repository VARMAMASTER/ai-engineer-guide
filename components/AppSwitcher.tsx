'use client'

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_APPS, SETTINGS_ITEM, isActive } from '@/lib/nav'
import { useModalOverlay } from './ui/Dialog'
import Sheet from './ui/Sheet'
import NavIcon from './NavIcon'
import { cx } from './ui/cx'

/* ============================================================================
   AppSwitcher — the workspace switcher, in the shape Frappe taught the owner.
   ----------------------------------------------------------------------------
   WHY THIS EXISTS AT ALL
     The app is installed on an Android phone in `display: standalone`. Chrome
     draws no address bar and no BACK BUTTON there. A user three taps into Diet
     has exactly the affordances this app renders and nothing else — so "go
     somewhere else" has to be a control we ship, not one we borrow from the
     browser. The bottom tab bar already switches apps on a phone, but it is
     `md:hidden`: on the desktop rail and on any page the user reached by a
     link, the only way back out was the browser chrome that is not there.

     So: one control, in the top bar, at every width, that says which app you
     are in and takes you to any other.

   TWO SURFACES, ONE MENU
     Below 768px it opens a BOTTOM SHEET. A menu anchored under the top bar is
     at the far end of a 6" phone from the thumb holding it; the bottom edge is
     where the thumb already is, which is the same argument that puts the tab
     bar there. `components/ui/Sheet.tsx` is that surface already and brings the
     focus trap, `inert` background, scroll lock and focus return with it.

     At 768px and up it opens a DROPDOWN anchored to the trigger, because a
     pointer has no reach problem and a sheet sliding up from the bottom of a
     1280px window to answer a click at the top of it is a travel distance with
     no purpose.

     Which one is a media query read through `useSyncExternalStore`, not a pair
     of `md:hidden` / `hidden md:block` siblings. Two rendered copies would mean
     two live overlays, two focus traps and two elements answering to the same
     `aria-controls` id — a CSS-hidden modal is still in the DOM. There is one
     menu; only its container changes.

   NO SECTIONS IN THE MENU — a deliberate answer to an open question.
     Frappe nests a workspace's pages under it. Here that would mean Learn's
     FOURTEEN sections under Learn, and the menu becomes a twenty-row scroll on
     a 390px phone for a control whose entire job is to be one glance and one
     tap. Worse, it would be the third live copy of the same fourteen links:
     `SectionTabs` renders them as a strip under the top bar on a phone and
     `SideNav` renders them expanded under the active app on a desktop, both
     already on screen whenever you are inside Learn. A switcher that lists what
     is visible six inches away is not navigation, it is duplication — and it is
     the copy nobody would remember to update.

     Level one only, therefore: the five apps, plus Settings, which belongs to
     the whole system rather than to any one app and so has never had a tab.

   BLUR BUDGET
     One blurred layer while the menu is up, either way. Both surfaces are the
     `.raised` tier and both run through `useModalOverlay`, which sets
     `:root[data-sheet="open"]` and drops every `.panel` and `.card` behind them
     — the top bar, the rail, the tab bar — to solid. The mobile scrim is a flat
     tint and the desktop one is fully transparent, and neither is blurred.
   ========================================================================== */

/** The app the current route belongs to, or undefined outside the tab bar. */
type NavApp = (typeof NAV_APPS)[number]

/**
 * Which app owns `pathname`.
 *
 * Derived here from `NAV_APPS` and `isActive` rather than imported, so this
 * component depends only on the two exports of `lib/nav` that are load-bearing
 * everywhere else. The helper it would otherwise call is the kind of convenience
 * that gets renamed, and a switcher that cannot say which app you are in is a
 * switcher with no label.
 */
export function appForPath(pathname: string): NavApp | undefined {
  return NAV_APPS.find(
    (app) =>
      isActive(pathname, app.href) ||
      app.sections.some((section) => isActive(pathname, section.href)),
  )
}

/* --- the one breakpoint ---------------------------------------------------
   `md:` is 768px and it is the only breakpoint this project has; `sm:` and
   `lg:` are removed from the theme. Read through an external store so a window
   dragged across the boundary swaps the surface instead of stranding an open
   sheet on a desktop. */

const DESKTOP_QUERY = '(min-width: 768px)'

function mediaList(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(DESKTOP_QUERY)
}

function subscribeDesktop(onChange: () => void): () => void {
  const mq = mediaList()
  if (!mq || typeof mq.addEventListener !== 'function') return () => {}
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

const readDesktop = () => mediaList()?.matches ?? false
// Mobile-first on the server, and in jsdom, which implements no matchMedia at
// all: the phone is the primary case and the sheet is the surface that has to
// work without one.
const readDesktopOnServer = () => false

/** True at 768px and up. False on the server and anywhere without matchMedia. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, readDesktop, readDesktopOnServer)
}

/* --- the desktop dropdown --------------------------------------------------
   Portalled onto the body, not rendered inside the header, for two reasons.
   The first is the usual one: the top bar is `sticky` with its own stacking
   context and a `.panel` background, and a menu inside it can be clipped or
   re-anchored by an ancestor's overflow. The second is specific to this app —
   `useModalOverlay` marks every body child that is not `[data-overlay]` as
   `inert`, so a menu left inside the header would mark ITSELF unfocusable. */

const MENU_WIDTH = 248
const EDGE_GAP = 8

function DropdownMenu({
  open,
  onClose,
  anchorRef,
  children,
  'data-testid': testId,
}: {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLButtonElement | null>
  children: ReactNode
  'data-testid'?: string
}) {
  const { panelRef, ready } = useModalOverlay(open, onClose)
  const [box, setBox] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  // Measured in a layout effect so the panel is never painted at 0,0 first.
  // The body scroll lock pins the body and offsets it by the current scroll,
  // which holds the page visually still, so a rect taken either side of it
  // agrees — and the trigger lives in a `sticky top-0` header regardless.
  useLayoutEffect(() => {
    if (!ready) return
    const anchor = anchorRef.current
    if (!anchor) return
    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const maxLeft = window.innerWidth - MENU_WIDTH - EDGE_GAP
      setBox({
        top: rect.bottom + EDGE_GAP,
        left: Math.max(EDGE_GAP, Math.min(rect.left, maxLeft)),
      })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [ready, anchorRef])

  if (!ready) return null

  return createPortal(
    <div data-overlay="" className="fixed inset-0 z-50">
      {/* A menu does not dim the page behind it — it is a disclosure, not a
          modal question. The scrim is here only to catch the click that
          dismisses it, so it carries no fill and, therefore, no blur. */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0" />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-testid={testId}
        style={{ top: box.top, left: box.left, width: MENU_WIDTH }}
        className="raised fixed max-h-[70vh] overflow-y-auto p-1.5 focus:outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

/* --- the chevron ----------------------------------------------------------- */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cx(
        'h-[14px] w-[14px] shrink-0 text-[var(--text-faint)] motion-safe:transition-transform',
        open && 'rotate-180',
      )}
    >
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  )
}

/* --- the switcher ---------------------------------------------------------- */

interface Entry {
  /** Icon key: an app id for the apps, a route for Settings. */
  icon: string
  href: string
  label: string
  current: boolean
}

export default function AppSwitcher() {
  const pathname = usePathname() ?? ''
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const menuId = useId()

  const app = appForPath(pathname)
  const onSettings = isActive(pathname, SETTINGS_ITEM.href)

  const entries: Entry[] = [
    ...NAV_APPS.map((a) => ({
      icon: a.id,
      href: a.href,
      label: a.label,
      current: a.id === app?.id,
    })),
    {
      icon: SETTINGS_ITEM.href,
      href: SETTINGS_ITEM.href,
      label: SETTINGS_ITEM.label,
      current: onSettings,
    },
  ]

  // Where the roving tabstop sits. Reset to whatever is current every time the
  // menu opens, so the keyboard always starts from where the user actually is
  // rather than from wherever they left off two navigations ago.
  const currentIndex = Math.max(
    0,
    entries.findIndex((e) => e.current),
  )
  const [activeIndex, setActiveIndex] = useState(currentIndex)

  const close = useCallback(() => setOpen(false), [])

  /** Open, with the roving tabstop parked on the app you are actually in. */
  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setActiveIndex(currentIndex)
    setOpen(true)
  }

  /*
   * Focus the current app's row when the menu opens.
   *
   * This effect belongs to AppSwitcher, not to the menu markup, and that is
   * load-bearing: React runs effects child-first, so `useModalOverlay`'s focus
   * effect — which lands focus on the panel — has already run by the time this
   * one does, and this moves it on to the row. Written the other way round the
   * panel would win and the arrow keys would have nothing to move from.
   *
   * The panel still gets focus first, so `useModalOverlay` captures the trigger
   * as the element to return focus to on Escape.
   */
  useEffect(() => {
    if (!open) return
    itemRefs.current[currentIndex]?.focus()
  }, [open, currentIndex])

  function focusItem(next: number) {
    const n = entries.length
    const index = ((next % n) + n) % n
    setActiveIndex(index)
    itemRefs.current[index]?.focus()
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusItem(activeIndex + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusItem(activeIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        focusItem(0)
        break
      case 'End':
        event.preventDefault()
        focusItem(entries.length - 1)
        break
      default:
        break
    }
  }

  /**
   * The menu itself — one definition, rendered into whichever container the
   * viewport calls for.
   *
   * Roving tabindex, not a tabbable list: a menu is one tab stop. The trap in
   * `useModalOverlay` reads `tabIndex >= 0`, so exactly one row plus the
   * sheet's close button are in the Tab cycle and the arrow keys own the rest.
   * Nothing survives a close to be tabbed into — the overlay unmounts.
   */
  const menu = (
    <div
      id={menuId}
      role="menu"
      aria-label="Apps"
      onKeyDown={onMenuKeyDown}
      data-testid="app-switcher-menu"
      className="flex flex-col gap-0.5"
    >
      {entries.map((entry, index) => {
        // Settings is not an app. The rule says so without a label saying so.
        const divider = entry.href === SETTINGS_ITEM.href

        return (
          <Fragment key={entry.href}>
            {divider ? (
              <div
                role="separator"
                aria-orientation="horizontal"
                className="my-1 h-px bg-[var(--panel-border)]"
              />
            ) : null}
            <Link
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              href={entry.href}
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              aria-current={entry.current ? 'true' : undefined}
              data-app={entry.icon}
              data-current={entry.current ? 'true' : 'false'}
              data-testid="app-switcher-item"
              onClick={close}
              className={cx(
                'flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-sm transition-colors',
                entry.current
                  ? 'nav-pill font-medium'
                  : 'text-[var(--text-muted)] hover:bg-[var(--track)] hover:text-[var(--text)]',
              )}
            >
              <NavIcon name={entry.icon} className="h-[18px] w-[18px] shrink-0" />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {/* The current row is marked three ways: `aria-current` for the
                  screen reader, the accent pill for the eye, and this tick for
                  anyone the pill's colour alone does not reach. */}
              {entry.current ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                  className="h-[15px] w-[15px] shrink-0 text-[var(--accent)]"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </Link>
          </Fragment>
        )
      })}
    </div>
  )

  const label = app ? app.label : onSettings ? SETTINGS_ITEM.label : 'Apps'
  const icon = app ? app.id : onSettings ? SETTINGS_ITEM.href : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-testid="app-switcher"
        data-app={app?.id ?? ''}
        className={cx(
          'flex min-h-11 max-w-[9.5rem] items-center gap-2 rounded-[var(--radius-sm)] px-2.5 transition-colors md:max-w-none',
          'border border-[var(--panel-border)] bg-[var(--panel-solid)]',
          'hover:border-[var(--accent-line)] hover:bg-[var(--track)]',
          'text-[var(--text)]',
        )}
      >
        {icon ? (
          <NavIcon name={icon} className="h-[18px] w-[18px] shrink-0 text-[var(--accent)]" />
        ) : null}
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
        {/* The visible text names the app; the accessible name has to also say
            what pressing it does, or the button reads simply as "Today". */}
        <span className="sr-only">— switch app</span>
        <Chevron open={open} />
      </button>

      {desktop ? (
        <DropdownMenu
          open={open}
          onClose={close}
          anchorRef={triggerRef}
          data-testid="app-switcher-panel"
        >
          {menu}
        </DropdownMenu>
      ) : (
        <Sheet
          open={open}
          onClose={close}
          title="Switch app"
          description="Five apps, plus settings."
          closeLabel="Close app switcher"
          data-testid="app-switcher-panel"
        >
          {menu}
        </Sheet>
      )}
    </>
  )
}
