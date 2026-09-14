import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * The one mistake in this feature that cannot be undone by a later commit.
 *
 * `NEXT_PUBLIC_*` variables are INLINED INTO THE BROWSER BUNDLE at build time.
 * A VAPID private key named `NEXT_PUBLIC_VAPID_PRIVATE_KEY` — or read from a
 * file that a Client Component imports — is published to every visitor the
 * moment it deploys, and anyone who has it can send notifications as this app
 * to every device that has ever subscribed. Rotating it is the only fix, and
 * rotating it invalidates every existing subscription.
 *
 * A code review catches that on the day it is written. These assertions catch
 * it on every day after.
 */

const ROOT = process.cwd()

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (/\.(ts|tsx|js|mjs)$/.test(entry)) out.push(path)
  }
  return out
}

const pushFiles = walk(join(ROOT, 'lib/push'))
const apiFiles = walk(join(ROOT, 'app/api/push'))
const source = (path: string) => readFileSync(path, 'utf8')

describe('the private key', () => {
  it('is never read through a NEXT_PUBLIC_ name anywhere in the app', () => {
    const files = [
      ...pushFiles,
      ...apiFiles,
      ...walk(join(ROOT, 'app/ops')),
      ...walk(join(ROOT, 'components')),
    ]

    for (const file of files) {
      const text = source(file)
      const publicVars = text.match(/process\.env\.NEXT_PUBLIC_[A-Z0-9_]+/g) ?? []
      for (const variable of publicVars) {
        expect(
          /PRIVATE|SECRET|SERVICE_ROLE/.test(variable),
          `${relative(ROOT, file)} reads ${variable}, which ships to every browser`,
        ).toBe(false)
      }
    }
  })

  it('is only read by server modules, never by the browser half', () => {
    const readers = pushFiles
      .concat(apiFiles)
      .filter((file) => source(file).includes('process.env.VAPID_PRIVATE_KEY'))
      .map((file) => relative(ROOT, file).replace(/\\/g, '/'))

    // One place, and it is the one that signs. Everything else asks it.
    expect(readers).toEqual(['lib/push/vapid.ts'])
  })

  it('is not reachable from the module a Client Component imports', () => {
    // `lib/push/client.ts` is imported by `app/ops/reminders/PushSetup.tsx`,
    // which is `'use client'`. Anything it pulls in is bundled for the browser,
    // so it must not reach `./vapid`, `./send`, `./encrypt` or `node:` at all.
    const client = source(join(ROOT, 'lib/push/client.ts'))
    expect(client).not.toMatch(/from '\.\/(vapid|send|encrypt|base64)'/)
    expect(client).not.toMatch(/from 'node:/)
    // The name may be mentioned in a comment; the READ is what would ship it.
    expect(client).not.toContain('process.env.VAPID_PRIVATE_KEY')

    const setup = source(join(ROOT, 'app/ops/reminders/PushSetup.tsx'))
    expect(setup).toMatch(/^'use client'/)
    expect(setup).not.toMatch(/@\/lib\/push\/(vapid|send|encrypt|subscription|schedule)/)
  })
})

describe('the cron secret', () => {
  it('gates the sender, and fails closed when it is missing', () => {
    const sender = source(join(ROOT, 'app/api/push/send/route.ts'))

    expect(sender).toContain('CRON_SECRET')
    expect(sender).toContain('timingSafeEqual')
    // An unconfigured deployment must answer 401, not run for everybody.
    expect(sender).toMatch(/if \(!secret\) return false/)
    expect(sender).toContain("status: 401")
  })

  it('is never a NEXT_PUBLIC_ variable', () => {
    for (const file of apiFiles) {
      expect(source(file), relative(ROOT, file)).not.toContain('NEXT_PUBLIC_CRON_SECRET')
    }
  })
})

describe('the admin client', () => {
  it('is used by the scheduled sender and by nothing else in this feature', () => {
    // It bypasses RLS. A cron invocation carries no session, so it is the only
    // legitimate caller here; every user-facing route must go through the
    // request-scoped client so the policies are what enforce isolation.
    const users = pushFiles
      .concat(apiFiles)
      .filter((file) => source(file).includes('@/lib/db/admin'))
      .map((file) => relative(ROOT, file).replace(/\\/g, '/'))

    expect(users).toEqual(['app/api/push/send/route.ts'])
  })

  it('is not what the subscribe, unsubscribe or test routes use', () => {
    for (const name of ['subscribe', 'unsubscribe', 'test']) {
      const route = source(join(ROOT, 'app/api/push', name, 'route.ts'))
      expect(route, name).toContain('@/lib/db/server')
      expect(route, name).not.toContain('@/lib/db/admin')
      // Every one of them is behind a session.
      expect(route, name).toContain('getCurrentUser')
    }
  })
})

describe('what is committed', () => {
  it('keeps every key out of the repository', () => {
    // `.env*` is gitignored, and the generator writes to stdout so a key can
    // reach a file only by someone redirecting it there on purpose.
    const ignore = source(join(ROOT, '.gitignore'))
    expect(ignore).toContain('.env*')

    const generator = source(join(ROOT, 'scripts/generate-vapid.ts'))
    expect(generator).not.toMatch(/writeFileSync|appendFileSync/)
  })
})
