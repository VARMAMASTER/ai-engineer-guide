import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'
import Shell from '@/components/Shell'
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
      </body>
    </html>
  )
}
