import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'
import Shell from '@/components/Shell'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import { DEFAULT_THEME, THEME_INIT_SCRIPT } from '@/lib/theme'

const body = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

const display = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const mono = JetBrains_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AI Engineer Practice Guide',
  description:
    'A 180-day practice program for AI engineering interviews: DSA, system design, AI/ML depth, and six shipped projects.',
  applicationName: 'AI Engineer Practice Guide',
  // Emits <link rel="manifest">, without which Chrome never evaluates the
  // manifest at all and the install prompt never appears.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'AI Guide',
    // The app paints its own dark ground under the status bar.
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // themeColor is deliberately absent, and there is no hand-written <meta> for
  // it either: React 19 hoists metadata tags and owns them across hydration, so
  // a tag in the tree that the blocking script has already rewritten fails to
  // match and React appends a SECOND one — two unscoped theme-color tags whose
  // winner comes down to insertion order. The script below creates and owns the
  // only one. `tests/e2e/pwa.spec.ts` asserts the count stays at one.
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking: resolves the stored theme and stamps <html> before first
            paint. Waiting for the zustand store to rehydrate happens long after
            the browser has already painted the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <Shell>{children}</Shell>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
