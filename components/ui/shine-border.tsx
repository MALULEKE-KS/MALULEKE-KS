"use client"

// Magic UI Shine Border (registry "shine-border"), adapted for this platform:
// - Colours default to the tokens: International Orange → gold.
// - The keyframes live in app/globals.css (`shine`) and stop under
//   prefers-reduced-motion (motion-safe), leaving a still hairline.

import * as React from "react"

import { cn } from "@/lib/utils"

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the border in pixels. */
  borderWidth?: number
  /** One full sweep, in seconds. */
  duration?: number
  /** A colour or a list of colours for the sweep. */
  shineColor?: string | string[]
}

export function ShineBorder({ borderWidth = 1, duration = 14, shineColor = ["var(--color-ember)", "#ffb547"], className, style, ...props }: ShineBorderProps) {
  return (
    <div
      aria-hidden="true"
      style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent,transparent, ${Array.isArray(shineColor) ? shineColor.join(",") : shineColor},transparent,transparent)`,
          backgroundSize: "300% 300%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
          ...style,
        } as React.CSSProperties
      }
      className={cn("pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] motion-safe:animate-[shine_var(--duration)_infinite_linear]", className)}
      {...props}
    />
  )
}
