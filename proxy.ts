import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/db/proxy'

/**
 * Next 16 renamed Middleware to Proxy; same file-convention, same single file
 * per project, and it now runs on the Node.js runtime by default.
 *
 * All it does is refresh the Supabase session and enforce the public/private
 * split. The logic lives in `lib/db/proxy.ts` so it can be read next to the
 * clients it shares cookie handling with.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  /*
   * Everything except things that can never carry a session:
   * - _next/static, _next/image: build output and the image optimiser.
   * - sw.js, manifest.webmanifest, icons: the PWA shell, which must stay
   *   fetchable and cacheable exactly as it is today.
   * - api/feed: public, keyless, and already HTTP-cached for three hours.
   * - any request with a file extension.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|icons/|api/feed/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)',
  ],
}
