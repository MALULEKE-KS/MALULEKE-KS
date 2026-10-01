import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The share images draw the 3D K-S piece, read from disk at request time
  // (lib/og.tsx) — so it must travel with those functions on Vercel.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./design/brand/ks-cube-3d-og.png"],
    "/systems/[slug]/opengraph-image": ["./design/brand/ks-cube-3d-og.png"],
  },
  // Renamed pages keep their old addresses working (F5c, D10).
  async redirects() {
    return [{ source: "/how-i-build", destination: "/method", permanent: true }];
  },
  images: {
    // GitHub-hosted OG images / repo owner avatars referenced from synced
    // System data (scripts/github-sync.ts) — nothing else needs a remote
    // image source per Constitution §9 (self-hosted assets otherwise).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
