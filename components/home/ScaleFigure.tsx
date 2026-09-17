// components/home/ScaleFigure.tsx
// A real-world reference, not an invented gimmick: architectural and
// engineering drawings place a human silhouette — a "scale figure" — into a
// technical drawing to give it human scale and presence. This renders that
// convention as ink-only line art that draws itself in once, timed to
// LedgerHero's typewriter duration (Design System §7 — "The scale figure").
//
// Decorative reinforcement of LedgerHero's text, never content in its own
// right: aria-hidden, and degrades to fully-drawn/static under
// prefers-reduced-motion, same as the ledger caret and the typewriter itself.

"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ScaleFigureProps {
  durationMs: number;
  className?: string;
}

export function ScaleFigure({ durationMs, className }: ScaleFigureProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <svg
      viewBox="0 0 40 100"
      className={className}
      aria-hidden="true"
      style={
        {
          "--draw-duration": `${durationMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* Simple, unfilled scale-figure outline — head, torso, legs, arms —
          a single stroke path so stroke-dasharray/stroke-dashoffset can
          animate it as one continuous drafting motion. Ink stroke only, no
          fill, matching the engineering-drawing convention this borrows
          from (Design System §0/§7) rather than a colored/filled character. */}
      <circle
        cx="20"
        cy="12"
        r="8"
        className={reducedMotion ? "scale-figure-stroke" : "scale-figure-stroke scale-figure-draw"}
        style={{ "--path-length": 50 } as React.CSSProperties}
      />
      <path
        d="M20 20 V55 M20 28 L6 45 M20 28 L34 45 M20 55 L10 95 M20 55 L30 95"
        className={reducedMotion ? "scale-figure-stroke" : "scale-figure-stroke scale-figure-draw"}
        style={{ "--path-length": 220, "--draw-delay": "0ms" } as React.CSSProperties}
      />
    </svg>
  );
}
