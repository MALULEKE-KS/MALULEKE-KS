// components/shared/BrandMark.tsx
// The K-S mark (owner-approved 2026-10-01: "Stencil", Graphite finish; design/brand/).
// Engineered letters with the joints showing: the K's arms stand apart from
// its stem, the S is two geometric bowls cut at the spine — a stencil bridge —
// and the hyphen is one International Orange block. Drawn on a 64-unit grid;
// the viewBox crops to the letters so it sits on a text line like a word.
//
//   cut="regular"  the drawing as approved (32 px and up)
//   cut="heavy"    wider gaps and a larger block, so the stencil still reads
//                  at 16–24 px (header, admin, icons)
//   assemble       the pieces slide together by a hair on first paint — the
//                  header's one motion; none with reduced motion
//
// Letters take `currentColor`, so the mark works on graphite and on bone.
// Path data is generated from the approved geometry (design/brand/README.md).

import { cn } from "@/lib/utils";

const MARK = {
  regular: {
    stem: "M6 15L12.6 15L12.6 49L6 49Z",
    arm: "M15.2 30.3L23 15L30.2 15L22.4 30.3Z",
    leg: "M15.2 33.7L22.4 33.7L30.2 49L23 49Z",
    sTop: "M58.14 18.61A10.1 10.1 0 1 0 48.99 35.1L49.89 28.76A3.7 3.7 0 1 1 53.23 22.72Z",
    sBottom: "M51.81 28.9A10.1 10.1 0 1 1 42.66 45.39L47.57 41.28A3.7 3.7 0 1 0 50.91 35.24Z",
    block: "M32.4 29.4L37.6 29.4L37.6 34.6L32.4 34.6Z",
  },
  heavy: {
    stem: "M6 15L12.6 15L12.6 49L6 49Z",
    arm: "M16 30.3L23.8 15L31 15L23.2 30.3Z",
    leg: "M16 33.7L23.2 33.7L31 49L23.8 49Z",
    sTop: "M58.14 18.61A10.1 10.1 0 1 0 48.13 34.94L49.57 28.71A3.7 3.7 0 1 1 53.23 22.72Z",
    sBottom: "M52.67 29.06A10.1 10.1 0 1 1 42.66 45.39L47.57 41.28A3.7 3.7 0 1 0 51.23 35.29Z",
    block: "M31.8 28.8L38.2 28.8L38.2 35.2L31.8 35.2Z",
  },
} as const;

/** The brand's one accent, as drawn in the mark (DESIGN-SYSTEM.md tokens: ember). */
export const MARK_EMBER = "#FF5B1F";

export function BrandMark({ className, cut = "regular", assemble = false }: { className?: string; cut?: "regular" | "heavy"; assemble?: boolean }) {
  const m = MARK[cut];
  return (
    <svg viewBox="4 13 58.5 38" aria-hidden="true" className={cn("w-auto shrink-0", assemble && "ks-assemble", className)}>
      <g fill="currentColor">
        <path data-piece="stem" d={m.stem} />
        <path data-piece="arm" d={m.arm} />
        <path data-piece="leg" d={m.leg} />
        <path data-piece="s-top" d={m.sTop} />
        <path data-piece="s-bottom" d={m.sBottom} />
      </g>
      <path data-piece="block" d={m.block} fill={MARK_EMBER} />
    </svg>
  );
}

/** "MALULEKE-KS" with the hyphen in the mark's orange — the wordmark beside the mark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      MALULEKE<span className="text-ember">-</span>KS
    </span>
  );
}
