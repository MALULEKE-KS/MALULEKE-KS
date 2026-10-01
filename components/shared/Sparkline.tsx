// components/shared/Sparkline.tsx
// Weekly commits as a small line with a soft fill (PublicSystemActivity). The
// numbers are data; the drawing is decorative — the text beside it says the
// same thing in words for everyone.

import { useId } from "react";
import { cn } from "@/lib/utils";

export function Sparkline({ values, className, stroke = "var(--color-ember)" }: { values: number[]; className?: string; stroke?: string }) {
  const id = useId();
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const max = Math.max(1, ...values);
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [i * step, h - 2 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className={cn("h-8 w-full overflow-visible", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={stroke} />
    </svg>
  );
}
