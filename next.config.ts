import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The Feed section renders article thumbnails straight from publisher CDNs.
    // Next blocks remote images unless their host is allowlisted, so a missing
    // entry here shows up as a broken image rather than an error — narrow
    // patterns, one per source we actually parse.
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.arstechnica.net' },
      { protocol: 'https', hostname: 'platform.theverge.com' },
      // The Indian Express serves most images from its CDN subdomain, but a
      // handful of items in the same feed point at the bare apex host
      // (`indianexpress.com/wp-content/uploads/...`). Verified against the
      // live feed; both are needed or those items throw at request time.
      { protocol: 'https', hostname: 'images.indianexpress.com' },
      { protocol: 'https', hostname: 'indianexpress.com' },
      // MediaNama has no CDN — the inline article images it does ship are on
      // the site host itself.
      { protocol: 'https', hostname: 'www.medianama.com' },
    ],
  },
};

export default nextConfig;
