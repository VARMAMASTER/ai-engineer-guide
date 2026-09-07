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
    ],
  },
};

export default nextConfig;
