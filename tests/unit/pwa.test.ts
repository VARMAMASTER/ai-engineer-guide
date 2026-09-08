import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { createContext, runInNewContext } from 'node:vm'
import manifest from '@/app/manifest'
import { ICONS, MARK_BOUND } from '@/scripts/generate-icons'

const ROOT = process.cwd()

// --- a minimal PNG reader ----------------------------------------------------
//
// The point is not to be a decoder: it is to prove the committed icons are
// real, non-empty PNGs whose pixel dimensions match what the manifest tells
// Chrome they are. Chrome rejects an entire manifest — and with it the install
// prompt — when a declared `sizes` disagrees with the file.

interface Png {
  width: number
  height: number
  /** RGBA, row-major. */
  pixels: Uint8Array
}

function readPng(relPath: string): Png {
  const buf = readFileSync(join(ROOT, relPath))
  expect(buf.length, `${relPath} is empty`).toBeGreaterThan(0)
  expect(
    [...buf.subarray(0, 8)],
    `${relPath} does not start with the PNG signature`,
  ).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  let offset = 8
  let width = 0
  let height = 0
  const idat: Buffer[] = []
  const seen: string[] = []

  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('latin1', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + length)
    seen.push(type)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      expect(data[8], `${relPath} should be 8-bit`).toBe(8)
      expect(data[9], `${relPath} should be RGBA (colour type 6)`).toBe(6)
      expect(data[12], `${relPath} should not be interlaced`).toBe(0)
    }
    if (type === 'IDAT') idat.push(Buffer.from(data))
    offset += 12 + length
  }

  expect(seen, `${relPath} is missing IHDR/IDAT/IEND`).toEqual(
    expect.arrayContaining(['IHDR', 'IDAT', 'IEND']),
  )

  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4
  expect(raw.length, `${relPath} has a truncated image`).toBe(height * (stride + 1))

  const pixels = new Uint8Array(height * stride)
  for (let y = 0; y < height; y += 1) {
    // The generator writes filter 0 on every scanline, so no unfiltering is
    // needed — and a non-zero byte here means the file is not what we wrote.
    expect(raw[y * (stride + 1)], `${relPath} row ${y} is filtered`).toBe(0)
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
  }

  return { width, height, pixels }
}

function pixel(png: Png, x: number, y: number): [number, number, number, number] {
  const i = (y * png.width + x) * 4
  return [png.pixels[i], png.pixels[i + 1], png.pixels[i + 2], png.pixels[i + 3]]
}

// --- the manifest ------------------------------------------------------------

describe('web app manifest', () => {
  const m = manifest()

  it('carries every field Chrome requires before it offers "Install app"', () => {
    expect(m.name).toBe('AI Engineer Practice Guide')
    expect(m.short_name).toBe('AI Guide')
    expect(m.short_name!.length).toBeLessThanOrEqual(12)
    expect(m.description).toBeTruthy()
    expect(m.display).toBe('standalone')
    expect(m.orientation).toBe('portrait')
    expect(m.scope).toBe('/')
  })

  it('starts at the real landing page, not the redirect', () => {
    // `/` only calls redirect('/today'). Chrome silently drops installability
    // when start_url does not answer directly.
    expect(m.start_url).toBe('/today')
    expect(m.start_url!.startsWith('/')).toBe(true)
  })

  it('pins a stable id so a later start_url change keeps the same installed app', () => {
    expect(m.id).toBe('/')
    expect(m.id).not.toBe(m.start_url)
  })

  it('uses the dark palette, which is what DEFAULT_THEME paints', () => {
    expect(m.background_color).toBe('#0d0f17')
    expect(m.theme_color).toBe('#0d0f17')
  })

  it('declares a 192 and a 512 for "any" plus a 512 maskable', () => {
    const icons = m.icons ?? []
    const any = icons.filter((i) => i.purpose === 'any')
    const maskable = icons.filter((i) => i.purpose === 'maskable')

    expect(any.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512'])
    expect(maskable.map((i) => i.sizes)).toEqual(['512x512'])
    for (const icon of icons) {
      expect(icon.type, `${icon.src} must declare its type`).toBe('image/png')
      expect(icon.src.startsWith('/'), `${icon.src} must be same-origin`).toBe(true)
    }
  })

  it('ships every declared icon at exactly its declared pixel size', () => {
    for (const icon of m.icons ?? []) {
      const png = readPng(join('public', icon.src))
      expect(`${png.width}x${png.height}`, `${icon.src} decodes to the wrong size`).toBe(icon.sizes)
    }
  })

  it('ships the apple-touch-icon at 180x180', () => {
    const png = readPng('public/icons/apple-touch-icon.png')
    expect([png.width, png.height]).toEqual([180, 180])
  })
})

// --- icons -------------------------------------------------------------------

describe('icon set', () => {
  it('keeps the maskable mark inside the safe zone', () => {
    const spec = ICONS['icon-maskable-512.png']
    expect(spec.cornerRadius, 'a maskable icon must be full-bleed').toBeNull()
    // The spec's safe zone is the circle of radius 40% of the icon; the mark's
    // own bounding radius is MARK_BOUND in unit-mark space.
    expect(MARK_BOUND * spec.markScale).toBeLessThan(0.4)
  })

  it('draws nothing but ground in the outer 10% of the maskable icon', () => {
    const png = readPng('public/icons/icon-maskable-512.png')
    const inset = Math.round(png.width * 0.1)
    const ground: [number, number, number, number] = [0x12, 0x18, 0x22, 255]

    const edges: [number, number][] = []
    for (let x = 0; x < png.width; x += 1) {
      edges.push([x, 0], [x, png.height - 1], [x, inset - 1], [x, png.height - inset])
    }
    for (let y = 0; y < png.height; y += 1) {
      edges.push([0, y], [png.width - 1, y], [inset - 1, y], [png.width - inset, y])
    }
    for (const [x, y] of edges) {
      expect(pixel(png, x, y), `maskable icon paints the mark at ${x},${y}`).toEqual(ground)
    }
  })

  it('paints the accent somewhere in every icon', () => {
    for (const name of Object.keys(ICONS)) {
      const png = readPng(join('public/icons', name))
      let accent = 0
      for (let i = 0; i < png.pixels.length; i += 4) {
        if (png.pixels[i] === 0xf2 && png.pixels[i + 1] === 0xb3 && png.pixels[i + 2] === 0x3d) {
          accent += 1
        }
      }
      // A placeholder or a blank fill would score zero here.
      expect(accent, `${name} has no accent pixels`).toBeGreaterThan(png.width * png.height * 0.05)
    }
  })

  it('rounds the corners of the non-maskable icons and not the others', () => {
    for (const [name, spec] of Object.entries(ICONS)) {
      const png = readPng(join('public/icons', name))
      const corner = pixel(png, 0, 0)
      if (spec.cornerRadius === null) expect(corner[3], `${name} corner`).toBe(255)
      else expect(corner[3], `${name} corner`).toBe(0)
    }
  })
})

// --- the service worker's routing table -------------------------------------

interface SwModule {
  classify: (req: { method: string; mode: string; url: string; rsc: boolean }) => {
    strategy: string
    cache: string
  } | null
  cacheKey: (url: URL) => string
  CACHES: Record<string, string>
  CACHE_PREFIX: string
  VERSION: string
  OFFLINE_URL: string
  START_URL: string
  PRECACHE_PAGES: string[]
  PRECACHE_ASSETS: string[]
}

/**
 * Evaluate the shipped `public/sw.js` — the exact bytes the browser gets —
 * with the worker globals stubbed, and pull its pure helpers out.
 */
function loadServiceWorker(): SwModule {
  const source = readFileSync(join(ROOT, 'public/sw.js'), 'utf8')
  const listeners: string[] = []
  const box = { exports: {} as SwModule }
  const context = createContext({
    self: {
      location: new URL('https://guide.example/sw.js'),
      addEventListener: (type: string) => listeners.push(type),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {},
    fetch: () => Promise.reject(new Error('not used')),
    module: box,
    URL,
    console,
  })
  runInNewContext(source, context)

  // The worker is only useful — and Chrome only counts it as installable — if
  // it actually wires up a fetch handler.
  expect(listeners).toEqual(expect.arrayContaining(['install', 'activate', 'fetch', 'message']))
  return box.exports
}

const sw = loadServiceWorker()
const ORIGIN = 'https://guide.example'
const OTHER = 'https://cdn.arstechnica.net'

function route(url: string, opts: { method?: string; mode?: string; rsc?: boolean } = {}) {
  return sw.classify({
    method: opts.method ?? 'GET',
    mode: opts.mode ?? 'no-cors',
    url,
    rsc: opts.rsc ?? false,
  })
}

describe('service worker routing', () => {
  it('serves build output cache-first', () => {
    expect(route(`${ORIGIN}/_next/static/chunks/main-abc123.js`)).toEqual({
      strategy: 'cache-first',
      cache: sw.CACHES.static,
    })
    expect(route(`${ORIGIN}/_next/static/media/inter-latin.woff2`)?.strategy).toBe('cache-first')
    expect(route(`${ORIGIN}/icons/icon-192.png`)).toEqual({
      strategy: 'cache-first',
      cache: sw.CACHES.shell,
    })
  })

  it('serves content pages stale-while-revalidate', () => {
    for (const path of ['/today', '/revise/sheets', '/ai-ml/transformers', '/dsa/arrays-hashing']) {
      expect(route(`${ORIGIN}${path}`, { mode: 'navigate' }), path).toEqual({
        strategy: 'stale-while-revalidate',
        cache: sw.CACHES.pages,
      })
    }
  })

  it('treats an RSC payload as a page so in-app navigation survives offline', () => {
    expect(route(`${ORIGIN}/revise/sheets?_rsc=1a2b3`, { mode: 'cors', rsc: true })).toEqual({
      strategy: 'stale-while-revalidate',
      cache: sw.CACHES.pages,
    })
  })

  it('serves the feed network-first so nobody reads stale news online', () => {
    for (const path of ['/api/feed/hn', '/api/feed/news', '/api/feed/arxiv']) {
      expect(route(`${ORIGIN}${path}`), path).toEqual({
        strategy: 'network-first',
        cache: sw.CACHES.feed,
      })
    }
  })

  it('never intercepts a non-GET request', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
      expect(route(`${ORIGIN}/api/feed/hn`, { method }), method).toBeNull()
      expect(route(`${ORIGIN}/today`, { method, mode: 'navigate' }), method).toBeNull()
    }
  })

  it('never intercepts cross-origin requests', () => {
    expect(route(`${OTHER}/wp-content/2026/01/hero.jpg`)).toBeNull()
    expect(route('https://platform.theverge.com/wp-content/hero.jpg')).toBeNull()
  })

  it('leaves the image proxy and any future API route alone', () => {
    // /_next/image is same-origin but fronts the publisher CDNs, which cache
    // their own bytes; /api/* other than the feed has to opt in deliberately.
    expect(route(`${ORIGIN}/_next/image?url=%2Fx.png&w=640&q=75`)).toBeNull()
    expect(route(`${ORIGIN}/api/anything-else`)).toBeNull()
  })

  it('handles the manifest and favicon without ever pinning them', () => {
    expect(route(`${ORIGIN}/manifest.webmanifest`)?.strategy).toBe('stale-while-revalidate')
    expect(route(`${ORIGIN}/favicon.ico`)?.strategy).toBe('stale-while-revalidate')
  })

  it('serves no HTML cache-first, which is what stops a stuck-on-an-old-build app', () => {
    const documents = ['/today', '/settings', '/revise', '/offline']
    for (const path of documents) {
      expect(route(`${ORIGIN}${path}`, { mode: 'navigate' })?.strategy).not.toBe('cache-first')
    }
  })

  it('keys by path and query, ignoring headers', () => {
    expect(sw.cacheKey(new URL(`${ORIGIN}/revise/sheets`))).toBe('/revise/sheets')
    expect(sw.cacheKey(new URL(`${ORIGIN}/revise/sheets?_rsc=9f`))).toBe('/revise/sheets?_rsc=9f')
  })
})

describe('service worker cache lifecycle', () => {
  it('versions every cache under one prefix so activate can sweep the rest', () => {
    const names = Object.values(sw.CACHES)
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      expect(name.startsWith(sw.CACHE_PREFIX), name).toBe(true)
      expect(name.endsWith(`-${sw.VERSION}`), name).toBe(true)
    }
    expect(new Set(names).size, 'cache names must be distinct').toBe(names.length)
  })

  it('precaches the start page and the offline fallback', () => {
    expect(sw.START_URL).toBe(manifest().start_url)
    expect(sw.PRECACHE_PAGES).toContain(sw.START_URL)
    expect(sw.PRECACHE_PAGES).toContain(sw.OFFLINE_URL)
    expect(sw.OFFLINE_URL).toBe('/offline')
  })

  it('precaches every icon the manifest declares', () => {
    for (const icon of manifest().icons ?? []) {
      expect(sw.PRECACHE_ASSETS, `${icon.src} is not precached`).toContain(icon.src)
    }
    expect(sw.PRECACHE_ASSETS).toContain('/manifest.webmanifest')
  })
})
