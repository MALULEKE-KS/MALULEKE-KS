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
    return [{ source: "/how-i-build", destination: "/about#method", permanent: true }];
  },
  // Baseline hardening on every response (V1 release audit, 2026-10-02): no
  // MIME sniffing, no framing (clickjacking on the admin sign-in or the
  // contact form), no referrer leaking full URLs to other sites, no powerful
  // browser features the site never uses, and a CSP limited to directives
  // that can't break the app (scripts and styles stay as they are).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
        ],
      },
    ];
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
