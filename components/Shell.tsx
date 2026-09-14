import type { ReactNode } from 'react'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import SectionTabs from './SectionTabs'
import TopBar from './TopBar'
import StorageBanner from './StorageBanner'

/**
 * The app frame, in two levels.
 *
 * Above 768px: one rail carrying both levels — apps, with the current app's
 * sections open beneath it. Below 768px the levels split in two, an app tab bar
 * pinned to the bottom edge and the current app's section strip under the top
 * bar. One sticky top bar in both. Pages render into `main` and own everything
 * inside it.
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
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
