// lib/guide/tour-step.ts
// Moving through a tour's stops. Split from tour.ts so the tour card (on every page) doesn't
// pull the tour block's validators — zod — into the first load (WP-102).

/** Move through a tour, staying within it. */
export function stepTo(current: number, direction: "next" | "back" | "restart", length: number): number {
  if (direction === "restart") return 0;
  return Math.min(length - 1, Math.max(0, current + (direction === "next" ? 1 : -1)));
}
