// Magic UI Shimmer Button (registry "shimmer-button"), adapted for this
// platform: the page's single primary action only (PUBLIC-REDESIGN-PLAN §7a).
// - Tokens: International Orange face, ink text, a bone shimmer — no raw
//   black/white defaults.
// - Reduced motion: the travelling light is hidden; the button stays whole.
// - Disabled: no shimmer, no press movement, the usual not-allowed cursor.
// The keyframes (`shimmer-slide`, `spin-around`) are in app/globals.css.

import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react"

import { cn } from "@/lib/utils"

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "var(--color-paper)",
      shimmerSize = "0.08em",
      shimmerDuration = "3s",
      borderRadius = "9999px",
      background = "var(--color-ember)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group text-ink relative z-0 inline-flex h-12 cursor-pointer items-center justify-center gap-2 overflow-hidden [border-radius:var(--radius)] border border-white/20 px-6 font-medium whitespace-nowrap [background:var(--bg)]",
          "shadow-glow-ember transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          "focus-visible:outline-ink focus-visible:outline-2 focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-70 disabled:active:translate-y-0",
          "[&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
        {...props}
      >
        {/* The spark travelling round the edge. */}
        <span aria-hidden="true" className="absolute inset-0 -z-30 overflow-visible blur-[2px] @container-[size] group-disabled:hidden motion-reduce:hidden">
          <span className="absolute inset-0 aspect-[1] h-[100cqh] animate-[shimmer-slide_var(--speed)_ease-in-out_infinite_alternate] rounded-none [mask:none]">
            <span className="absolute -inset-full w-auto rotate-0 animate-[spin-around_calc(var(--speed)*2)_infinite_linear] [translate:0_0] [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))]" />
          </span>
        </span>
        {children}
        {/* Highlight */}
        <span
          aria-hidden="true"
          className="absolute inset-0 size-full rounded-[inherit] shadow-[inset_0_-8px_10px_rgb(255_255_255/0.18)] transition-shadow duration-300 group-hover:shadow-[inset_0_-6px_10px_rgb(255_255_255/0.3)] group-active:shadow-[inset_0_-10px_10px_rgb(255_255_255/0.3)]"
        />
        {/* The face, inset so the spark shows as an edge. */}
        <span aria-hidden="true" className="absolute inset-(--cut) -z-20 [border-radius:var(--radius)] [background:var(--bg)]" />
      </button>
    )
  },
)

ShimmerButton.displayName = "ShimmerButton"
