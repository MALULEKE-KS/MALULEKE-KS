// components/shared/Spotlight.tsx
// Cursor-following light inside a card (DESIGN-SYSTEM.md v3 §5). Writes the
// pointer position to --mx/--my; the light itself is the `.spotlight::before`
// radial gradient in globals.css, shown on hover-capable devices only. No
// state, no re-renders — just two CSS variables on pointermove.

"use client";

import { cn } from "@/lib/utils";

interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Colour of the light, e.g. "rgb(255 91 31 / 0.12)". */
  color?: string;
}

export function Spotlight({ color, className, style, onPointerMove, ...props }: SpotlightProps) {
  return (
    <div
      className={cn("spotlight", className)}
      style={{ ...style, ...(color ? { ["--spot" as string]: color } : {}) }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
        onPointerMove?.(e);
      }}
      {...props}
    />
  );
}
