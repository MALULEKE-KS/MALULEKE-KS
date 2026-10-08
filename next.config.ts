import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The share images draw the 3D K-S piece, read from disk at request time
  // (lib/og.tsx) — so it must travel with those functions on Vercel.
  outputFileTracingIncludes: {
    "/opengraph-image": ["./design/brand/ks-cube-3d-og.png"],
    "/systems/[slug]/opengraph-image": ["./design/brand/ks-cube-3d-og.png"],
  },
  // Vercel's Functions Storage (Hobby: 10 GB, exceeded 2026-10-08 at 13 GB) counts every
  // function of every kept deployment. The tracer copies Prisma's WebAssembly engines for
  // every database type (Postgres, MySQL, SQLite, SQL Server, CockroachDB — ~55 MB) and its
  // source maps into each of ~280 functions, though the client only loads the native Node
  // engine (runtime/library.js + the platform's query_engine .node). Drop the dead weight.
  outputFileTracingExcludes: Object.fromEntries(
    ["/*", "/**/*"].map((route) => [
      route,
      [
        "./node_modules/@prisma/client/runtime/query_engine_bg.*",
        "./node_modules/@prisma/client/runtime/query_compiler_bg.*",
        "./node_modules/@prisma/client/runtime/wasm-*",
        "./node_modules/@prisma/client/runtime/edge*",
        "./node_modules/@prisma/client/runtime/react-native*",
        "./node_modules/@prisma/client/runtime/*.map",
        "./node_modules/.prisma/client/query_engine_bg.wasm",
        "./node_modules/.prisma/client/*.tmp*",
      ],
    ]),
  ),
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
