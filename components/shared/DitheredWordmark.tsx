// components/shared/DitheredWordmark.tsx
// The footer's signature (F5c §7a): the wordmark is not drawn — it is the gap
// in a slowly drifting field of dithered dots in the one accent colour,
// dense at the bottom and dissolving upward; dots under the pointer stay at
// full strength while the rest dim. Adapted from 21st.dev "Dithered Footer"
// (otatechie) onto our tokens: CSS masks only, no images, reduced-motion safe.

"use client";

import { useRef, type PointerEvent } from "react";

// Stochastic dither: vertical noise thresholded to on/off in one inline SVG
// filter, used as a mask so the dots take the accent colour.
const DITHER =
  "url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27360%27%20height%3D%27240%27%3E%3Cdefs%3E%3ClinearGradient%20id%3D%27g%27%20x1%3D%270%27%20y1%3D%270%27%20x2%3D%270%27%20y2%3D%271%27%3E%3Cstop%20offset%3D%270.04%27%20stop-color%3D%27%23000%27%2F%3E%3Cstop%20offset%3D%270.96%27%20stop-color%3D%27%23fff%27%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%27f%27%20x%3D%270%27%20y%3D%270%27%20width%3D%27100%25%27%20height%3D%27100%25%27%20color-interpolation-filters%3D%27sRGB%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.45%27%20numOctaves%3D%272%27%20seed%3D%277%27%20stitchTiles%3D%27stitch%27%20result%3D%27n%27%2F%3E%3CfeColorMatrix%20in%3D%27n%27%20type%3D%27matrix%27%20values%3D%271%200%200%200%200%201%200%200%200%200%201%200%200%200%200%200%200%200%200%201%27%20result%3D%27ng%27%2F%3E%3CfeComposite%20in%3D%27SourceGraphic%27%20in2%3D%27ng%27%20operator%3D%27arithmetic%27%20k2%3D%270.5%27%20k3%3D%270.5%27%20result%3D%27s%27%2F%3E%3CfeComponentTransfer%20in%3D%27s%27%20result%3D%27t%27%3E%3CfeFuncR%20type%3D%27discrete%27%20tableValues%3D%270%201%27%2F%3E%3C%2FfeComponentTransfer%3E%3CfeColorMatrix%20in%3D%27t%27%20type%3D%27matrix%27%20values%3D%270%200%200%200%201%200%200%200%200%200.5%200%200%200%200%200%201%200%200%200%200%27%2F%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20fill%3D%27url%28%23g%29%27%20filter%3D%27url%28%23f%29%27%2F%3E%3C%2Fsvg%3E')";
const GRID = "radial-gradient(circle, #000 0.9px, transparent 1.3px)";

const STYLES = `
.dw-field { position: absolute; inset: 0; }
.dw-field.dw-lit {
  -webkit-mask-image: radial-gradient(circle 200px at var(--dw-x, 50%) var(--dw-y, 50%), #000 35%, rgb(0 0 0 / .25) 100%);
  mask-image: radial-gradient(circle 200px at var(--dw-x, 50%) var(--dw-y, 50%), #000 35%, rgb(0 0 0 / .25) 100%);
}
.dw-dots {
  position: absolute; top: 0; bottom: 0; left: 0; width: calc(100% + 360px);
  background: var(--color-ember);
  -webkit-mask-image: ${GRID}, ${DITHER}; mask-image: ${GRID}, ${DITHER};
  -webkit-mask-size: 4px 4px, 360px 240px; mask-size: 4px 4px, 360px 240px;
  -webkit-mask-repeat: repeat, repeat-x; mask-repeat: repeat, repeat-x;
  -webkit-mask-position: 0 0, left bottom; mask-position: 0 0, left bottom;
  -webkit-mask-composite: source-in; mask-composite: intersect;
}
@media (prefers-reduced-motion: no-preference) {
  .dw-dots { animation: dw-drift 48s linear infinite; }
  @supports (animation-timeline: view()) {
    .dw-band { view-timeline: --dw-band; }
    .dw-mark { animation: dw-rise linear both; animation-timeline: --dw-band; animation-range: entry 20% entry 100%; }
  }
}
@keyframes dw-drift { to { translate: -360px 0; } }
@keyframes dw-rise { from { translate: 0 30%; } }
`;

export function DitheredWordmark({ text }: { text: string }) {
  const field = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  // Only a mouse gets the spotlight; touch and pen see the plain field.
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !field.current) return;
    const el = field.current;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--dw-x", `${x}px`);
      el.style.setProperty("--dw-y", `${y}px`);
      el.classList.add("dw-lit");
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    field.current?.classList.remove("dw-lit");
  };

  return (
    <div aria-hidden="true" className="dw-band relative h-44 overflow-hidden sm:h-56 lg:h-64" onPointerMove={onMove} onPointerLeave={onLeave}>
      <style>{STYLES}</style>
      <div ref={field} className="dw-field">
        <div className="dw-dots" />
      </div>
      {/* The name is the gap in the dots: drawn in the footer's own background colour. */}
      <p className="dw-mark pointer-events-none absolute -bottom-[0.06em] left-2 select-none whitespace-nowrap font-sans text-[clamp(3rem,14vw,12.5rem)] font-bold leading-[0.8] tracking-[-0.05em] text-night-deep sm:left-4">
        {text}
      </p>
    </div>
  );
}
