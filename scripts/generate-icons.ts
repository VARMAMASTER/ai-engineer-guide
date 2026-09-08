/**
 * Generates the PWA icon set into `public/icons/`.
 *
 * Written as a rasteriser rather than a call out to `sharp` or a headless
 * browser on purpose: the app has zero runtime dependencies beyond
 * React/Next/zustand/zod, and a one-off icon build is not worth a native
 * binary in the lockfile. Everything here is `node:zlib` plus arithmetic.
 *
 * The mark is a three-node graph in the accent colour on the dark ground —
 * legible down to a 48px launcher tile, which is the size that actually
 * decides whether an icon reads or not.
 *
 * Run with `pnpm tsx scripts/generate-icons.ts`. The output is committed;
 * this script exists so the mark can be regenerated rather than re-drawn.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Dark ground, `--d-ground` in `app/globals.css`. */
const GROUND: RGB = [0x12, 0x18, 0x22]
/** Accent, `--d-accent` in `app/globals.css`. */
const ACCENT: RGB = [0xf2, 0xb3, 0x3d]

type RGB = [number, number, number]

// --- geometry ---------------------------------------------------------------
//
// Shapes are signed distance fields evaluated per pixel: negative inside,
// positive outside, in pixel units. Coverage is `0.5 - d` clamped to [0,1],
// which antialiases an edge over exactly one pixel without supersampling.

function sdRoundedRect(px: number, py: number, half: number, r: number): number {
  const qx = Math.abs(px) - (half - r)
  const qy = Math.abs(py) - (half - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(ox, oy) - r
}

function sdCircle(px: number, py: number, cx: number, cy: number, r: number): number {
  return Math.hypot(px - cx, py - cy) - r
}

function sdSegment(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
  half: number,
): number {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2))
  return Math.hypot(wx - vx * t, wy - vy * t) - half
}

/**
 * The mark, in a unit square. Three nodes, three edges — a graph, which is the
 * one shape that says "AI engineering" without needing a letterform.
 *
 * Its bounding circle around (0.5, 0.5) has radius ~0.635, which is what sets
 * the maskable scale below.
 */
const NODES: readonly [number, number][] = [
  [0.14, 0.5],
  [0.86, 0.16],
  [0.86, 0.84],
]
const EDGES: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
]
const NODE_R = 0.14
const EDGE_HALF = 0.05
/** Distance from the mark's centre to its outermost pixel, in unit-mark units. */
export const MARK_BOUND = Math.max(
  ...NODES.map(([x, y]) => Math.hypot(x - 0.5, y - 0.5) + NODE_R),
)

function sdMark(px: number, py: number, size: number, scale: number): number {
  // Map icon pixel space onto the unit mark square, centred.
  const s = size * scale
  const ox = (size - s) / 2
  const oy = (size - s) / 2
  const ux = (px - ox) / s
  const uy = (py - oy) / s

  let d = Infinity
  for (const [x, y] of NODES) d = Math.min(d, sdCircle(ux, uy, x, y, NODE_R))
  for (const [a, b] of EDGES) {
    d = Math.min(d, sdSegment(ux, uy, NODES[a][0], NODES[a][1], NODES[b][0], NODES[b][1], EDGE_HALF))
  }
  return d * s // back into pixel units so the AA ramp stays one pixel wide
}

// --- raster -----------------------------------------------------------------

function coverage(d: number): number {
  return Math.max(0, Math.min(1, 0.5 - d))
}

function over(dst: number[], i: number, colour: RGB, a: number): void {
  if (a <= 0) return
  const da = dst[i + 3] / 255
  const outA = a + da * (1 - a)
  if (outA <= 0) return
  for (let c = 0; c < 3; c += 1) {
    dst[i + c] = Math.round((colour[c] * a + dst[i + c] * da * (1 - a)) / outA)
  }
  dst[i + 3] = Math.round(outA * 255)
}

export interface IconSpec {
  size: number
  /** `null` fills the whole square — what maskable and apple-touch both want. */
  cornerRadius: number | null
  /** The mark's width as a fraction of the icon. */
  markScale: number
}

function render(spec: IconSpec): Buffer {
  const { size, cornerRadius, markScale } = spec
  const px = new Array<number>(size * size * 4).fill(0)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4
      const cx = x + 0.5
      const cy = y + 0.5

      const bg =
        cornerRadius === null
          ? 1
          : coverage(sdRoundedRect(cx - size / 2, cy - size / 2, size / 2, cornerRadius * size))
      over(px, i, GROUND, bg)
      over(px, i, ACCENT, coverage(sdMark(cx, cy, size, markScale)) * bg)
    }
  }

  return encodePng(size, size, px)
}

// --- PNG encoding -----------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 8-bit RGBA (colour type 6), no interlace, one filter byte per scanline. */
export function encodePng(width: number, height: number, rgba: number[]): Buffer {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 4)
    raw[row] = 0 // filter: none
    for (let x = 0; x < width * 4; x += 1) raw[row + 1 + x] = rgba[y * width * 4 + x]
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- the set ----------------------------------------------------------------

export const ICONS: Record<string, IconSpec> = {
  // Chrome/Android render `purpose: any` icons as drawn, so they carry their
  // own squircle.
  'icon-192.png': { size: 192, cornerRadius: 0.22, markScale: 0.7 },
  'icon-512.png': { size: 512, cornerRadius: 0.22, markScale: 0.7 },
  // Maskable: full-bleed ground, and the mark kept inside the safe zone — the
  // spec's inner circle of radius 40%, not just the inner 80% box.
  // MARK_BOUND * 0.6 = 0.381 < 0.4.
  'icon-maskable-512.png': { size: 512, cornerRadius: null, markScale: 0.6 },
  // iOS masks the corners itself, so a rounded source would be double-rounded.
  'apple-touch-icon.png': { size: 180, cornerRadius: null, markScale: 0.62 },
}

function main(): void {
  const dir = join(process.cwd(), 'public', 'icons')
  mkdirSync(dir, { recursive: true })
  for (const [name, spec] of Object.entries(ICONS)) {
    const png = render(spec)
    writeFileSync(join(dir, name), png)
    console.log(`${name.padEnd(24)} ${spec.size}x${spec.size}  ${png.length} bytes`)
  }
}

if (process.argv[1]?.includes('generate-icons')) main()
