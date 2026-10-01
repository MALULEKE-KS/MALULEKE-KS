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

import type { CSSProperties } from "react";
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

/** The block's shadowed side, for the 3D cube's extruded letters. */
const MARK_EMBER_DEEP = "#C2410C";

/** One slice of the heavy-cut letters — the 3D cube stacks these into a solid. */
function Slice({ block, style }: { block: string; style: CSSProperties }) {
  const m = MARK.heavy;
  return (
    <svg viewBox="4 13 58.5 38" aria-hidden="true" className="col-start-1 row-start-1 w-full" style={style}>
      <g fill="currentColor">
        <path d={m.stem} />
        <path d={m.arm} />
        <path d={m.leg} />
        <path d={m.sTop} />
        <path d={m.sBottom} />
      </g>
      <path d={m.block} fill={block} />
    </svg>
  );
}

const DEPTH = 9; // slices in the extruded letters
const SLICE_GAP = 1.25; // cqw between slices (0.45 px at the header's 36 px)
// The letters' faces are bone; their sides darken toward the middle of the solid, as a lit object's would.
const FACE = "rgb(244 242 238)";
const SIDE_LIT = [178, 183, 190];
const SIDE_DEEP = [92, 98, 107];
const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * t)).join(" ")})`;
// The gel's surface: two identical wavelengths, so sliding it left by one loops seamlessly.
const SURFACE = "M0 5C10 2 22 2 32 5S54 8 64 5S86 2 96 5S118 8 128 5";

/**
 * The K-S Cube (owner-approved 2026-10-01; design/brand/): a rounded graphite
 * glass tile holding a light liquid gel to 70%, and the K-S floating in it as a
 * solid — slices stacked in CSS 3D, shaded through their depth — bobbing on the
 * surface. It rests facing you, then makes one turn through the gel, which
 * tilts and ripples as it settles; hover or tap and it turns to greet you.
 * Sized by its own box (container units), so it works at any size. The gel has a far and a near surface drifting at
 * different speeds, so it reads as a volume; the near layer sits in front of
 * the letters, so what's under the surface is seen through the liquid. A few
 * bubbles rise. The site's logo, shown alone, no name beside it. CSS only (no
 * WebGL in the header); reduced motion holds it all still (globals.css: ks-cube).
 */
export function CubeMark({ className, spin = true }: { className?: string; spin?: boolean }) {
  const half = (DEPTH - 1) / 2;
  return (
    <span aria-hidden="true" className={cn("ks-cube relative inline-block shrink-0 overflow-hidden rounded-[28%] bg-[linear-gradient(160deg,#2c323b,#111317_72%)]", className)}>
      {/* The far surface and the body of the gel, behind the letters. The gel runs below the tile's edge so it can tilt (slosh) without showing a gap. */}
      <span className="ks-slosh absolute inset-0">
        <svg viewBox="0 0 128 52" preserveAspectRatio="none" className="ks-gel-far absolute -bottom-[12%] left-0 h-[86%] w-[200%]">
          <path d={`${SURFACE}V52H0Z`} fill="rgb(170 190 214 / 0.16)" />
          <path d={SURFACE} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      {/* Light gathered on the floor of the cube, through the gel. */}
      <span className="absolute inset-x-[14%] bottom-[4%] h-[26%] rounded-full bg-[radial-gradient(closest-side,rgb(214_228_244/0.22),transparent)]" />

      {/* The letters: a solid, floating — bobbing on the surface and turning. */}
      <span className="ks-bob ks-stage absolute inset-0 grid place-items-center">
        <span className={cn("ks-rotor relative grid w-[78%] place-items-center", spin && "ks-rotor-spin")}>
          {Array.from({ length: DEPTH }, (_, i) => {
            const t = Math.abs(i - half) / half; // 1 at either face, 0 in the middle
            const face = t === 1;
            return (
              <Slice
                key={i}
                block={face ? MARK_EMBER : MARK_EMBER_DEEP}
                style={{ color: face ? FACE : mix(SIDE_DEEP, SIDE_LIT, t), transform: `translateZ(${(i - half) * SLICE_GAP}cqw)` }}
              />
            );
          })}
        </span>
      </span>

      {/* The near surface, in front of the letters: what's under it is seen through the liquid, and deeper is darker. */}
      <span className="ks-slosh absolute inset-0">
        <svg viewBox="0 0 128 52" preserveAspectRatio="none" className="ks-gel absolute -bottom-[12%] left-0 h-[82%] w-[200%]">
          <path d={`${SURFACE}V52H0Z`} fill="rgb(206 222 240 / 0.2)" />
          <path d={SURFACE} fill="none" stroke="rgb(255 255 255 / 0.62)" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      {/* The ripple the turn leaves on the surface. */}
      <span className="ks-ripple absolute top-[31%] left-1/2 h-[9%] w-[64%] rounded-[50%] border border-white/60" />
      <span className="absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_bottom,transparent,rgb(8_12_18/0.32))]" />
      {/* Bubbles, rising and fading (only with motion). */}
      <span className="ks-bubble absolute bottom-[10%] left-[26%] size-[5.5cqw] rounded-full bg-white/70" />
      <span className="ks-bubble absolute bottom-[6%] left-[62%] size-[4.2cqw] rounded-full bg-white/60 [animation-delay:1.6s]" />
      <span className="ks-bubble absolute bottom-[14%] left-[78%] size-[4.2cqw] rounded-full bg-white/50 [animation-delay:3.1s]" />

      {/* The glass: a sheen across the top, a reflection down the left edge, and a lit rim. */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(155deg,rgb(255_255_255/0.18),transparent_40%)]" />
      <span className="pointer-events-none absolute top-[12%] bottom-[12%] left-[7%] w-[5%] rounded-full bg-[linear-gradient(to_bottom,rgb(255_255_255/0.22),rgb(255_255_255/0.02))]" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14),inset_0_1px_0_rgb(255_255_255/0.26),inset_0_-17cqw_28cqw_-17cqw_rgb(0_0_0/0.5)]" />
    </span>
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
