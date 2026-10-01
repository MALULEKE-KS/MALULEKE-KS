// Magic UI AnimatedShinyText (shadcn registry), adapted for this platform:
// a light glare pans across the text. Colours from the tokens (mist text,
// paper glare); the animation is the `shiny-text` keyframes in globals.css,
// switched off under prefers-reduced-motion.

import type { ComponentPropsWithoutRef, CSSProperties } from "react"

import { cn } from "@/lib/utils"

export function AnimatedShinyText({ children, className, shimmerWidth = 80, ...props }: ComponentPropsWithoutRef<"span"> & { shimmerWidth?: number }) {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px` } as CSSProperties}
      className={cn(
        "text-mist/80 animate-shiny-text bg-size-[var(--shiny-width)_100%] bg-clip-text bg-position-[0_0] bg-no-repeat motion-reduce:animate-none",
        "bg-linear-to-r from-transparent via-paper/90 via-50% to-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
