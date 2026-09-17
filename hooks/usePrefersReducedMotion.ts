// hooks/usePrefersReducedMotion.ts
// Shared by useTypewriterLines and ScaleFigure (Design System §7 — both must
// independently respect prefers-reduced-motion). Uses useSyncExternalStore
// rather than useEffect+useState — the canonical pattern for subscribing to
// an external browser API, and the one that doesn't trip
// react-hooks/set-state-in-effect (calling setState synchronously inside an
// effect body, which the useEffect+useState version of this check does).

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerSnapshot() {
  // SSR has no matchMedia — default to "motion allowed"; the real value is
  // read on the client via getSnapshot immediately after hydration.
  return false;
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
