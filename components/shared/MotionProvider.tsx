// components/shared/MotionProvider.tsx
// Every public animation draws with Motion's light `m` primitive; the engine itself
// (lib/motion-features.ts) is fetched after the page is on screen, not with it
// (D-063 — the animation library was the largest script on every page after React).
// Until it arrives, elements simply show in their resting state.

"use client";

import { LazyMotion } from "motion/react";

const loadFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={loadFeatures}>{children}</LazyMotion>;
}
