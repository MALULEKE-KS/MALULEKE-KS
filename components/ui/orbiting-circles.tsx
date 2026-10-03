// Magic UI Orbiting Circles (registry "orbiting-circles"), adapted for this
// platform:
// - The ring is a token hairline (ink on bone, white on graphite).
// - Each orbiter starts where it is going (its base transform is the first
//   frame), so under prefers-reduced-motion the icons sit still, spread round
//   the ring — never piled in the middle. The keyframes are `orbit-ring` in
//   app/globals.css.
// - Decorative: the ring and its orbiters are aria-hidden; the page lists the
//   same things in text.

import React from "react"

import { cn } from "@/lib/utils"

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  reverse?: boolean
  /** One revolution, in seconds. */
  duration?: number
  radius?: number
  path?: boolean
  iconSize?: number
  tone?: "light" | "dark"
}

export function OrbitingCircles({ className, children, reverse, duration = 30, radius = 160, path = true, iconSize = 40, tone = "light", ...props }: OrbitingCirclesProps) {
  const count = React.Children.count(children)
  return (
    <>
      {path && (
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="pointer-events-none absolute inset-0 size-full">
          <circle className={tone === "dark" ? "stroke-white/10" : "stroke-ink/10"} strokeWidth={1} strokeDasharray="3 5" cx="50%" cy="50%" r={radius} fill="none" />
        </svg>
      )}
      {React.Children.map(children, (child, index) => (
        <div
          aria-hidden="true"
          style={
            {
              "--duration": duration,
              "--radius": radius,
              "--angle": (360 / Math.max(count, 1)) * index,
              "--icon-size": `${iconSize}px`,
            } as React.CSSProperties
          }
          className={cn("orbit-ring absolute flex size-(--icon-size) transform-gpu items-center justify-center rounded-full", reverse && "[animation-direction:reverse]", className)}
          {...props}
        >
          {child}
        </div>
      ))}
    </>
  )
}
