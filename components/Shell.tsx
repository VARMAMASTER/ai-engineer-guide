import type { ReactNode } from 'react'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import SectionTabs from './SectionTabs'
import TopBar from './TopBar'
import StorageBanner from './StorageBanner'
import CommandPalette from './CommandPalette'
import Breadcrumb from './Breadcrumb'

/**
 * The app frame, in two levels.
 *
 * Above 768px: one rail carrying both levels — apps, with the current app's
 * sections open beneath it. Below 768px the levels split in two, an app tab bar
 * pinned to the bottom edge and the current app's section strip under the top
 * bar. One sticky top bar in both. Pages render into `main` and own everything
 * inside it, except the one thing no page is trusted to add for itself: a way
 * back up. `Breadcrumb` renders it here, once, so a page one level deeper
 * than the nav model — the app has no other back button in `display:
 * standalone` — is never a dead end.
 */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      <StorageBanner />
      <div className="flex">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <SectionTabs />
          <main className="mx-auto min-w-0 w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12">
            {/* One trail, derived from the nav model, for every deep page —
                see components/Breadcrumb.tsx for the render rule. */}
            <Breadcrumb />
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
      {/* Mounted once, renders null until opened, and portals onto the body.
          It takes no props: it is opened from the top bar, from Ctrl/Cmd+K, and
          from nothing in particular, which have no common ancestor to hold the
          state. */}
      <CommandPalette />
    </div>
  )
}
