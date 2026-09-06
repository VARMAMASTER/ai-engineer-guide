import type { ReactNode } from 'react'
import SideNav from './SideNav'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import StorageBanner from './StorageBanner'

/**
 * The app frame: a fixed rail above 768px, a tab bar below it, one sticky top
 * bar in both. Pages render into `main` and own everything inside it.
 */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <StorageBanner />
      <div className="flex">
        <SideNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="mx-auto min-w-0 w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
