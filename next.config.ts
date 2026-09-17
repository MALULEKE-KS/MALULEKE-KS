import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
