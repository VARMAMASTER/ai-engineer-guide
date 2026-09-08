import type { MetadataRoute } from 'next'

/**
 * The web app manifest, served at `/manifest.webmanifest`.
 *
 * Every field here is load-bearing for Chrome's install prompt on Android,
 * which is the target: it refuses to offer "Install app" unless there is a
 * name, a short_name, a same-origin start_url that actually resolves, a
 * `standalone`-family display mode, and icons that include a real 192 and a
 * real 512 whose declared `sizes` match their decoded pixel dimensions.
 * `tests/unit/pwa.test.ts` asserts each of those against the files on disk.
 *
 * `id` is set explicitly and must never change. Without it Chrome derives app
 * identity from `start_url`, so moving the landing page later would register
 * a second, unrelated app and orphan everyone's installed copy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'AI Engineer Practice Guide',
    short_name: 'AI Guide',
    description:
      'A 180-day practice program for AI engineering interviews: DSA, system design, AI/ML depth, and six shipped projects.',
    // `/` only redirects to `/today`; pointing start_url at the redirect is a
    // classic silent installability failure, so it names the real page.
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Dark is DEFAULT_THEME, so these are the colours a cold launch paints.
    background_color: '#0d0f17',
    theme_color: '#0d0f17',
    lang: 'en',
    dir: 'ltr',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Revise', short_name: 'Revise', url: '/revise' },
      { name: 'Cheat sheets', short_name: 'Sheets', url: '/revise/sheets' },
    ],
  }
}
