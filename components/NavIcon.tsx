/**
 * One 20px stroke glyph per section, drawn from the same 24-unit grid with the
 * same 1.6 stroke so the rail and the tab bar read as a set. `currentColor`
 * throughout, so the active accent flows through without a second token.
 */
const PATHS: Record<string, React.ReactNode> = {
  // Today — a day cell inside the calendar month.
  '/today': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M8.5 15.5l2.2 2.2 4.3-4.6" />
    </>
  ),
  // Roadmap — six month markers on one spine.
  '/roadmap': (
    <>
      <path d="M12 3v18" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M14 6h5M5 12h5M14 18h5" />
    </>
  ),
  // DSA — a traversal through a small graph.
  '/dsa': (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="9" r="2.4" />
      <circle cx="9" cy="18" r="2.4" />
      <path d="M8.1 7.2l7.8 1.4M16.6 11l-6 5.2M7.4 8l1.2 7.7" />
    </>
  ),
  // System Design — service boxes wired together.
  '/system-design': (
    <>
      <rect x="3" y="3.5" width="7" height="6" rx="1.5" />
      <rect x="14" y="14.5" width="7" height="6" rx="1.5" />
      <rect x="3" y="14.5" width="7" height="6" rx="1.5" />
      <path d="M10 6.5h4a3.5 3.5 0 0 1 3.5 3.5v4.5M6.5 9.5v5" />
    </>
  ),
  // Projects — something shipped.
  '/projects': (
    <>
      <path d="M12 2.8l8 4.2v9.9l-8 4.3-8-4.3V7z" />
      <path d="M4.3 7.2L12 11.3l7.7-4.1M12 11.3V21" />
    </>
  ),
  // AI / ML — a two-layer network.
  '/ai-ml': (
    <>
      <circle cx="6" cy="6.5" r="1.9" />
      <circle cx="6" cy="17.5" r="1.9" />
      <circle cx="18" cy="12" r="1.9" />
      <path d="M7.8 7.5l8.5 3.6M7.8 16.5l8.5-3.6" />
      <path d="M12 3.2v3M12 17.8v3" />
    </>
  ),
  // Reading — an open paper.
  '/reading': (
    <>
      <path d="M3 5.5h6.5A2.5 2.5 0 0 1 12 8v11a2.2 2.2 0 0 0-2.2-2.2H3z" />
      <path d="M21 5.5h-6.5A2.5 2.5 0 0 0 12 8v11a2.2 2.2 0 0 1 2.2-2.2H21z" />
    </>
  ),
  // Settings — the three things you can actually change.
  '/settings': (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2.1" />
      <circle cx="15" cy="12" r="2.1" />
      <circle cx="8" cy="17" r="2.1" />
    </>
  ),
  // More — the overflow sheet.
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </>
  ),
}

export default function NavIcon({ name, className }: { name: string; className?: string }) {
  const path = PATHS[name]
  if (!path) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {path}
    </svg>
  )
}
